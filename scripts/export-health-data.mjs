// One-off export script: dumps every relevant Supabase table to CSV under
// exports/<yyyy-mm-dd>/. Requires SUPABASE_SERVICE_ROLE_KEY in .env to bypass
// row-level security and read every row regardless of which device created it.
//
// Usage:
//   1. Copy SUPABASE_SERVICE_ROLE_KEY from your Vercel env vars into .env
//   2. npm run export:health
//   3. Delete the key from .env when finished
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// Load .env manually so this script doesn't pull in extra deps
try {
  const env = readFileSync('.env', 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // .env optional
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing env: need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Service role key is at Supabase Dashboard → Settings → API → service_role,');
  console.error('or in Vercel env vars for this project.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Tables to dump. Order matters only for the flattened view at the end.
const TABLES = [
  'exercises',
  'workouts',
  'workout_exercises',
  'exercise_sets',
  'blood_pressure',
  'weight_logs',
  'alcohol_logs',
  'fitness_daily_logs',
];

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  let s;
  if (typeof v === 'string') s = v;
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [keys.join(',')];
  for (const r of rows) {
    lines.push(keys.map((k) => csvEscape(r[k])).join(','));
  }
  return lines.join('\n') + '\n';
}

async function fetchAll(table) {
  // Paginate in case any table has >1000 rows
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

const stamp = new Date().toISOString().slice(0, 10);
const outDir = join('exports', stamp);
mkdirSync(outDir, { recursive: true });
console.log(`Writing CSVs to ${outDir}/`);

const cache = {};
for (const table of TABLES) {
  try {
    const rows = await fetchAll(table);
    cache[table] = rows;
    const csv = rowsToCsv(rows);
    const path = join(outDir, `${table}.csv`);
    writeFileSync(path, csv);
    console.log(`  ${table.padEnd(22)} ${String(rows.length).padStart(5)} rows`);
  } catch (err) {
    console.warn(`  ${table.padEnd(22)} skipped: ${err.message}`);
  }
}

// Build a flattened workouts × exercises × sets CSV for easy external analysis.
console.log('\nBuilding workouts_flat.csv …');
const workouts = (cache.workouts ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
const wes = cache.workout_exercises ?? [];
const sets = cache.exercise_sets ?? [];
const exercises = cache.exercises ?? [];

const exById = new Map(exercises.map((e) => [e.id, e]));
const wesByWorkout = new Map();
for (const we of wes) {
  const list = wesByWorkout.get(we.workout_id) ?? [];
  list.push(we);
  wesByWorkout.set(we.workout_id, list);
}
const setsByWe = new Map();
for (const s of sets) {
  const list = setsByWe.get(s.workout_exercise_id) ?? [];
  list.push(s);
  setsByWe.set(s.workout_exercise_id, list);
}

const flat = [];
for (const w of workouts) {
  const wesForWorkout = (wesByWorkout.get(w.id) ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (wesForWorkout.length === 0) {
    flat.push({
      date: w.date, workout_name: w.name, exercise: '', category: '',
      set_number: '', weight_kg: '', reps: '', duration_seconds: '',
      duration_minutes: '', distance: '', effort_rating: '',
      workout_notes: w.notes ?? '', exercise_notes: '',
    });
    continue;
  }
  for (const we of wesForWorkout) {
    const ex = exById.get(we.exercise_id);
    const wesets = (setsByWe.get(we.id) ?? []).slice().sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
    if (ex?.is_cardio || wesets.length === 0) {
      flat.push({
        date: w.date,
        workout_name: w.name,
        exercise: ex?.name ?? '(unknown)',
        category: ex?.category ?? '',
        set_number: '',
        weight_kg: '',
        reps: '',
        duration_seconds: '',
        duration_minutes: we.duration_minutes ?? '',
        distance: we.distance ?? '',
        effort_rating: we.effort_rating ?? '',
        workout_notes: w.notes ?? '',
        exercise_notes: we.cardio_notes ?? '',
      });
    } else {
      for (const s of wesets) {
        flat.push({
          date: w.date,
          workout_name: w.name,
          exercise: ex?.name ?? '(unknown)',
          category: ex?.category ?? '',
          set_number: s.set_number ?? '',
          weight_kg: s.weight ?? '',
          reps: s.reps ?? '',
          duration_seconds: s.duration_seconds ?? '',
          duration_minutes: '',
          distance: '',
          effort_rating: we.effort_rating ?? '',
          workout_notes: w.notes ?? '',
          exercise_notes: '',
        });
      }
    }
  }
}
writeFileSync(join(outDir, 'workouts_flat.csv'), rowsToCsv(flat));
console.log(`  workouts_flat          ${String(flat.length).padStart(5)} rows`);

console.log(`\nDone. ${outDir}/`);
