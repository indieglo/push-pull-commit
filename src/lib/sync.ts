import { supabase, isSupabaseConfigured } from './supabase';
import { db } from '../db/database';
// Types used implicitly through db operations

// Push all pending local changes to Supabase
export async function pushToSupabase(userId: string) {
  if (!isSupabaseConfigured) return;

  try {
    await pushExercises(userId);
    await pushWorkouts(userId);
    await pushWorkoutExercises();
    await pushExerciseSets();
  } catch (err) {
    console.warn('Sync push failed (will retry later):', err);
  }
}

async function pushExercises(userId: string) {
  const pending = await db.exercises.where('syncStatus').equals('pending').toArray();
  for (const exercise of pending) {
    const { data, error } = await supabase
      .from('exercises')
      .upsert({
        id: exercise.remoteId || undefined,
        user_id: userId,
        name: exercise.name,
        category: exercise.category,
        is_bodyweight: exercise.isBodyweight,
        muscle_group: exercise.muscleGroup,
      }, { onConflict: 'id' })
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

async function pushWorkouts(userId: string) {
  const pending = await db.workouts.where('syncStatus').equals('pending').toArray();
  for (const workout of pending) {
    const { data, error } = await supabase
      .from('workouts')
      .upsert({
        id: workout.remoteId || undefined,
        user_id: userId,
        date: workout.date,
        name: workout.name,
        notes: workout.notes,
        started_at: workout.startedAt,
        completed_at: workout.completedAt,
      }, { onConflict: 'id' })
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

async function pushWorkoutExercises() {
  const pending = await db.workoutExercises.where('syncStatus').equals('pending').toArray();
  for (const we of pending) {
    const workout = await db.workouts.get(we.workoutId);
    const exercise = await db.exercises.get(we.exerciseId);
    if (!workout?.remoteId || !exercise?.remoteId) continue;

    const { data, error } = await supabase
      .from('workout_exercises')
      .upsert({
        id: we.remoteId || undefined,
        workout_id: workout.remoteId,
        exercise_id: exercise.remoteId,
        order: we.order,
      }, { onConflict: 'id' })
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

async function pushExerciseSets() {
  const pending = await db.exerciseSets.where('syncStatus').equals('pending').toArray();
  for (const set of pending) {
    const we = await db.workoutExercises.get(set.workoutExerciseId);
    if (!we?.remoteId) continue;

    const { data, error } = await supabase
      .from('exercise_sets')
      .upsert({
        id: set.remoteId || undefined,
        workout_exercise_id: we.remoteId,
        set_number: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration_seconds: set.durationSeconds,
        is_bodyweight: set.isBodyweight,
        completed: set.completed,
        completed_at: set.completedAt,
      }, { onConflict: 'id' })
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
            muscleGroup: re.muscle_group,
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
