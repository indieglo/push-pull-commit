import { db } from './database';
import type { Exercise, WorkoutTemplate } from '../types';

const SEED_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Push
  { name: 'Dumbbell Bench Press', category: 'push', isBodyweight: false, muscleGroup: 'chest', syncStatus: 'pending' },
  { name: 'Push-Ups', category: 'push', isBodyweight: true, muscleGroup: 'chest', syncStatus: 'pending' },

  // Pull
  { name: 'Seated Cable Row', category: 'pull', isBodyweight: false, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Lat Pulldown', category: 'pull', isBodyweight: false, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Single Arm Dumbbell Row', category: 'pull', isBodyweight: false, muscleGroup: 'back', syncStatus: 'pending' },
  { name: 'Face Pulls', category: 'pull', isBodyweight: false, muscleGroup: 'shoulders', syncStatus: 'pending' },
  { name: 'Dumbbell Bicep Curls', category: 'pull', isBodyweight: false, muscleGroup: 'arms', syncStatus: 'pending' },

  // Legs
  { name: 'Bodyweight Squats', category: 'legs', isBodyweight: true, muscleGroup: 'quads', syncStatus: 'pending' },
  { name: 'Goblet Squats', category: 'legs', isBodyweight: false, muscleGroup: 'quads', syncStatus: 'pending' },
  { name: 'Dumbbell Romanian Deadlifts', category: 'legs', isBodyweight: false, muscleGroup: 'hamstrings', syncStatus: 'pending' },
  { name: 'Glute Bridges', category: 'legs', isBodyweight: false, muscleGroup: 'glutes', syncStatus: 'pending' },

  // Core
  { name: 'Plank', category: 'core', isBodyweight: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Side Plank', category: 'core', isBodyweight: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Bird-Dog', category: 'core', isBodyweight: true, muscleGroup: 'core', syncStatus: 'pending' },
  { name: 'Dead Bug', category: 'core', isBodyweight: true, muscleGroup: 'core', syncStatus: 'pending' },

  // Cardio
  { name: 'Freestyle Swim', category: 'cardio', isBodyweight: true, isCardio: true, muscleGroup: 'full body', distanceUnit: 'laps', syncStatus: 'pending' },
  { name: 'Jogging', category: 'cardio', isBodyweight: true, isCardio: true, muscleGroup: 'full body', distanceUnit: 'km', syncStatus: 'pending' },
];

// Phase 2 exercises for quick-start templates (most recent routine)
export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    name: 'Strength A',
    exerciseNames: [
      'Dumbbell Bench Press',
      'Goblet Squats',
      'Push-Ups',
      'Face Pulls',
      'Side Plank',
    ],
  },
  {
    name: 'Strength B',
    exerciseNames: [
      'Lat Pulldown',
      'Dumbbell Romanian Deadlifts',
      'Single Arm Dumbbell Row',
      'Dumbbell Bicep Curls',
      'Bird-Dog',
    ],
  },
  {
    name: 'Swimming',
    exerciseNames: ['Freestyle Swim'],
  },
];

export async function seedDatabase() {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkAdd(SEED_EXERCISES);
  }
}
