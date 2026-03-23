import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Exercise } from '../types';

export function useExercises() {
  const exercises = useLiveQuery(() => db.exercises.toArray()) ?? [];

  const exercisesByCategory = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {});

  const getExerciseById = (id: number) => exercises.find(e => e.id === id);
  const getExerciseByName = (name: string) => exercises.find(e => e.name === name);

  return { exercises, exercisesByCategory, getExerciseById, getExerciseByName };
}
