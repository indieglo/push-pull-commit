import Dexie, { type Table } from 'dexie';
import type { Exercise, Workout, WorkoutExercise, ExerciseSet } from '../types';

export class PushPullCommitDB extends Dexie {
  exercises!: Table<Exercise, number>;
  workouts!: Table<Workout, number>;
  workoutExercises!: Table<WorkoutExercise, number>;
  exerciseSets!: Table<ExerciseSet, number>;

  constructor() {
    super('PushPullCommitDB');

    this.version(1).stores({
      exercises: '++id, name, category, syncStatus',
      workouts: '++id, date, name, userId, syncStatus, remoteId',
      workoutExercises: '++id, workoutId, exerciseId, syncStatus',
      exerciseSets: '++id, workoutExerciseId, syncStatus',
    });

    // v2: Add isCardio to exercises, cardio fields to workoutExercises
    this.version(2).stores({
      exercises: '++id, name, category, syncStatus, remoteId',
      workouts: '++id, date, name, userId, syncStatus, remoteId',
      workoutExercises: '++id, workoutId, exerciseId, syncStatus',
      exerciseSets: '++id, workoutExerciseId, syncStatus',
    });
  }
}

export const db = new PushPullCommitDB();
