import { useState, useEffect } from 'react';
import { X, ChevronUp, Timer, MapPin } from 'lucide-react';
import { NumericInput } from '../common/NumericInput';
import { getLastCardioPerformance } from '../../hooks/useWorkout';
import type { Exercise, WorkoutExercise, LastPerformance } from '../../types';

interface CardioCardProps {
  exercise: Exercise;
  workoutExercise: WorkoutExercise;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
}

export function CardioCard({ exercise, workoutExercise, onUpdate, onRemove }: CardioCardProps) {
  const [lastPerf, setLastPerf] = useState<LastPerformance | null>(null);
  const distanceUnit = exercise.distanceUnit || 'km';

  useEffect(() => {
    getLastCardioPerformance(workoutExercise.exerciseId).then(setLastPerf);
  }, [workoutExercise.exerciseId]);

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
