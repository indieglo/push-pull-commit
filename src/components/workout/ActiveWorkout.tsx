import { useState, useRef } from 'react';
import { Plus, AlertTriangle, ChevronDown, StickyNote } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { ExerciseCard } from './ExerciseCard';
import { CardioCard } from './CardioCard';
import { AddExerciseSheet } from './AddExerciseSheet';
import { RestTimer } from './RestTimer';
import { useTimer } from '../../hooks/useTimer';
import type { ExerciseSet, WorkoutExercise, EffortRating } from '../../types';

interface ActiveWorkoutProps {
  workoutExercises: WorkoutExercise[];
  allSets: ExerciseSet[];
  onUpdateSet: (setId: number, updates: Partial<ExerciseSet>) => void;
  onCompleteSet: (setId: number) => void;
  onDeleteSet: (setId: number) => void;
  onAddSet: (workoutExerciseId: number) => void;
  onAddExercise: (exerciseId: number) => void;
  onRemoveExercise: (workoutExerciseId: number) => void;
  onReorderExercise: (workoutExerciseId: number, direction: 'up' | 'down') => void;
  onUpdateWorkoutExercise: (weId: number, updates: Partial<WorkoutExercise>) => void;
  onFinish: () => void;
  onCancel: () => void;
  workoutName: string;
  workoutNotes: string;
  onUpdateNotes: (notes: string) => void;
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
  onReorderExercise,
  onUpdateWorkoutExercise,
  onFinish,
  onCancel,
  workoutName,
  workoutNotes,
  onUpdateNotes,
}: ActiveWorkoutProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [incompleteSummary, setIncompleteSummary] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(!!workoutNotes);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const timer = useTimer(90);

  const handleNotesChange = (value: string) => {
    clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => onUpdateNotes(value), 500);
  };

  // Load exercises from DB for display
  const exerciseIds = workoutExercises.map(we => we.exerciseId);
  const exercises = useLiveQuery(
    () => db.exercises.where('id').anyOf(exerciseIds).toArray(),
    [exerciseIds.join(',')]
  ) ?? [];

  const completedSets = allSets.filter(s => s.completed).length;
  const totalSets = allSets.length;

  const handleFinish = () => {
    // Check for incomplete sets
    const issues: string[] = [];

    for (const we of workoutExercises) {
      const exercise = exercises.find(e => e.id === we.exerciseId);
      if (!exercise || exercise.isCardio) continue;

      const weSets = allSets.filter(s => s.workoutExerciseId === we.id);
      const incomplete = weSets.filter(s => !s.completed);
      const missingReps = weSets.filter(s => s.completed && (s.reps === null || s.reps === 0));

      if (incomplete.length > 0) {
        issues.push(`${exercise.name}: ${incomplete.length} set${incomplete.length > 1 ? 's' : ''} not checked off`);
      }
      if (missingReps.length > 0) {
        issues.push(`${exercise.name}: ${missingReps.length} set${missingReps.length > 1 ? 's' : ''} missing reps`);
      }
    }

    if (issues.length > 0) {
      setIncompleteSummary(issues);
      setShowIncompleteWarning(true);
    } else {
      onFinish();
    }
  };

  const handleUpdateEffort = (weId: number, rating: EffortRating) => {
    onUpdateWorkoutExercise(weId, { effortRating: rating });
  };

  return (
    <div className="pb-4">
      <RestTimer
        secondsLeft={timer.secondsLeft}
        progress={timer.progress}
        isRunning={timer.isRunning}
        onSkip={timer.skip}
      />

      {/* Spacer so content isn't hidden behind sticky timer */}
      {timer.isRunning && <div className="h-14" />}

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
      {workoutExercises.map((we, idx) => {
        const exercise = exercises.find(e => e.id === we.exerciseId);
        if (!exercise) return null;

        const isFirst = idx === 0;
        const isLast = idx === workoutExercises.length - 1;

        // Cardio exercises get a different card
        if (exercise.isCardio) {
          return (
            <CardioCard
              key={we.id}
              exercise={exercise}
              workoutExercise={we}
              onUpdate={(updates) => onUpdateWorkoutExercise(we.id!, updates)}
              onRemove={() => onRemoveExercise(we.id!)}
              onMoveUp={!isFirst ? () => onReorderExercise(we.id!, 'up') : undefined}
              onMoveDown={!isLast ? () => onReorderExercise(we.id!, 'down') : undefined}
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
            onMoveUp={!isFirst ? () => onReorderExercise(we.id!, 'up') : undefined}
            onMoveDown={!isLast ? () => onReorderExercise(we.id!, 'down') : undefined}
            onTimerStart={() => timer.start(90)}
            onUpdateEffort={(rating) => handleUpdateEffort(we.id!, rating)}
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

      {/* Workout notes */}
      {!showNotes ? (
        <button
          onClick={() => setShowNotes(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4"
        >
          <StickyNote size={16} />
          Add workout notes
        </button>
      ) : (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <StickyNote size={12} /> Notes
            </span>
            <button
              onClick={() => setShowNotes(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <textarea
            defaultValue={workoutNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="How did it feel? Anything to remember next time..."
            rows={2}
            className="w-full bg-surface rounded-lg p-3 text-sm text-white placeholder-gray-500 border border-gray-700 focus:border-brand-light focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:text-danger hover:border-danger transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleFinish}
          className="flex-1 py-3 rounded-xl bg-success text-white font-semibold hover:bg-success/90 transition-colors"
        >
          Finish Workout
        </button>
      </div>

      {/* Incomplete sets warning */}
      {showIncompleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowIncompleteWarning(false)} />
          <div className="relative bg-surface rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Incomplete Sets</h3>
            </div>
            <ul className="text-sm text-gray-400 mb-4 space-y-1">
              {incompleteSummary.map((issue, i) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowIncompleteWarning(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowIncompleteWarning(false); onFinish(); }}
                className="flex-1 py-2.5 rounded-lg bg-yellow-500 text-black font-medium"
              >
                Finish Anyway
              </button>
            </div>
          </div>
        </div>
      )}

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
