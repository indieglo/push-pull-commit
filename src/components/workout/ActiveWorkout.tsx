import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { ExerciseCard } from './ExerciseCard';
import { CardioCard } from './CardioCard';
import { AddExerciseSheet } from './AddExerciseSheet';
import { RestTimer } from './RestTimer';
import { useTimer } from '../../hooks/useTimer';
import type { ExerciseSet, WorkoutExercise } from '../../types';

interface ActiveWorkoutProps {
  workoutExercises: WorkoutExercise[];
  allSets: ExerciseSet[];
  onUpdateSet: (setId: number, updates: Partial<ExerciseSet>) => void;
  onCompleteSet: (setId: number) => void;
  onDeleteSet: (setId: number) => void;
  onAddSet: (workoutExerciseId: number) => void;
  onAddExercise: (exerciseId: number) => void;
  onRemoveExercise: (workoutExerciseId: number) => void;
  onUpdateWorkoutExercise: (weId: number, updates: Partial<WorkoutExercise>) => void;
  onFinish: () => void;
  onCancel: () => void;
  workoutName: string;
}

export function ActiveWorkout({
  workoutExercises,
  allSets,
  onUpdateSet,
  onCompleteSet,
  onDeleteSet,
  onAddSet,
  onAddExercise,
  onRemoveExercise,
  onUpdateWorkoutExercise,
  onFinish,
  onCancel,
  workoutName,
}: ActiveWorkoutProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const timer = useTimer(90);

  // Load exercises from DB for display
  const exerciseIds = workoutExercises.map(we => we.exerciseId);
  const exercises = useLiveQuery(
    () => db.exercises.where('id').anyOf(exerciseIds).toArray(),
    [exerciseIds.join(',')]
  ) ?? [];

  const completedSets = allSets.filter(s => s.completed).length;
  const totalSets = allSets.length;

  return (
    <div className="pb-4">
      <RestTimer
        secondsLeft={timer.secondsLeft}
        progress={timer.progress}
        isRunning={timer.isRunning}
        onSkip={timer.skip}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">{workoutName}</h1>
          {totalSets > 0 && (
            <p className="text-sm text-gray-400">
              {completedSets}/{totalSets} sets completed
            </p>
          )}
        </div>
      </div>

      {/* Exercise cards */}
      {workoutExercises.map((we) => {
        const exercise = exercises.find(e => e.id === we.exerciseId);
        if (!exercise) return null;

        // Cardio exercises get a different card
        if (exercise.isCardio) {
          return (
            <CardioCard
              key={we.id}
              exercise={exercise}
              workoutExercise={we}
              onUpdate={(updates) => onUpdateWorkoutExercise(we.id!, updates)}
              onRemove={() => onRemoveExercise(we.id!)}
            />
          );
        }

        const weSets = allSets.filter(s => s.workoutExerciseId === we.id);

        return (
          <ExerciseCard
            key={we.id}
            exercise={exercise}
            workoutExercise={we}
            sets={weSets}
            onUpdateSet={onUpdateSet}
            onCompleteSet={onCompleteSet}
            onDeleteSet={onDeleteSet}
            onAddSet={() => onAddSet(we.id!)}
            onRemove={() => onRemoveExercise(we.id!)}
            onTimerStart={() => timer.start(90)}
          />
        );
      })}

      {/* Add exercise button */}
      <button
        onClick={() => setShowAddSheet(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-brand-light hover:text-brand-light transition-colors mb-4"
      >
        <Plus size={20} />
        Add Exercise
      </button>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:text-danger hover:border-danger transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onFinish}
          className="flex-1 py-3 rounded-xl bg-success text-white font-semibold hover:bg-success/90 transition-colors"
        >
          Finish Workout
        </button>
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-surface rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Cancel Workout?</h3>
            <p className="text-gray-400 text-sm mb-4">This will delete all logged sets for this session.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300"
              >
                Keep Going
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg bg-danger text-white font-medium"
              >
                Cancel Workout
              </button>
            </div>
          </div>
        </div>
      )}

      <AddExerciseSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSelect={onAddExercise}
      />
    </div>
  );
}
