import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { syncAll } from '../lib/sync';
import { supabase } from '../lib/supabase';
import type { Workout, WorkoutExercise, ExerciseSet, LastPerformance } from '../types';

export function useWorkout() {
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(() => {
    const stored = localStorage.getItem('activeWorkoutId');
    return stored ? Number(stored) : null;
  });

  // Live query for the active workout
  const activeWorkout = useLiveQuery(
    async () => {
      if (!activeWorkoutId) return undefined;
      const workout = await db.workouts.get(activeWorkoutId);
      // Clean up stale localStorage if workout no longer exists
      if (!workout) {
        localStorage.removeItem('activeWorkoutId');
        setActiveWorkoutId(null);
      }
      return workout;
    },
    [activeWorkoutId]
  );

  // Live query for workout exercises
  const workoutExercises = useLiveQuery(
    () => activeWorkoutId
      ? db.workoutExercises.where('workoutId').equals(activeWorkoutId).sortBy('order')
      : [],
    [activeWorkoutId]
  ) ?? [];

  // Live query for all sets in the active workout
  const allSets = useLiveQuery(
    async () => {
      if (!workoutExercises.length) return [];
      const weIds = workoutExercises.map(we => we.id!);
      return db.exerciseSets
        .where('workoutExerciseId')
        .anyOf(weIds)
        .toArray();
    },
    [workoutExercises]
  ) ?? [];

  const startWorkout = useCallback(async (name: string, exerciseIds?: number[]) => {
    const now = new Date().toISOString();
    const workoutId = await db.workouts.add({
      date: now.split('T')[0],
      name,
      startedAt: now,
      syncStatus: 'pending',
    });

    if (exerciseIds?.length) {
      await db.workoutExercises.bulkAdd(
        exerciseIds.map((exerciseId, i) => ({
          workoutId: workoutId as number,
          exerciseId,
          order: i,
          syncStatus: 'pending' as const,
        }))
      );

      // Add 3 empty sets for each non-cardio exercise
      const workoutExs = await db.workoutExercises
        .where('workoutId').equals(workoutId).toArray();

      for (const we of workoutExs) {
        const exercise = await db.exercises.get(we.exerciseId);
        if (exercise?.isCardio) continue; // Cardio uses duration/distance, not sets

        const lastPerf = await getLastPerformance(we.exerciseId);

        for (let s = 0; s < 3; s++) {
          const lastSet = lastPerf?.sets[s];
          await db.exerciseSets.add({
            workoutExerciseId: we.id!,
            setNumber: s + 1,
            weight: lastSet?.weight ?? null,
            reps: null,
            durationSeconds: null,
            isBodyweight: exercise?.isBodyweight ?? false,
            completed: false,
            syncStatus: 'pending',
          });
        }
      }
    }

    setActiveWorkoutId(workoutId as number);
    localStorage.setItem('activeWorkoutId', String(workoutId));
    return workoutId as number;
  }, []);

  const addExerciseToWorkout = useCallback(async (exerciseId: number) => {
    if (!activeWorkoutId) return;

    const maxOrder = workoutExercises.length > 0
      ? Math.max(...workoutExercises.map(we => we.order))
      : -1;

    const weId = await db.workoutExercises.add({
      workoutId: activeWorkoutId,
      exerciseId,
      order: maxOrder + 1,
      syncStatus: 'pending',
    });

    const exercise = await db.exercises.get(exerciseId);

    // Skip set creation for cardio exercises
    if (!exercise?.isCardio) {
      const lastPerf = await getLastPerformance(exerciseId);
      for (let s = 0; s < 3; s++) {
        const lastSet = lastPerf?.sets[s];
        await db.exerciseSets.add({
          workoutExerciseId: weId as number,
          setNumber: s + 1,
          weight: lastSet?.weight ?? null,
          reps: null,
          durationSeconds: null,
          isBodyweight: exercise?.isBodyweight ?? false,
          completed: false,
          syncStatus: 'pending',
        });
      }
    }
  }, [activeWorkoutId, workoutExercises]);

  const addSet = useCallback(async (workoutExerciseId: number) => {
    const existingSets = await db.exerciseSets
      .where('workoutExerciseId').equals(workoutExerciseId).toArray();
    const lastSet = existingSets[existingSets.length - 1];

    await db.exerciseSets.add({
      workoutExerciseId,
      setNumber: existingSets.length + 1,
      weight: lastSet?.weight ?? null,
      reps: null,
      durationSeconds: null,
      isBodyweight: lastSet?.isBodyweight ?? false,
      completed: false,
      syncStatus: 'pending',
    });
  }, []);

  const updateSet = useCallback(async (setId: number, updates: Partial<ExerciseSet>) => {
    await db.exerciseSets.update(setId, { ...updates, syncStatus: 'pending' });
  }, []);

  const deleteSet = useCallback(async (setId: number) => {
    await db.exerciseSets.delete(setId);
  }, []);

  const removeExercise = useCallback(async (workoutExerciseId: number) => {
    await db.exerciseSets.where('workoutExerciseId').equals(workoutExerciseId).delete();
    await db.workoutExercises.delete(workoutExerciseId);
  }, []);

  const completeSet = useCallback(async (setId: number) => {
    await db.exerciseSets.update(setId, {
      completed: true,
      completedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const finishWorkout = useCallback(async () => {
    if (!activeWorkoutId) return;
    await db.workouts.update(activeWorkoutId, {
      completedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
    setActiveWorkoutId(null);
    localStorage.removeItem('activeWorkoutId');

    // Auto-sync after finishing so data is never lost
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      syncAll(user.id).catch(() => {}); // fire and forget
    }
  }, [activeWorkoutId]);

  const cancelWorkout = useCallback(async () => {
    if (!activeWorkoutId) return;
    // Delete all sets and exercises for this workout
    const wes = await db.workoutExercises.where('workoutId').equals(activeWorkoutId).toArray();
    for (const we of wes) {
      await db.exerciseSets.where('workoutExerciseId').equals(we.id!).delete();
    }
    await db.workoutExercises.where('workoutId').equals(activeWorkoutId).delete();
    await db.workouts.delete(activeWorkoutId);
    setActiveWorkoutId(null);
    localStorage.removeItem('activeWorkoutId');
  }, [activeWorkoutId]);

  const reorderExercise = useCallback(async (workoutExerciseId: number, direction: 'up' | 'down') => {
    const sorted = [...workoutExercises].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(we => we.id === workoutExerciseId);
    if (idx < 0) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const current = sorted[idx];
    const swap = sorted[swapIdx];
    await db.workoutExercises.update(current.id!, { order: swap.order, syncStatus: 'pending' as const });
    await db.workoutExercises.update(swap.id!, { order: current.order, syncStatus: 'pending' as const });
  }, [workoutExercises]);

  const updateWorkoutExercise = useCallback(async (weId: number, updates: Partial<WorkoutExercise>) => {
    await db.workoutExercises.update(weId, { ...updates, syncStatus: 'pending' });
  }, []);

  return {
    activeWorkout,
    activeWorkoutId,
    workoutExercises,
    allSets,
    startWorkout,
    addExerciseToWorkout,
    addSet,
    updateSet,
    updateWorkoutExercise,
    reorderExercise,
    deleteSet,
    removeExercise,
    completeSet,
    finishWorkout,
    cancelWorkout,
  };
}

// Get the last performance for an exercise (across all completed workouts)
export async function getLastPerformance(exerciseId: number): Promise<LastPerformance | null> {
  // Find the most recent completed workout that includes this exercise
  const allWes = await db.workoutExercises
    .where('exerciseId').equals(exerciseId).toArray();

  if (!allWes.length) return null;

  // Get the workouts and find the most recent completed one
  const workoutIds = [...new Set(allWes.map(we => we.workoutId))];
  const workouts = await db.workouts.bulkGet(workoutIds);

  const completedWorkouts = workouts
    .filter((w): w is Workout => w !== undefined && w.completedAt !== undefined)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  if (!completedWorkouts.length) return null;

  const lastWorkout = completedWorkouts[0];
  const we = allWes.find(we => we.workoutId === lastWorkout.id);
  if (!we) return null;

  const sets = await db.exerciseSets
    .where('workoutExerciseId').equals(we.id!)
    .sortBy('setNumber');

  return {
    date: lastWorkout.date,
    sets: sets.map(s => ({
      weight: s.weight,
      reps: s.reps,
      durationSeconds: s.durationSeconds,
      isBodyweight: s.isBodyweight,
    })),
    effortRating: we.effortRating,
  };
}

// Get last cardio performance (duration + distance)
export async function getLastCardioPerformance(exerciseId: number): Promise<LastPerformance | null> {
  const allWes = await db.workoutExercises
    .where('exerciseId').equals(exerciseId).toArray();

  if (!allWes.length) return null;

  const workoutIds = [...new Set(allWes.map(we => we.workoutId))];
  const workouts = await db.workouts.bulkGet(workoutIds);

  const completedWorkouts = workouts
    .filter((w): w is Workout => w !== undefined && w.completedAt !== undefined)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  if (!completedWorkouts.length) return null;

  const lastWorkout = completedWorkouts[0];
  const we = allWes.find(we => we.workoutId === lastWorkout.id);
  if (!we) return null;

  return {
    date: lastWorkout.date,
    sets: [],
    durationMinutes: we.durationMinutes,
    distance: we.distance,
  };
}
