import { db } from './database';

/**
 * CSV Import for workout history
 *
 * Expected CSV format:
 * Week,Day,Date,Workout,Exercise,Weight,Sets,Reps or Time,Notes
 *
 * - Weight: "BW" for bodyweight, "20kg", "7.5kg each", etc.
 * - Reps or Time: "12/12/12" for rep splits, "45 seconds", "1:00", "20 laps", etc.
 * - Empty cells are filled down from the row above (for Date, Workout, Exercise)
 */

interface ParsedSet {
  exerciseName: string;
  weight: number | null;
  isBodyweight: boolean;
  reps: number | null;
  durationSeconds: number | null;
  setNumber: number;
}

interface ParsedWorkout {
  date: string;
  name: string;
  notes: string;
  sets: ParsedSet[];
}

function parseWeight(raw: string): { weight: number | null; isBodyweight: boolean } {
  const s = raw.trim().toLowerCase();
  if (!s || s === 'bw') return { weight: null, isBodyweight: true };

  // Handle "7.5kg each", "10kg each", "12.5kgx2", "12.5kg x 2"
  const match = s.match(/([\d.]+)\s*kg/);
  if (match) return { weight: parseFloat(match[1]), isBodyweight: false };

  const numMatch = s.match(/([\d.]+)/);
  if (numMatch) return { weight: parseFloat(numMatch[1]), isBodyweight: false };

  return { weight: null, isBodyweight: true };
}

function parseReps(raw: string): { reps: number[]; durationSeconds: number | null } {
  const s = raw.trim();
  if (!s) return { reps: [], durationSeconds: null };

  // Check for duration patterns: "45", "55 seconds", "1:00", ":30", "30 secs each side"
  if (s.includes('second') || s.includes('sec') || s.includes(':') || s.match(/^\d+\s*(s|sec)/)) {
    const colonMatch = s.match(/(\d+)?:(\d+)/);
    if (colonMatch) {
      const min = parseInt(colonMatch[1] || '0');
      const sec = parseInt(colonMatch[2]);
      return { reps: [], durationSeconds: min * 60 + sec };
    }
    const numMatch = s.match(/(\d+)/);
    if (numMatch) return { reps: [], durationSeconds: parseInt(numMatch[1]) };
  }

  // Check for laps (swimming)
  if (s.includes('lap')) {
    const numMatch = s.match(/(\d+)/);
    if (numMatch) return { reps: [parseInt(numMatch[1])], durationSeconds: null };
  }

  // Check for minutes (swimming duration)
  if (s.includes('minute')) {
    const numMatch = s.match(/(\d+)/);
    if (numMatch) return { reps: [], durationSeconds: parseInt(numMatch[1]) * 60 };
  }

  // Split rep strings like "12/12/12" or "15/12/15"
  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  const reps = parts
    .map(p => {
      const n = parseInt(p);
      if (isNaN(n)) return null;
      // Fix spreadsheet auto-format: "8/8/2008" → the 2008 is a year, not reps
      // Any rep count over 100 is almost certainly a year — extract last digit(s)
      if (n > 100) return n % 100 || n % 10 || null;
      return n;
    })
    .filter((n): n is number => n !== null);

  // Single number might be duration for timed exercises
  if (reps.length === 1 && !s.includes('/')) {
    return { reps, durationSeconds: null };
  }

  return { reps, durationSeconds: null };
}

function parseDate(dateStr: string, year: number): string {
  const s = dateStr.trim();
  // Handle formats like "Aug 25", "Sep 1", "Oct 15", "Nov 10"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  for (const [name, num] of Object.entries(monthMap)) {
    if (s.toLowerCase().includes(name)) {
      const dayMatch = s.match(/(\d+)/);
      if (dayMatch) {
        const day = dayMatch[1].padStart(2, '0');
        return `${year}-${num}-${day}`;
      }
    }
  }

  // Try mm/dd/yyyy or similar
  const slashMatch = s.match(/(\d+)\/(\d+)\/+(\d+)/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return `${year}-01-01`; // fallback
}

function parseCSV(csv: string, year: number): ParsedWorkout[] {
  const lines = csv.trim().split('\n');
  const workouts: ParsedWorkout[] = [];
  let currentDate = '';
  let currentWorkoutName = '';
  let currentExercise = '';
  let currentSets: ParsedSet[] = [];
  let currentNotes = '';

  for (let i = 1; i < lines.length; i++) { // skip header
    const cols = lines[i].split(',').map(c => c.trim());
    // Fill-down logic
    if (cols[2]) currentDate = parseDate(cols[2], year);
    if (cols[3]) {
      // New workout type - save previous if exists
      if (currentWorkoutName && currentSets.length > 0) {
        workouts.push({
          date: currentDate,
          name: currentWorkoutName,
          notes: currentNotes,
          sets: [...currentSets],
        });
        currentSets = [];
        currentNotes = '';
      }
      currentWorkoutName = cols[3];
    }

    if (cols[4]) {
      currentExercise = cols[4];
    }
    if (!currentExercise) continue;

    const weightStr = cols[5] || '';
    const { weight, isBodyweight } = parseWeight(weightStr);
    const repsStr = cols[7] || '';
    const { reps, durationSeconds } = parseReps(repsStr);
    const notes = cols[8] || '';

    if (notes) currentNotes = currentNotes ? `${currentNotes}; ${notes}` : notes;

    // Determine if this is a timed exercise (plank, side plank, swimming)
    const isTimedExercise = currentExercise.toLowerCase().includes('plank') ||
      currentExercise.toLowerCase().includes('swim');

    if (reps.length > 0) {
      reps.forEach((rep, idx) => {
        currentSets.push({
          exerciseName: currentExercise,
          weight,
          isBodyweight,
          reps: isTimedExercise ? null : rep,
          durationSeconds: isTimedExercise ? rep : null,
          setNumber: idx + 1,
        });
      });
    } else if (durationSeconds !== null) {
      const numSets = parseInt(cols[6]) || 1;
      for (let s = 0; s < numSets; s++) {
        currentSets.push({
          exerciseName: currentExercise,
          weight,
          isBodyweight,
          reps: null,
          durationSeconds,
          setNumber: s + 1,
        });
      }
    } else {
      // No rep data but has exercise - create placeholder sets
      const numSets = parseInt(cols[6]) || 3;
      for (let s = 0; s < numSets; s++) {
        currentSets.push({
          exerciseName: currentExercise,
          weight,
          isBodyweight,
          reps: null,
          durationSeconds: null,
          setNumber: s + 1,
        });
      }
    }
  }

  // Don't forget the last workout
  if (currentWorkoutName && currentSets.length > 0) {
    workouts.push({
      date: currentDate,
      name: currentWorkoutName,
      notes: currentNotes,
      sets: [...currentSets],
    });
  }

  return workouts;
}

// Normalize exercise names to match common naming
function normalizeExerciseName(name: string): string {
  const map: Record<string, string> = {
    'dumbbell bench press': 'Dumbbell Bench Press',
    'seated cable row': 'Seated Cable Row',
    'push-ups': 'Push-Ups',
    'push ups': 'Push-Ups',
    'plank': 'Plank',
    'bird-dog': 'Bird-Dog',
    'bird dog': 'Bird-Dog',
    'bodyweight squats': 'Bodyweight Squats',
    'lat pulldown': 'Lat Pulldown',
    'glute bridges': 'Glute Bridges',
    'dumbbell bicep curls': 'Dumbbell Bicep Curls',
    'dead bug': 'Dead Bug',
    'freestyle swim': 'Freestyle Swim',
    'goblet squats': 'Goblet Squats',
    'face pulls': 'Face Pulls',
    'side plank': 'Side Plank',
    'dumbbell romanian deadlifts': 'Dumbbell Romanian Deadlifts',
    'single arm dumbbell row': 'Single Arm Dumbbell Row',
    'jogging': 'Jogging',
  };
  return map[name.toLowerCase()] || name;
}

/**
 * Import workout data from a CSV string.
 * @param csvText - Raw CSV content
 * @param year - The year these workouts took place (used for date parsing)
 */
export async function importCSVData(csvText: string, year: number = 2025): Promise<{ workouts: number; sets: number }> {
  const allWorkouts = parseCSV(csvText, year);

  let totalWorkouts = 0;
  let totalSets = 0;

  for (const pw of allWorkouts) {
    // Create the workout
    const workoutId = await db.workouts.add({
      date: pw.date,
      name: pw.name,
      notes: pw.notes || undefined,
      startedAt: `${pw.date}T09:00:00.000Z`,
      completedAt: `${pw.date}T10:00:00.000Z`,
      syncStatus: 'pending',
    });

    // Group sets by exercise
    const exerciseGroups = new Map<string, ParsedSet[]>();
    for (const set of pw.sets) {
      const name = normalizeExerciseName(set.exerciseName);
      if (!exerciseGroups.has(name)) exerciseGroups.set(name, []);
      exerciseGroups.get(name)!.push({ ...set, exerciseName: name });
    }

    let order = 0;
    for (const [exerciseName, sets] of exerciseGroups) {
      // Find the exercise in our DB
      let exercise = await db.exercises.where('name').equals(exerciseName).first();
      if (!exercise) {
        // Try to add it
        const id = await db.exercises.add({
          name: exerciseName,
          category: 'push', // default
          isBodyweight: sets[0].isBodyweight,
          syncStatus: 'pending',
        });
        exercise = await db.exercises.get(id);
      }
      if (!exercise) continue;

      const weId = await db.workoutExercises.add({
        workoutId: workoutId as number,
        exerciseId: exercise.id!,
        order: order++,
        syncStatus: 'pending',
      });

      for (const set of sets) {
        await db.exerciseSets.add({
          workoutExerciseId: weId as number,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.durationSeconds,
          isBodyweight: set.isBodyweight,
          completed: true,
          completedAt: `${pw.date}T09:30:00.000Z`,
          syncStatus: 'pending',
        });
        totalSets++;
      }
    }
    totalWorkouts++;
  }

  return { workouts: totalWorkouts, sets: totalSets };
}
