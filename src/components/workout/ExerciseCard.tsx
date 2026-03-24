import { useState, useEffect } from 'react';
import { Plus, X, ChevronUp, TrendingUp, Minus, Equal } from 'lucide-react';
import { SetRow } from './SetRow';
import { getLastPerformance } from '../../hooks/useWorkout';
import type { Exercise, ExerciseSet, WorkoutExercise, LastPerformance, EffortRating } from '../../types';

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
  onUpdateEffort: (rating: EffortRating) => void;
}

// Exercises that use duration (seconds) instead of reps
const TIMED_EXERCISES = ['plank', 'side plank'];

function getWeightRecommendation(lastPerf: LastPerformance | null): { text: string; icon: 'up' | 'same' | 'down' } | null {
  if (!lastPerf || !lastPerf.sets.length) return null;

  const effort = lastPerf.effortRating;
  const completedSets = lastPerf.sets.filter(s => s.reps !== null && s.reps > 0);
  if (!completedSets.length) return null;

  const avgReps = completedSets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / completedSets.length;

  // Hard: always keep weight (unless very low reps → consider lowering)
  if (effort === 'hard') {
    if (avgReps < 8) {
      return { text: 'Consider lowering weight', icon: 'down' };
    }
    return { text: 'Keep weight', icon: 'same' };
  }

  // Easy: always increase weight
  if (effort === 'easy') {
    return { text: 'Increase weight', icon: 'up' };
  }

  // Challenging (or no rating): depends on rep count
  if (avgReps >= 12) {
    return { text: 'Try increasing weight', icon: 'up' };
  }
  if (avgReps < 8) {
    return { text: 'Consider lowering weight', icon: 'down' };
  }
  return { text: 'Keep weight', icon: 'same' };
}

const EFFORT_OPTIONS: { value: EffortRating; label: string; color: string; activeColor: string }[] = [
  { value: 'easy', label: 'Easy', color: 'text-gray-500 border-gray-600', activeColor: 'text-success border-success bg-success/10' },
  { value: 'challenging', label: 'Challenging', color: 'text-gray-500 border-gray-600', activeColor: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' },
  { value: 'hard', label: 'Hard', color: 'text-gray-500 border-gray-600', activeColor: 'text-danger border-danger bg-danger/10' },
];

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
  onUpdateEffort,
}: ExerciseCardProps) {
  const [lastPerf, setLastPerf] = useState<LastPerformance | null>(null);
  const isTimed = TIMED_EXERCISES.includes(exercise.name.toLowerCase());

  useEffect(() => {
    getLastPerformance(workoutExercise.exerciseId).then(setLastPerf);
  }, [workoutExercise.exerciseId]);

  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const recommendation = getWeightRecommendation(lastPerf);

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

      {/* Last performance + recommendation */}
      {lastPerf && lastPerf.sets.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <ChevronUp size={12} className="text-brand-light" />
            <span>
              Last ({new Date(lastPerf.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}):
              {' '}
              {lastPerf.sets.map((s) => {
                if (s.durationSeconds) return `${s.durationSeconds}s`;
                if (s.isBodyweight && !s.weight) return `${s.reps}`;
                return `${s.reps}${s.weight ? `@${s.weight}kg` : ''}`;
              }).join(' / ')}
              {lastPerf.effortRating && (
                <span className={`ml-1 ${
                  lastPerf.effortRating === 'easy' ? 'text-success' :
                  lastPerf.effortRating === 'challenging' ? 'text-yellow-400' : 'text-danger'
                }`}>
                  ({lastPerf.effortRating})
                </span>
              )}
            </span>
          </div>
          {recommendation && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              recommendation.icon === 'up' ? 'text-success' :
              recommendation.icon === 'down' ? 'text-danger' : 'text-gray-400'
            }`}>
              {recommendation.icon === 'up' && <TrendingUp size={12} />}
              {recommendation.icon === 'same' && <Equal size={12} />}
              {recommendation.icon === 'down' && <Minus size={12} />}
              {recommendation.text}
            </div>
          )}
        </div>
      )}

      {/* Effort rating buttons */}
      <div className="flex gap-2 mb-3">
        {EFFORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onUpdateEffort(opt.value)}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
              workoutExercise.effortRating === opt.value ? opt.activeColor : opt.color
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

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
