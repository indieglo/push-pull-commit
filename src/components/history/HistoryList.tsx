import { Calendar, ChevronRight } from 'lucide-react';
import type { Workout } from '../../types';

interface HistoryListProps {
  workouts: Workout[];
  onSelect: (workoutId: number) => void;
}

export function HistoryList({ workouts, onSelect }: HistoryListProps) {
  if (workouts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Calendar size={40} className="mx-auto mb-3 opacity-50" />
        <p>No completed workouts yet.</p>
        <p className="text-sm mt-1">Start your first workout to see it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workouts.map((workout) => (
        <button
          key={workout.id}
          onClick={() => onSelect(workout.id!)}
          className="w-full flex items-center gap-3 bg-surface rounded-xl p-4 hover:bg-surface-light transition-colors text-left"
        >
          <div className="flex-1">
            <div className="font-semibold text-white">{workout.name}</div>
            <div className="text-sm text-gray-400">
              {new Date(workout.date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            {workout.notes && (
              <div className="text-xs text-gray-500 mt-1 truncate">{workout.notes}</div>
            )}
          </div>
          <ChevronRight size={20} className="text-gray-500" />
        </button>
      ))}
    </div>
  );
}
