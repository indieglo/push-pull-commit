import { useState } from 'react';
import { History } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { HistoryList } from '../components/history/HistoryList';
import { WorkoutDetail } from '../components/history/WorkoutDetail';

export function HistoryPage() {
  const { completedWorkouts } = useHistory();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId) {
    return (
      <WorkoutDetail
        workoutId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <History size={24} className="text-brand-light" />
        <h1 className="text-xl font-bold text-white">Workout History</h1>
      </div>
      <HistoryList
        workouts={completedWorkouts}
        onSelect={setSelectedId}
      />
    </div>
  );
}
