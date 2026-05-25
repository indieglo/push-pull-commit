export interface Exercise {
  id?: number;
  remoteId?: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'mobility' | 'cardio';
  isBodyweight: boolean;
  isCardio?: boolean; // true for swim, jog, etc. — uses duration/distance instead of sets
  isUnilateral?: boolean; // true for exercises done per side (bird dogs, curls, etc.)
  muscleGroup?: string;
  distanceUnit?: string; // 'laps', 'km', 'miles'
  syncStatus?: 'synced' | 'pending';
}

export interface Workout {
  id?: number;
  remoteId?: string;
  userId?: string;
  date: string; // ISO date
  name: string;
  notes?: string;
  startedAt: string; // ISO datetime
  completedAt?: string; // ISO datetime
  syncStatus?: 'synced' | 'pending';
}

export type EffortRating = 'easy' | 'challenging' | 'hard';

export interface WorkoutExercise {
  id?: number;
  remoteId?: string;
  workoutId: number;
  exerciseId: number;
  order: number;
  effortRating?: EffortRating | null;
  // Cardio fields (used instead of sets for cardio exercises)
  durationMinutes?: number | null;
  distance?: number | null; // laps, km, etc.
  cardioNotes?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface ExerciseSet {
  id?: number;
  remoteId?: string;
  workoutExerciseId: number;
  setNumber: number;
  weight: number | null; // kg, null for bodyweight
  reps: number | null; // null for timed exercises
  durationSeconds: number | null; // for planks, etc.
  isBodyweight: boolean;
  completed: boolean;
  completedAt?: string;
  syncStatus?: 'synced' | 'pending';
}

// Template for quick-start workouts
export interface WorkoutTemplate {
  name: string;
  exerciseNames: string[];
}

// Health tracking
export interface BloodPressureReading {
  id?: number;
  remoteId?: string;
  userId?: string;
  date: string; // ISO date
  time: string; // HH:MM
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface WeightLog {
  id?: number;
  remoteId?: string;
  userId?: string;
  date: string; // ISO date
  weight: number; // kg
  bmi?: number | null;
  fatPercent?: number | null;
  muscleMass?: number | null;
  source?: 'manual' | 'withings'; // where the data came from
  notes?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface AlcoholLog {
  id?: number;
  remoteId?: string;
  userId?: string;
  date: string; // ISO date
  drinks: number; // standard drinks; halves allowed
  notes?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface FitnessDailyLog {
  id?: number;
  remoteId?: string;
  userId?: string;
  date: string; // ISO date
  steps?: number | null;
  restingHeartRate?: number | null;
  heartRateVariability?: number | null;
  sleepMinutes?: number | null;
  source: string; // 'google_health', 'oura', etc.
  syncStatus?: 'synced';
}

// For "last time" display
export interface LastPerformance {
  date: string;
  sets: Array<{
    weight: number | null;
    reps: number | null;
    durationSeconds: number | null;
    isBodyweight: boolean;
  }>;
  effortRating?: EffortRating | null;
  // Cardio last performance
  durationMinutes?: number | null;
  distance?: number | null;
}
