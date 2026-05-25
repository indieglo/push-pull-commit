import { db } from './database';
import type { Exercise, WorkoutTemplate } from '../types';

// The seed library is additive — exercises previously seeded stay in the local DB
// even when retired from the active templates, so historical sessions remain
// valid and old movements can be reintroduced in future training blocks.
const SEED_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Push
  { name: 'Dumbbell Bench Press', category: 'push', isBodyweight: false, muscleGroup: 'chest', syncStatus: 'pending' },
  { name: 'Incline Dumbbell Press', category: 'push', isBodyweight: false, muscleGroup: 'chest', syncStatus: 'pending' },
  { name: 'Push-Ups', category: 'push', isBodyweight: true, muscleGroup: 'chest', syncStatus: 'pending' },

  // Pull
  { name: 'Lat Pulldown', category: 'pull', isBodyweight: false, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Chest-Supported Dumbbell Row', category: 'pull', isBodyweight: false, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Seated Cable Row', category: 'pull', isBodyweight: false, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Single Arm Dumbbell Row', category: 'pull', isBodyweight: false, isUnilateral: true, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Face Pulls', category: 'pull', isBodyweight: false, muscleGroup: 'shoulders', syncStatus: 'pending' },
  { name: 'Hammer Curl', category: 'pull', isBodyweight: false, muscleGroup: 'arms', syncStatus: 'pending' },
  { name: 'Dumbbell Bicep Curls', category: 'pull', isBodyweight: false, isUnilateral: true, muscleGroup: 'arms', syncStatus: 'pending' },

  // Legs
  { name: 'Dumbbell Split Squat', category: 'legs', isBodyweight: false, isUnilateral: true, muscleGroup: 'quads', syncStatus: 'pending' },
  { name: 'Dumbbell Hip Thrust', category: 'legs', isBodyweight: false, muscleGroup: 'glutes', syncStatus: 'pending' },
  { name: 'Cable Pull-Through', category: 'legs', isBodyweight: false, muscleGroup: 'hamstrings', syncStatus: 'pending' },
  { name: 'Bodyweight Squats', category: 'legs', isBodyweight: true, muscleGroup: 'quads', syncStatus: 'pending' },
  { name: 'Goblet Squats', category: 'legs', isBodyweight: false, muscleGroup: 'quads', syncStatus: 'pending' },
  { name: 'Dumbbell Romanian Deadlifts', category: 'legs', isBodyweight: false, muscleGroup: 'hamstrings', syncStatus: 'pending' },
  { name: 'Glute Bridges', category: 'legs', isBodyweight: false, muscleGroup: 'glutes', syncStatus: 'pending' },

  // Core
  { name: 'Pallof Press', category: 'core', isBodyweight: false, isUnilateral: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Dead Bug', category: 'core', isBodyweight: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Plank', category: 'core', isBodyweight: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Side Plank', category: 'core', isBodyweight: true, isUnilateral: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Bird-Dog', category: 'core', isBodyweight: true, isUnilateral: true, muscleGroup: 'core', syncStatus: 'pending' },

  // Mobility (timed holds + dynamic flows for the post-strength routine)
  { name: 'Cat-Cow', category: 'mobility', isBodyweight: true, muscleGroup: 'spine', syncStatus: 'pending' },
  { name: 'Supine Hamstring Stretch', category: 'mobility', isBodyweight: true, isUnilateral: true, muscleGroup: 'hamstrings', syncStatus: 'pending' },
  { name: 'Half-Kneeling Hip Flexor Stretch', category: 'mobility', isBodyweight: true, isUnilateral: true, muscleGroup: 'hip flexors', syncStatus: 'pending' },
  { name: 'Figure-4 Stretch', category: 'mobility', isBodyweight: true, isUnilateral: true, muscleGroup: 'glutes', syncStatus: 'pending' },
  { name: 'Open-Book Thoracic Rotation', category: 'mobility', isBodyweight: true, isUnilateral: true, muscleGroup: 'upper back', syncStatus: 'pending' },
  { name: 'Seated Forward Fold', category: 'mobility', isBodyweight: true, muscleGroup: 'hamstrings', syncStatus: 'pending' },
  { name: '90/90 Hip Switches', category: 'mobility', isBodyweight: true, isUnilateral: true, muscleGroup: 'hips', syncStatus: 'pending' },

  // Cardio
  { name: 'Warm-up Cardio', category: 'cardio', isBodyweight: true, isCardio: true, muscleGroup: 'full body', distanceUnit: 'km', syncStatus: 'pending' },
  { name: 'Cool-down Cardio', category: 'cardio', isBodyweight: true, isCardio: true, muscleGroup: 'full body', distanceUnit: 'km', syncStatus: 'pending' },
  { name: 'Freestyle Swim', category: 'cardio', isBodyweight: true, isCardio: true, muscleGroup: 'full body', distanceUnit: 'laps', syncStatus: 'pending' },
  { name: 'Jogging', category: 'cardio', isBodyweight: true, isCardio: true, muscleGroup: 'full body', distanceUnit: 'km', syncStatus: 'pending' },
];

// Mobility flow appended to each strength session and used standalone.
const MOBILITY_FLOW = [
  'Cat-Cow',
  'Open-Book Thoracic Rotation',
  '90/90 Hip Switches',
  'Half-Kneeling Hip Flexor Stretch',
  'Supine Hamstring Stretch',
  'Figure-4 Stretch',
  'Seated Forward Fold',
];

// Active block templates. Past block exercises remain in the library and can
// be added ad-hoc from the picker; only the *templates* change between blocks.
export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    name: 'Strength A',
    exerciseNames: [
      'Warm-up Cardio',
      'Dumbbell Bench Press',
      'Dumbbell Split Squat',
      'Incline Dumbbell Press',
      'Dumbbell Hip Thrust',
      'Pallof Press',
      'Cool-down Cardio',
      ...MOBILITY_FLOW,
    ],
  },
  {
    name: 'Strength B',
    exerciseNames: [
      'Warm-up Cardio',
      'Lat Pulldown',
      'Cable Pull-Through',
      'Chest-Supported Dumbbell Row',
      'Hammer Curl',
      'Face Pulls',
      'Dead Bug',
      'Cool-down Cardio',
      ...MOBILITY_FLOW,
    ],
  },
  {
    name: 'Mobility',
    exerciseNames: MOBILITY_FLOW,
  },
  {
    name: 'Swimming',
    exerciseNames: ['Freestyle Swim'],
  },
];

// Additive seed: drop in any exercises from SEED_EXERCISES not already present
// locally (matched by lowercase name). Runs on every app load so new movements
// introduced in a fresh training block show up without wiping historical data.
export async function seedDatabase() {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
  const toAdd = SEED_EXERCISES.filter((e) => !existingNames.has(e.name.toLowerCase()));
  if (toAdd.length > 0) {
    await db.exercises.bulkAdd(toAdd);
  }
}

// Purge incomplete workouts older than this many hours. Protects real in-progress
// workouts if you briefly lock the phone, while cleaning up demos and abandoned sessions.
const STALE_HOURS = 6;

export async function purgeStaleIncompleteWorkouts() {
  const cutoff = Date.now() - STALE_HOURS * 60 * 60 * 1000;
  const activeId = localStorage.getItem('activeWorkoutId');
  const activeIdNum = activeId ? Number(activeId) : null;

  const incomplete = await db.workouts.filter(w => !w.completedAt).toArray();
  let purged = 0;
  for (const w of incomplete) {
    if (activeIdNum !== null && w.id === activeIdNum) continue;
    const started = w.startedAt ? new Date(w.startedAt).getTime() : 0;
    if (started && started > cutoff) continue;
    const weRows = await db.workoutExercises.where('workoutId').equals(w.id!).toArray();
    for (const we of weRows) {
      await db.exerciseSets.where('workoutExerciseId').equals(we.id!).delete();
    }
    await db.workoutExercises.where('workoutId').equals(w.id!).delete();
    await db.workouts.delete(w.id!);
    purged++;
  }
  return purged;
}
