import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import type { Workout, Exercise, WorkoutExercise, ExerciseSet } from '../../types';

interface WorkoutDetailProps {
  workoutId: number;
  onBack: () => void;
}

interface ExerciseDetail {
  exercise: Exercise | undefined;
  sets: ExerciseSet[];
  workoutExercise: WorkoutExercise;
}

export function WorkoutDetail({ workoutId, onBack }: WorkoutDetailProps) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetail[]>([]);

  useEffect(() => {
    async function load() {
      const w = await db.workouts.get(workoutId);
      if (!w) return;
      setWorkout(w);

      const wes = await db.workoutExercises
        .where('workoutId').equals(workoutId)
        .sortBy('order');

      const details = await Promise.all(
        wes.map(async (we) => ({
          exercise: await db.exercises.get(we.exerciseId),
          sets: await db.exerciseSets
            .where('workoutExerciseId').equals(we.id!)
            .sortBy('setNumber'),
          workoutExercise: we,
        }))
      );
      setExerciseDetails(details);
    }
    load();
  }, [workoutId]);

  if (!workout) return null;

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <h1 className="text-xl font-bold text-white mb-1">{workout.name}</h1>
      <p className="text-sm text-gray-400 mb-4">
        {new Date(workout.date).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      {workout.notes && (
        <p className="text-sm text-gray-300 bg-surface rounded-lg p-3 mb-4">{workout.notes}</p>
      )}

      {exerciseDetails.map(({ exercise, sets, workoutExercise }) => (
        <div key={workoutExercise.id} className="bg-surface rounded-xl p-4 mb-3">
          <h3 className="font-semibold text-white mb-2">{exercise?.name ?? 'Unknown'}</h3>

          {/* Cardio display */}
          {exercise?.isCardio ? (
            <div className="flex gap-4 text-sm">
              {workoutExercise.distance != null && (
                <span className="text-white">{workoutExercise.distance} {exercise.distanceUnit || 'km'}</span>
              )}
              {workoutExercise.durationMinutes != null && (
                <span className="text-white">{workoutExercise.durationMinutes} min</span>
              )}
              {workoutExercise.cardioNotes && (
                <span className="text-gray-400 italic">{workoutExercise.cardioNotes}</span>
              )}
            </div>
          ) : (
            /* Set-based display */
            <div className="space-y-1">
              {sets.map((set) => (
                <div key={set.id} className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 w-8">Set {set.setNumber}</span>
                  {set.isBodyweight && !set.weight ? (
                    <span className="text-gray-400">BW</span>
                  ) : (
                    <span className="text-white">{set.weight ?? '-'} kg</span>
                  )}
                  {set.durationSeconds ? (
                    <span className="text-white">{set.durationSeconds}s</span>
                  ) : (
                    <span className="text-white">{set.reps ?? '-'} reps</span>
                  )}
                  {set.completed && (
                    <span className="text-success text-xs">Done</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
