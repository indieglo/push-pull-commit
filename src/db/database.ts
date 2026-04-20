import Dexie, { type Table } from 'dexie';
import type { Exercise, Workout, WorkoutExercise, ExerciseSet, BloodPressureReading, WeightLog, AlcoholLog, FitnessDailyLog } from '../types';

export class PushPullCommitDB extends Dexie {
  exercises!: Table<Exercise, number>;
  workouts!: Table<Workout, number>;
  workoutExercises!: Table<WorkoutExercise, number>;
  exerciseSets!: Table<ExerciseSet, number>;
  bloodPressure!: Table<BloodPressureReading, number>;
  weightLogs!: Table<WeightLog, number>;
  alcoholLogs!: Table<AlcoholLog, number>;
  fitnessDailyLogs!: Table<FitnessDailyLog, number>;

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

    // v3: Add remoteId index to workoutExercises and exerciseSets for pull sync
    this.version(3).stores({
      exercises: '++id, name, category, syncStatus, remoteId',
      workouts: '++id, date, name, userId, syncStatus, remoteId',
      workoutExercises: '++id, workoutId, exerciseId, syncStatus, remoteId',
      exerciseSets: '++id, workoutExerciseId, syncStatus, remoteId',
    });

    // v4: Add health tracking tables
    this.version(4).stores({
      exercises: '++id, name, category, syncStatus, remoteId',
      workouts: '++id, date, name, userId, syncStatus, remoteId',
      workoutExercises: '++id, workoutId, exerciseId, syncStatus, remoteId',
      exerciseSets: '++id, workoutExerciseId, syncStatus, remoteId',
      bloodPressure: '++id, date, userId, syncStatus, remoteId',
      weightLogs: '++id, date, userId, syncStatus, remoteId, source',
    });

    // v5: Add alcohol logging
    this.version(5).stores({
      exercises: '++id, name, category, syncStatus, remoteId',
      workouts: '++id, date, name, userId, syncStatus, remoteId',
      workoutExercises: '++id, workoutId, exerciseId, syncStatus, remoteId',
      exerciseSets: '++id, workoutExerciseId, syncStatus, remoteId',
      bloodPressure: '++id, date, userId, syncStatus, remoteId',
      weightLogs: '++id, date, userId, syncStatus, remoteId, source',
      alcoholLogs: '++id, date, userId, syncStatus, remoteId',
    });

    // v6: Add fitness daily logs (Google Health, Oura, etc.)
    this.version(6).stores({
      exercises: '++id, name, category, syncStatus, remoteId',
      workouts: '++id, date, name, userId, syncStatus, remoteId',
      workoutExercises: '++id, workoutId, exerciseId, syncStatus, remoteId',
      exerciseSets: '++id, workoutExerciseId, syncStatus, remoteId',
      bloodPressure: '++id, date, userId, syncStatus, remoteId',
      weightLogs: '++id, date, userId, syncStatus, remoteId, source',
      alcoholLogs: '++id, date, userId, syncStatus, remoteId',
      fitnessDailyLogs: '++id, date, userId, syncStatus, remoteId, source',
    });
  }
}

export const db = new PushPullCommitDB();
