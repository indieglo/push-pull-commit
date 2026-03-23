import { Check, Trash2 } from 'lucide-react';
import { NumericInput } from '../common/NumericInput';
import type { ExerciseSet } from '../../types';

interface SetRowProps {
  set: ExerciseSet;
  isTimed: boolean; // true for planks, side planks — uses duration instead of reps
  onUpdate: (updates: Partial<ExerciseSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
  onTimerStart: () => void;
}

export function SetRow({ set, isTimed, onUpdate, onComplete, onDelete, onTimerStart }: SetRowProps) {
  const handleComplete = () => {
    if (!set.completed) {
      onComplete();
      onTimerStart();
    }
  };

  const handleToggleBodyweight = () => {
    if (set.isBodyweight) {
      // Switch to weighted — clear BW flag, let them enter weight
      onUpdate({ isBodyweight: false, weight: null });
    } else {
      // Switch back to BW
      onUpdate({ isBodyweight: true, weight: null });
    }
  };

  return (
    <div className={`flex items-center gap-2 py-1.5 ${set.completed ? 'opacity-60' : ''}`}>
      <span className="text-gray-500 text-sm w-6 text-center font-mono">
        {set.setNumber}
      </span>

      {/* Weight column: tappable BW badge toggles to weight input */}
      {set.isBodyweight ? (
        <button
          onClick={handleToggleBodyweight}
          className="w-24 text-center text-gray-400 text-sm py-2.5 border border-transparent hover:border-gray-600 rounded-lg transition-colors"
          title="Tap to add weight"
        >
          BW
        </button>
      ) : (
        <div className="relative w-24">
          <NumericInput
            value={set.weight}
            onChange={(weight) => {
              // If weight is cleared or set to 0, revert to bodyweight
              if (weight === null || weight === 0) {
                onUpdate({ isBodyweight: true, weight: null });
              } else {
                onUpdate({ weight });
              }
            }}
            placeholder="kg"
            suffix="kg"
            className="w-full"
          />
        </div>
      )}

      {/* Reps or duration column */}
      {isTimed ? (
        <NumericInput
          value={set.durationSeconds}
          onChange={(durationSeconds) => onUpdate({ durationSeconds })}
          placeholder="0"
          suffix="sec"
          className="w-24"
        />
      ) : (
        <NumericInput
          value={set.reps}
          onChange={(reps) => onUpdate({ reps })}
          placeholder="0"
          suffix="reps"
          className="w-24"
        />
      )}

      <button
        onClick={handleComplete}
        className={`p-2.5 rounded-lg transition-colors ${
          set.completed
            ? 'bg-success/20 text-success'
            : 'bg-surface-light text-gray-400 hover:text-white'
        }`}
      >
        <Check size={20} />
      </button>

      <button
        onClick={onDelete}
        className="p-2.5 text-gray-500 hover:text-danger transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
