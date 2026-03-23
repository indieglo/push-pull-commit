import { useState, useEffect } from 'react';
import { Plus, X, ChevronUp } from 'lucide-react';
import { SetRow } from './SetRow';
import { getLastPerformance } from '../../hooks/useWorkout';
import type { Exercise, ExerciseSet, WorkoutExercise, LastPerformance } from '../../types';

interface ExerciseCardProps {
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  sets: ExerciseSet[];
  onUpdateSet: (setId: number, updates: Partial<ExerciseSet>) => void;
  onCompleteSet: (setId: number) => void;
  onDeleteSet: (setId: number) => void;
  onAddSet: () => void;
  onRemove: () => void;
  onTimerStart: () => void;
}

// Exercises that use duration (seconds) instead of reps
const TIMED_EXERCISES = ['plank', 'side plank'];

export function ExerciseCard({
  exercise,
  workoutExercise,
  sets,
  onUpdateSet,
  onCompleteSet,
  onDeleteSet,
  onAddSet,
  onRemove,
  onTimerStart,
}: ExerciseCardProps) {
  const [lastPerf, setLastPerf] = useState<LastPerformance | null>(null);
  const isTimed = TIMED_EXERCISES.includes(exercise.name.toLowerCase());

  useEffect(() => {
    getLastPerformance(workoutExercise.exerciseId).then(setLastPerf);
  }, [workoutExercise.exerciseId]);

  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);

  return (
    <div className="bg-surface rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-white">{exercise.name}</h3>
        <button
          onClick={onRemove}
          className="p-1 text-gray-500 hover:text-danger transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {lastPerf && lastPerf.sets.length > 0 && (
        <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
          <ChevronUp size={12} className="text-brand-light" />
          <span>
            Last ({new Date(lastPerf.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}):
            {' '}
            {lastPerf.sets.map((s) => {
              if (s.durationSeconds) return `${s.durationSeconds}s`;
              if (s.isBodyweight && !s.weight) return `${s.reps}`;
              return `${s.reps}${s.weight ? `@${s.weight}kg` : ''}`;
            }).join(' / ')}
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 px-1">
        <span className="w-6 text-center">Set</span>
        <span className="w-24 text-center">Weight</span>
        <span className="w-24 text-center">{isTimed ? 'Time' : 'Reps'}</span>
        <span className="w-10"></span>
        <span className="w-8"></span>
      </div>

      {sortedSets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          isTimed={isTimed}
          onUpdate={(updates) => onUpdateSet(set.id!, updates)}
          onComplete={() => onCompleteSet(set.id!)}
          onDelete={() => onDeleteSet(set.id!)}
          onTimerStart={onTimerStart}
        />
      ))}

      <button
        onClick={onAddSet}
        className="flex items-center gap-1 text-brand-light text-sm mt-2 hover:text-brand transition-colors"
      >
        <Plus size={16} />
        Add Set
      </button>
    </div>
  );
}
