import { Dumbbell, Play, Waves } from 'lucide-react';
import { useWorkout } from '../hooks/useWorkout';
import { useExercises } from '../hooks/useExercises';
import { ActiveWorkout } from '../components/workout/ActiveWorkout';
import { WORKOUT_TEMPLATES } from '../db/seed';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'Strength A': <Dumbbell size={20} />,
  'Strength B': <Dumbbell size={20} />,
  'Swimming': <Waves size={20} />,
};

export function WorkoutPage() {
  const {
    activeWorkout,
    activeWorkoutId,
    workoutExercises,
    allSets,
    startWorkout,
    addExerciseToWorkout,
    addSet,
    updateSet,
    updateWorkoutExercise,
    deleteSet,
    removeExercise,
    completeSet,
    finishWorkout,
    cancelWorkout,
  } = useWorkout();

  const { getExerciseByName } = useExercises();

  const handleStartTemplate = async (templateName: string) => {
    const template = WORKOUT_TEMPLATES.find(t => t.name === templateName);
    if (!template) return;

    const exerciseIds = template.exerciseNames
      .map(name => getExerciseByName(name)?.id)
      .filter((id): id is number => id !== undefined);

    await startWorkout(templateName, exerciseIds);
  };

  const handleStartBlank = async () => {
    await startWorkout('Custom Workout');
  };

  // Show active workout if one exists
  if (activeWorkoutId && activeWorkout) {
    return (
      <ActiveWorkout
        workoutExercises={workoutExercises}
        allSets={allSets}
        onUpdateSet={updateSet}
        onCompleteSet={completeSet}
        onDeleteSet={deleteSet}
        onAddSet={addSet}
        onAddExercise={addExerciseToWorkout}
        onRemoveExercise={removeExercise}
        onUpdateWorkoutExercise={updateWorkoutExercise}
        onFinish={finishWorkout}
        onCancel={cancelWorkout}
        workoutName={activeWorkout.name}
      />
    );
  }

  // Show start screen
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Dumbbell size={28} className="text-brand-light" />
        <h1 className="text-2xl font-bold text-white">Push, Pull, Commit</h1>
      </div>

      <p className="text-gray-400 mb-6">Choose a workout to get started.</p>

      {/* Quick-start templates */}
      <div className="space-y-3 mb-6">
        {WORKOUT_TEMPLATES.map((template) => (
          <button
            key={template.name}
            onClick={() => handleStartTemplate(template.name)}
            className="w-full flex items-center gap-4 bg-surface rounded-xl p-4 hover:bg-surface-light transition-colors text-left"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand/20 text-brand-light flex items-center justify-center">
              {TEMPLATE_ICONS[template.name] || <Dumbbell size={20} />}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">{template.name}</div>
              <div className="text-sm text-gray-400">
                {template.exerciseNames.join(' · ')}
              </div>
            </div>
            <Play size={20} className="text-gray-500" />
          </button>
        ))}
      </div>

      {/* Blank workout */}
      <button
        onClick={handleStartBlank}
        className="w-full py-3 rounded-xl border border-gray-600 text-gray-300 hover:border-brand-light hover:text-brand-light transition-colors"
      >
        Start Blank Workout
      </button>
    </div>
  );
}
