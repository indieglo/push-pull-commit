import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export function useHistory() {
  const workouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().toArray()
  ) ?? [];

  const completedWorkouts = workouts.filter(w => w.completedAt);

  const getWorkoutDetails = async (workoutId: number) => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return null;

    const workoutExercises = await db.workoutExercises
      .where('workoutId').equals(workoutId)
      .sortBy('order');

    const exercises = await Promise.all(
      workoutExercises.map(async (we) => {
        const exercise = await db.exercises.get(we.exerciseId);
        const sets = await db.exerciseSets
          .where('workoutExerciseId').equals(we.id!)
          .sortBy('setNumber');
        return { exercise, sets, workoutExercise: we };
      })
    );

    return { workout, exercises };
  };

  return { completedWorkouts, getWorkoutDetails };
}
