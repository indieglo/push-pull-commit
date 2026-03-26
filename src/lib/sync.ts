import { supabase, isSupabaseConfigured } from './supabase';
import { db } from '../db/database';
// Types used implicitly through db operations

// Prevent concurrent sync runs
let isSyncing = false;

// Push all pending local changes to Supabase
export async function pushToSupabase(userId: string) {
  if (!isSupabaseConfigured || isSyncing) return;
  isSyncing = true;

  try {
    await pushExercises(userId);
    await pushWorkouts(userId);
    await pushWorkoutExercises();
    await pushExerciseSets();
  } catch (err) {
    console.warn('Sync push failed (will retry later):', err);
  } finally {
    isSyncing = false;
  }
}

async function pushExercises(userId: string) {
  const pending = await db.exercises.where('syncStatus').equals('pending').toArray();
  for (const exercise of pending) {
    if (exercise.remoteId) {
      // Update existing
      const { error } = await supabase
        .from('exercises')
        .update({
          name: exercise.name,
          category: exercise.category,
          is_bodyweight: exercise.isBodyweight,
          is_cardio: exercise.isCardio,
          is_unilateral: exercise.isUnilateral,
          muscle_group: exercise.muscleGroup,
          distance_unit: exercise.distanceUnit,
        })
        .eq('id', exercise.remoteId);

      if (!error) {
        await db.exercises.update(exercise.id!, { syncStatus: 'synced' });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          user_id: userId,
          name: exercise.name,
          category: exercise.category,
          is_bodyweight: exercise.isBodyweight,
          is_cardio: exercise.isCardio,
          is_unilateral: exercise.isUnilateral,
          muscle_group: exercise.muscleGroup,
          distance_unit: exercise.distanceUnit,
        })
        .select()
        .single();

      if (!error && data) {
        await db.exercises.update(exercise.id!, {
          remoteId: data.id,
          syncStatus: 'synced',
        });
      }
    }
  }
}

async function pushWorkouts(userId: string) {
  const pending = await db.workouts.where('syncStatus').equals('pending').toArray();
  for (const workout of pending) {
    if (workout.remoteId) {
      // Update existing
      const { error } = await supabase
        .from('workouts')
        .update({
          date: workout.date,
          name: workout.name,
          notes: workout.notes,
          started_at: workout.startedAt,
          completed_at: workout.completedAt,
        })
        .eq('id', workout.remoteId);

      if (!error) {
        await db.workouts.update(workout.id!, { syncStatus: 'synced' });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          date: workout.date,
          name: workout.name,
          notes: workout.notes,
          started_at: workout.startedAt,
          completed_at: workout.completedAt,
        })
        .select()
        .single();

      if (!error && data) {
        await db.workouts.update(workout.id!, {
          remoteId: data.id,
          syncStatus: 'synced',
        });
      }
    }
  }
}

async function pushWorkoutExercises() {
  const pending = await db.workoutExercises.where('syncStatus').equals('pending').toArray();
  for (const we of pending) {
    const workout = await db.workouts.get(we.workoutId);
    const exercise = await db.exercises.get(we.exerciseId);
    if (!workout?.remoteId || !exercise?.remoteId) continue;

    if (we.remoteId) {
      // Update existing
      const { error } = await supabase
        .from('workout_exercises')
        .update({
          order: we.order,
          effort_rating: we.effortRating,
          duration_minutes: we.durationMinutes,
          distance: we.distance,
          cardio_notes: we.cardioNotes,
        })
        .eq('id', we.remoteId);

      if (!error) {
        await db.workoutExercises.update(we.id!, { syncStatus: 'synced' });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.remoteId,
          exercise_id: exercise.remoteId,
          order: we.order,
          effort_rating: we.effortRating,
          duration_minutes: we.durationMinutes,
          distance: we.distance,
          cardio_notes: we.cardioNotes,
        })
        .select()
        .single();

      if (!error && data) {
        await db.workoutExercises.update(we.id!, {
          remoteId: data.id,
          syncStatus: 'synced',
        });
      }
    }
  }
}

async function pushExerciseSets() {
  const pending = await db.exerciseSets.where('syncStatus').equals('pending').toArray();
  for (const set of pending) {
    const we = await db.workoutExercises.get(set.workoutExerciseId);
    if (!we?.remoteId) continue;

    if (set.remoteId) {
      // Update existing
      const { error } = await supabase
        .from('exercise_sets')
        .update({
          set_number: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          duration_seconds: set.durationSeconds,
          is_bodyweight: set.isBodyweight,
          completed: set.completed,
          completed_at: set.completedAt,
        })
        .eq('id', set.remoteId);

      if (!error) {
        await db.exerciseSets.update(set.id!, { syncStatus: 'synced' });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('exercise_sets')
        .insert({
          workout_exercise_id: we.remoteId,
          set_number: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          duration_seconds: set.durationSeconds,
          is_bodyweight: set.isBodyweight,
          completed: set.completed,
          completed_at: set.completedAt,
        })
        .select()
        .single();

      if (!error && data) {
        await db.exerciseSets.update(set.id!, {
          remoteId: data.id,
          syncStatus: 'synced',
        });
      }
    }
  }
}

// Pull remote data into local DB (for cross-device sync)
export async function pullFromSupabase(userId: string) {
  if (!isSupabaseConfigured) return;

  try {
    // Pull exercises
    const { data: remoteExercises } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId);

    if (remoteExercises) {
      for (const re of remoteExercises) {
        const existing = await db.exercises.where('remoteId').equals(re.id).first();
        if (!existing) {
          await db.exercises.add({
            remoteId: re.id,
            name: re.name,
            category: re.category,
            isBodyweight: re.is_bodyweight,
            isCardio: re.is_cardio,
            isUnilateral: re.is_unilateral,
            muscleGroup: re.muscle_group,
            distanceUnit: re.distance_unit,
            syncStatus: 'synced',
          });
        }
      }
    }

    // Pull workouts
    const { data: remoteWorkouts } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId);

    if (remoteWorkouts) {
      for (const rw of remoteWorkouts) {
        const existing = await db.workouts.where('remoteId').equals(rw.id).first();
        if (!existing) {
          await db.workouts.add({
            remoteId: rw.id,
            userId: rw.user_id,
            date: rw.date,
            name: rw.name,
            notes: rw.notes,
            startedAt: rw.started_at,
            completedAt: rw.completed_at,
            syncStatus: 'synced',
          });
        }
      }
    }

    // Pull workout exercises and sets follows similar pattern
    // For MVP, push is more important than pull (single user, single device primarily)
  } catch (err) {
    console.warn('Sync pull failed:', err);
  }
}

// Background sync - call on app open and periodically
export async function syncAll(userId: string) {
  await pushToSupabase(userId);
  await pullFromSupabase(userId);
}
