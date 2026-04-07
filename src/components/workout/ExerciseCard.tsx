import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, X, ChevronUp, ArrowUp, ArrowDown, TrendingUp, Minus, Equal } from 'lucide-react';
import { SetRow } from './SetRow';
import { getLastPerformance } from '../../hooks/useWorkout';
import { db } from '../../db/database';
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onTimerStart: () => void;
  onUpdateEffort: (rating: EffortRating) => void;
}

// Exercises that use duration (seconds) instead of reps
const TIMED_EXERCISES = ['plank', 'side plank'];

function getWeightRecommendation(lastPerf: LastPerformance | null, isBodyweight: boolean): { text: string; icon: 'up' | 'same' | 'down' } | null {
  if (!lastPerf || !lastPerf.sets.length) return null;

  const effort = lastPerf.effortRating;
  const completedSets = lastPerf.sets.filter(s => s.reps !== null && s.reps > 0);
  if (!completedSets.length) return null;

  const avgReps = completedSets.reduce((sum, s) => sum + (s.reps ?? 0), 0) / completedSets.length;
  const allBW = isBodyweight && completedSets.every(s => s.isBodyweight);

  // For pure bodyweight exercises, say "reps" instead of "weight"
  const upText = allBW ? 'Increase reps or add weight' : 'Increase weight';
  const downText = allBW ? 'Consider fewer reps or easier variation' : 'Consider lowering weight';
  const keepText = allBW ? 'Keep current reps' : 'Keep weight';

  // Hard: always keep (unless very low reps → consider lowering)
  if (effort === 'hard') {
    if (avgReps < 8) {
      return { text: downText, icon: 'down' };
    }
    return { text: keepText, icon: 'same' };
  }

  // Easy: always increase
  if (effort === 'easy') {
    return { text: upText, icon: 'up' };
  }

  // Challenging (or no rating): depends on rep count
  if (avgReps >= 12) {
    return { text: allBW ? 'Try adding weight' : 'Try increasing weight', icon: 'up' };
  }
  if (avgReps < 8) {
    return { text: downText, icon: 'down' };
  }
  return { text: keepText, icon: 'same' };
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
  onMoveUp,
  onMoveDown,
  onTimerStart,
  onUpdateEffort,
}: ExerciseCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const isTimed = TIMED_EXERCISES.includes(exercise.name.toLowerCase());

  // Live query so this updates whenever new history is synced in
  const lastPerf: LastPerformance | null = useLiveQuery(
    async () => {
      // Depend on exerciseSets so changes (e.g. sync) re-trigger this query
      await db.exerciseSets.count();
      return await getLastPerformance(workoutExercise.exerciseId);
    },
    [workoutExercise.exerciseId]
  ) ?? null;

  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const recommendation = getWeightRecommendation(lastPerf, exercise.isBodyweight);

  return (
    <div className="bg-surface rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-white">{exercise.name}</h3>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button onClick={onMoveUp} className="p-1 text-gray-500 hover:text-white transition-colors">
              <ArrowUp size={16} />
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="p-1 text-gray-500 hover:text-white transition-colors">
              <ArrowDown size={16} />
            </button>
          )}
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="p-1 text-gray-500 hover:text-danger transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Remove confirmation */}
      {showRemoveConfirm && (
        <div className="mb-3 p-3 bg-danger/10 border border-danger/30 rounded-lg">
          <p className="text-sm text-gray-300 mb-2">Remove {exercise.name}?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-gray-600 text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={onRemove}
              className="flex-1 text-xs py-1.5 rounded-lg bg-danger text-white"
            >
              Remove
            </button>
          </div>
        </div>
      )}

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
              {exercise.isUnilateral && <span className="text-brand-light ml-0.5">/side</span>}
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
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 px-1">
        <span className="w-5 text-center">Set</span>
        <span className="w-20 text-center">Weight</span>
        <span className="w-20 text-center">
          {isTimed ? 'Time' : 'Reps'}
          {exercise.isUnilateral && <span className="text-brand-light ml-0.5">/side</span>}
        </span>
        <span className="w-9"></span>
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
