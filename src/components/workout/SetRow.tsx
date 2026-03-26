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
    <div className={`flex items-center gap-1.5 py-1.5 ${set.completed ? 'opacity-60' : ''}`}>
      <span className="text-gray-500 text-sm w-5 text-center font-mono shrink-0">
        {set.setNumber}
      </span>

      {/* Weight column: tappable BW badge toggles to weight input */}
      {set.isBodyweight ? (
        <button
          onClick={handleToggleBodyweight}
          className="w-20 text-center text-gray-400 text-sm py-2.5 border border-transparent hover:border-gray-600 rounded-lg transition-colors shrink-0"
          title="Tap to add weight"
        >
          BW
        </button>
      ) : (
        <div className="relative w-20 shrink-0">
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
          className="w-20 shrink-0"
        />
      ) : (
        <NumericInput
          value={set.reps}
          onChange={(reps) => onUpdate({ reps })}
          placeholder="0"
          suffix="reps"
          className="w-20 shrink-0"
        />
      )}

      <button
        onClick={handleComplete}
        className={`p-2 rounded-lg transition-colors shrink-0 ${
          set.completed
            ? 'bg-success/20 text-success'
            : 'bg-surface-light text-gray-400 hover:text-white'
        }`}
      >
        <Check size={18} />
      </button>

      <button
        onClick={onDelete}
        className="p-2 text-gray-500 hover:text-danger transition-colors shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
