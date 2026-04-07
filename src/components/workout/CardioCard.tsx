import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, ChevronUp, Timer, MapPin, ArrowUp, ArrowDown } from 'lucide-react';
import { NumericInput } from '../common/NumericInput';
import { getLastCardioPerformance } from '../../hooks/useWorkout';
import { db } from '../../db/database';
import type { Exercise, WorkoutExercise, LastPerformance } from '../../types';

interface CardioCardProps {
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function CardioCard({ exercise, workoutExercise, onUpdate, onRemove, onMoveUp, onMoveDown }: CardioCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const distanceUnit = exercise.distanceUnit || 'km';

  const lastPerf: LastPerformance | null = useLiveQuery(
    async () => {
      await db.workoutExercises.count();
      return await getLastCardioPerformance(workoutExercise.exerciseId);
    },
    [workoutExercise.exerciseId]
  ) ?? null;

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

      {lastPerf && (lastPerf.durationMinutes || lastPerf.distance) && (
        <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
          <ChevronUp size={12} className="text-brand-light" />
          <span>
            Last ({new Date(lastPerf.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}):
            {lastPerf.distance ? ` ${lastPerf.distance} ${distanceUnit}` : ''}
            {lastPerf.durationMinutes ? ` in ${lastPerf.durationMinutes} min` : ''}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Duration */}
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Timer size={12} />
            Duration
          </label>
          <NumericInput
            value={workoutExercise.durationMinutes ?? null}
            onChange={(durationMinutes) => onUpdate({ durationMinutes })}
            placeholder="0"
            suffix="min"
          />
        </div>

        {/* Distance */}
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <MapPin size={12} />
            Distance
          </label>
          <NumericInput
            value={workoutExercise.distance ?? null}
            onChange={(distance) => onUpdate({ distance })}
            placeholder="0"
            suffix={distanceUnit}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <input
          type="text"
          value={workoutExercise.cardioNotes || ''}
          onChange={(e) => onUpdate({ cardioNotes: e.target.value })}
          placeholder="Notes (e.g., felt strong, easy pace...)"
          className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-light focus:outline-none"
        />
      </div>
    </div>
  );
}
