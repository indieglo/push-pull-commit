import { supabase, isSupabaseConfigured } from './supabase';
import { db } from '../db/database';
// Types used implicitly through db operations

// Prevent concurrent sync runs
let isSyncing = false;

// Accumulate errors during a sync run so the UI can surface them
const syncErrors: string[] = [];
function recordError(context: string, error: { message?: string } | null | undefined) {
  if (!error) return;
  const msg = `${context}: ${error.message ?? 'unknown error'}`;
  console.warn('[sync]', msg);
  syncErrors.push(msg);
}
export function getLastSyncErrors(): string[] {
  return [...syncErrors];
}

// Push all pending local changes to Supabase
export async function pushToSupabase(userId: string) {
  if (!isSupabaseConfigured) return;

  await pushExercises(userId);
  await pushWorkouts(userId);
  await pushWorkoutExercises();
  await pushExerciseSets();
  await pushBloodPressure(userId);
  await pushWeightLogs(userId);
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
    // Only push completed workouts — don't sync in-progress or cancelled ones
    if (!workout.completedAt && !workout.remoteId) continue;
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
      } else {
        recordError(`workout update id=${workout.id}`, error);
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
      } else {
        recordError(`workout insert id=${workout.id}`, error);
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

async function pushBloodPressure(userId: string) {
  const pending = await db.bloodPressure.where('syncStatus').equals('pending').toArray();
  for (const bp of pending) {
    if (bp.remoteId) {
      const { error } = await supabase
        .from('blood_pressure')
        .update({
          date: bp.date,
          time: bp.time,
          systolic: bp.systolic,
          diastolic: bp.diastolic,
          pulse: bp.pulse,
          notes: bp.notes,
        })
        .eq('id', bp.remoteId);
      if (!error) await db.bloodPressure.update(bp.id!, { syncStatus: 'synced' });
    } else {
      const { data, error } = await supabase
        .from('blood_pressure')
        .insert({
          user_id: userId,
          date: bp.date,
          time: bp.time,
          systolic: bp.systolic,
          diastolic: bp.diastolic,
          pulse: bp.pulse,
          notes: bp.notes,
        })
        .select()
        .single();
      if (!error && data) {
        await db.bloodPressure.update(bp.id!, { remoteId: data.id, syncStatus: 'synced' });
      }
    }
  }
}

async function pushWeightLogs(userId: string) {
  const pending = await db.weightLogs.where('syncStatus').equals('pending').toArray();
  for (const wl of pending) {
    if (wl.remoteId) {
      const { error } = await supabase
        .from('weight_logs')
        .update({
          date: wl.date,
          weight: wl.weight,
          bmi: wl.bmi,
          fat_percent: wl.fatPercent,
          muscle_mass: wl.muscleMass,
          source: wl.source,
          notes: wl.notes,
        })
        .eq('id', wl.remoteId);
      if (!error) await db.weightLogs.update(wl.id!, { syncStatus: 'synced' });
    } else {
      const { data, error } = await supabase
        .from('weight_logs')
        .insert({
          user_id: userId,
          date: wl.date,
          weight: wl.weight,
          bmi: wl.bmi,
          fat_percent: wl.fatPercent,
          muscle_mass: wl.muscleMass,
          source: wl.source,
          notes: wl.notes,
        })
        .select()
        .single();
      if (!error && data) {
        await db.weightLogs.update(wl.id!, { remoteId: data.id, syncStatus: 'synced' });
      }
    }
  }
}

// Pull remote data into local DB (for cross-device sync)
export async function pullFromSupabase(userId: string) {
  if (!isSupabaseConfigured) return;

  try {
    // Build maps of existing remoteIds to avoid per-record DB lookups
    const existingExercises = await db.exercises.toArray();
    const existingWorkouts = await db.workouts.toArray();
    const existingWEs = await db.workoutExercises.toArray();
    const existingSets = await db.exerciseSets.toArray();

    const exerciseRemoteIds = new Set(existingExercises.map(e => e.remoteId).filter(Boolean));
    const workoutRemoteIds = new Set(existingWorkouts.map(w => w.remoteId).filter(Boolean));
    const weRemoteIds = new Set(existingWEs.map(we => we.remoteId).filter(Boolean));
    const setRemoteIds = new Set(existingSets.map(s => s.remoteId).filter(Boolean));

    // Pull exercises
    const { data: remoteExercises } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId);

    if (remoteExercises) {
      const newExercises = remoteExercises
        .filter(re => !exerciseRemoteIds.has(re.id))
        .map(re => ({
          remoteId: re.id,
          name: re.name,
          category: re.category,
          isBodyweight: re.is_bodyweight,
          isCardio: re.is_cardio,
          isUnilateral: re.is_unilateral,
          muscleGroup: re.muscle_group,
          distanceUnit: re.distance_unit,
          syncStatus: 'synced' as const,
        }));
      if (newExercises.length) await db.exercises.bulkAdd(newExercises);
    }

    // Pull workouts (only completed ones)
    const { data: remoteWorkouts } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    if (remoteWorkouts) {
      const newWorkouts = remoteWorkouts
        .filter(rw => !workoutRemoteIds.has(rw.id))
        .map(rw => ({
          remoteId: rw.id,
          userId: rw.user_id,
          date: rw.date,
          name: rw.name,
          notes: rw.notes,
          startedAt: rw.started_at,
          completedAt: rw.completed_at,
          syncStatus: 'synced' as const,
        }));
      if (newWorkouts.length) await db.workouts.bulkAdd(newWorkouts);
    }

    // Build remoteId -> localId maps for lookups (refresh after inserts)
    const allExercises = await db.exercises.toArray();
    const allWorkouts = await db.workouts.toArray();
    const exerciseMap = new Map(allExercises.filter(e => e.remoteId).map(e => [e.remoteId!, e.id!]));
    const workoutMap = new Map(allWorkouts.filter(w => w.remoteId).map(w => [w.remoteId!, w.id!]));

    // Pull workout exercises
    const { data: remoteWEs } = await supabase
      .from('workout_exercises')
      .select('*');

    if (remoteWEs) {
      const newWEs = remoteWEs
        .filter(rwe => !weRemoteIds.has(rwe.id))
        .filter(rwe => workoutMap.has(rwe.workout_id) && exerciseMap.has(rwe.exercise_id))
        .map(rwe => ({
          remoteId: rwe.id,
          workoutId: workoutMap.get(rwe.workout_id)!,
          exerciseId: exerciseMap.get(rwe.exercise_id)!,
          order: rwe.order,
          effortRating: rwe.effort_rating,
          durationMinutes: rwe.duration_minutes,
          distance: rwe.distance,
          cardioNotes: rwe.cardio_notes,
          syncStatus: 'synced' as const,
        }));
      if (newWEs.length) await db.workoutExercises.bulkAdd(newWEs);
    }

    // Build WE remoteId -> localId map
    const allWEs = await db.workoutExercises.toArray();
    const weMap = new Map(allWEs.filter(we => we.remoteId).map(we => [we.remoteId!, we.id!]));

    // Pull exercise sets
    const { data: remoteSets } = await supabase
      .from('exercise_sets')
      .select('*');

    if (remoteSets) {
      const newSets = remoteSets
        .filter(rs => !setRemoteIds.has(rs.id))
        .filter(rs => weMap.has(rs.workout_exercise_id))
        .map(rs => ({
          remoteId: rs.id,
          workoutExerciseId: weMap.get(rs.workout_exercise_id)!,
          setNumber: rs.set_number,
          weight: rs.weight,
          reps: rs.reps,
          durationSeconds: rs.duration_seconds,
          isBodyweight: rs.is_bodyweight,
          completed: rs.completed,
          completedAt: rs.completed_at,
          syncStatus: 'synced' as const,
        }));
      if (newSets.length) await db.exerciseSets.bulkAdd(newSets);
    }

    // Pull blood pressure readings
    const existingBP = await db.bloodPressure.toArray();
    const bpRemoteIds = new Set(existingBP.map(bp => bp.remoteId).filter(Boolean));

    const { data: remoteBP } = await supabase
      .from('blood_pressure')
      .select('*')
      .eq('user_id', userId);

    if (remoteBP) {
      const newBP = remoteBP
        .filter(rbp => !bpRemoteIds.has(rbp.id))
        .map(rbp => ({
          remoteId: rbp.id,
          userId: rbp.user_id,
          date: rbp.date,
          time: rbp.time,
          systolic: rbp.systolic,
          diastolic: rbp.diastolic,
          pulse: rbp.pulse,
          notes: rbp.notes,
          syncStatus: 'synced' as const,
        }));
      if (newBP.length) await db.bloodPressure.bulkAdd(newBP);
    }

    // Pull weight logs
    const existingWeight = await db.weightLogs.toArray();
    const weightRemoteIds = new Set(existingWeight.map(w => w.remoteId).filter(Boolean));

    const { data: remoteWeight } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId);

    if (remoteWeight) {
      const newWeight = remoteWeight
        .filter(rw => !weightRemoteIds.has(rw.id))
        .map(rw => ({
          remoteId: rw.id,
          userId: rw.user_id,
          date: rw.date,
          weight: rw.weight,
          bmi: rw.bmi,
          fatPercent: rw.fat_percent,
          muscleMass: rw.muscle_mass,
          source: rw.source,
          notes: rw.notes,
          syncStatus: 'synced' as const,
        }));
      if (newWeight.length) await db.weightLogs.bulkAdd(newWeight);
    }
  } catch (err) {
    console.warn('Sync pull failed:', err);
  }
}

// Background sync - call on app open and periodically
export async function syncAll(userId: string): Promise<{ errors: string[] }> {
  if (!isSupabaseConfigured || isSyncing) return { errors: [] };
  isSyncing = true;
  syncErrors.length = 0;
  try {
    await pushToSupabase(userId);
    await pullFromSupabase(userId);
  } catch (err) {
    console.warn('Sync failed:', err);
    syncErrors.push(`Sync aborted: ${(err as Error).message}`);
  } finally {
    isSyncing = false;
  }
  return { errors: [...syncErrors] };
}
