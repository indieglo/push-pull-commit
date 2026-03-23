import { db } from './database';

// CSV data embedded from the user's workout logs
const PHASE_1_CSV = `Week,Day,Date,Workout,Exercise,Weight,Sets,Reps or Time,Notes
1,Mon,Aug 25,Strength A,Dumbbell Bench Press,15kg,3,,felt a bit easy
,,,,Seated Cable Row,25kg,3,,challenging
,,,,Push-Ups,BW,3,,"challenging,but could have done a couple more with bad form."
,,,,Plank,BW,1,,hard to keep form
,,,,Bird-Dog,BW,3,,challenging
,Wed,Aug 27,Strength B,Bodyweight Squats,BW,3,15/15/15,not too hard
,,,,Lat Pulldown,35kg,3,"12,/15/15",not too hard
,,,,Glute Bridges,BW,3,15/15/15,easy
,,,,Dumbbell Bicep Curls,7.5kg each,3,12/12/12 both,challenging
,,,,Dead Bug,BW,3,20/20/20,challenging
,Fri,Aug 29,Swimming,Freestyle Swim,,20 laps,20 minutes,Could have done a few more minutes but was running late
2,Mon,Sep 1,Strength A,Dumbbell Bench Press,17.5kg,3,8/8/8,challenging. last rep was hard.
,,,,Seated Cable Row,25kg,3,12/10/10,had to adjust the machine a bit. kind of challenging.
,,,,Push-Ups,BW,3,13/11/12,hard
,,,,Plank,BW,1,45,quite hard
,,,,Bird-Dog,BW,3,10/10/10,
,Wed,Sep 3,Strength B,Bodyweight Squats,BW,3,12/12/12,challenging butngood
,,,,Lat Pulldown,40kg,3,10/11/10,very hard
,,,,Glute Bridges,15kg,3,15/15/15,challenging
,,,,Dumbbell Bicep Curls,7.5kg each,3,12/12/12,challenging
,,,,Dead Bug,BW,3,10/10/10,not bad
,Fri,Sep 5,Swimming,Freestyle Swim,,26 laps,26 minutes,Was tired from a busy day gardening the day before
3,Mon,Sep 8,Strength A,Dumbbell Bench Press,20kg,3,10/10/10,hard
,,,,Seated Cable Row,30kg,3,10/10/10,challenging
,,,,Push-Ups,BW,3,15/12/11,hard
,,,,Plank,BW,1,55 seconds,hard
,,,,Bird-Dog,BW,3,8/15/15,challenging
,Wed,Sep 10,Strength B,Bodyweight Squats,10kg,3,15/12/15,not bad
,,,,Lat Pulldown,44kg,3,10/10/10,hard
,,,,Glute Bridges,15kg,3,15/15/15,not bad
,,,,Dumbbell Bicep Curls,7.5kg each,3,12/12/12,not bad
,,,,Dead Bug,BW,3,10/10/10 per side,
,Fri,Sep 12,Swimming,Freestyle Swim,,35 laps,30 minutes,hard
4,Mon,Sep 15,Strength A,Dumbbell Bench Press,20kg,3,8/8/8,hard
,,,,Seated Cable Row,35kg,3,10/10/10,hard
,,,,Push-Ups,BW,3,15/14/8,hard
,,,,Plank,BW,1,1:00,hard
,,,,Bird-Dog,BW,3,10/15/15,not bad
,Wed,Sep 17,Strength B,Bodyweight Squats,BW,3,15/15/15,challenging
,,,,Lat Pulldown,44kg,3,15/12/9,hard
,,,,Glute Bridges,BW,3,15/15/15,challenging
,,,,Dumbbell Bicep Curls,8kg,3,15/15/15,hard
,,,,Dead Bug,BW,3,10/10/10,
,Fri,Sep 19,Swimming,Freestyle Swim,,40 laps,30 minutes,totally gassed. nearly vomited and fainted on walk home.`;

const PHASE_2_CSV = `Week,Day,Date,Workout,Exercise,Weight,Sets,Reps or Time,Notes
1,Mon,Aug 25,Strength A,Dumbbell Bench Press,22.5kg,3,6/8/6,very hard
,,,,Goblet Squats,10kg,3,12/12/12,challenging
,,,,Push-Ups,BW,3,14/15/10,challenging
,,,,Face Pulls,23kg,3,12/12/12,hard
,,,,Side Plank,BW,3,30 secs each side,
,Wed,Aug 27,Strength B,Lat Pulldown,44kg,3,10/10/10,challenging
,,,,Dumbbell Romanian Deadlifts,10kg each,3,12/12/12,not too bad
,,,,Single Arm Dumbbell Row,12.5kg,3,12/12/12,not too bad
,,,,Dumbbell Bicep Curls,10kg each,3,10/10/10,not bad
,,,,Bird-Dog,BW,3,30/24/24,not bad
,Fri,Aug 29,Swimming,Freestyle Swim,,,holiday fun run,
2,Mon,Sep 1,Strength A,Dumbbell Bench Press,22.5kg,3,10/8/6,hard
,,,,Goblet Squats,12.5kg,3,14/12/12,challenging
,,,,Push-Ups,BW,3,15/15/10,hard
,,,,Face Pulls,23kg,3,15/12/12,hard
,,,,Side Plank,BW,3,:30 each side,challenging
,Wed,Sep 3,Strength B,Lat Pulldown,44kg,3,12/10/8,hard
,,,,Dumbbell Romanian Deadlifts,10kg,3,15/15/15,easy
,,,,Single Arm Dumbbell Row,12.5kg,3,12 each side,not bad
,,,,Dumbbell Bicep Curls,10kg,3,12/12/12,challenging
,,,,Bird-Dog,BW,3,12/12/12,not bad
3,Wed,Oct 15,Strength A,Dumbbell Bench Press,22.5kg,3,8/8/8,hard
,,,,Goblet Squats,10kg,3,12/12/12,challenging
,,,,Push-Ups,BW,3,15/15/8,hard
,,,,Face Pulls,25kg,3,13/15/15,hard
,,,,Side Plank,BW,3,30 sec,challenging
,Wed,Sep 10,Strength B,Lat Pulldown,44kg,3,12/12/12,challenging
,,,,Dumbbell Romanian Deadlifts,12.5kg,3,12/15/8,challenging
,,,,Single Arm Dumbbell Row,15kg,3,12/12/12,challenging
,,,,Dumbbell Bicep Curls,12.5kg,3,8/8/8,hard
,,,,Bird-Dog,BW,3,10/10/10,not bad
4,Mon,Nov 10,Strength A,Dumbbell Bench Press,22.5kg,3,10/8/6,hard
,,,,Goblet Squats,10kg,3,15/15/15,not bad
,,,,Push-Ups,BW,3,15/15/15,challenging
,,,,Face Pulls,25kg,3,12/15/15,not bad
,,,,Side Plank,BW,3,30 sec,challenging
,Wed,Nov 12,Strength B,Lat Pulldown,44kg,3,12/12/10,challenging
,,,,Dumbbell Romanian Deadlifts,12.5kg,3,15/15/15,challenging
,,,,Single Arm Dumbbell Row,17.5kg,3,10/10/10,hard
,,,,Dumbbell Bicep Curls,12.5kg,3,9/8/8,hard
,,,,Bird-Dog,BW,3,12/12/12,not bad`;

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

// Normalize exercise names to match our seed data
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
  };
  return map[name.toLowerCase()] || name;
}

export async function importCSVData(): Promise<{ workouts: number; sets: number }> {
  // Parse both phases
  const phase1Workouts = parseCSV(PHASE_1_CSV, 2025);
  const phase2Workouts = parseCSV(PHASE_2_CSV, 2025);
  const allWorkouts = [...phase1Workouts, ...phase2Workouts];

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
