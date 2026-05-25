import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { useExercises } from '../../hooks/useExercises';

interface AddExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exerciseId: number) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
  mobility: 'Mobility',
  cardio: 'Cardio',
};

const CATEGORY_ORDER = ['push', 'pull', 'legs', 'core', 'mobility', 'cardio'];

export function AddExerciseSheet({ isOpen, onClose, onSelect }: AddExerciseSheetProps) {
  const { exercisesByCategory } = useExercises();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredCategories = CATEGORY_ORDER
    .filter(cat => exercisesByCategory[cat]?.length)
    .map(cat => ({
      category: cat,
      exercises: exercisesByCategory[cat].filter(ex =>
        ex.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(g => g.exercises.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-dark rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Exercise</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:border-brand-light focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1 pb-8">
          {filteredCategories.map(({ category, exercises }) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-surface-dark sticky top-0">
                {CATEGORY_LABELS[category]}
              </div>
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => {
                    onSelect(exercise.id!);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-surface transition-colors"
                >
                  <div>{exercise.name}</div>
                  {exercise.muscleGroup && (
                    <div className="text-xs text-gray-500">{exercise.muscleGroup}</div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
