import { TrendingUp } from 'lucide-react';
import { WeeklyProgress } from '../components/health/WeeklyProgress';
import { FitnessSummary } from '../components/health/FitnessSummary';

export function TrendsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={24} className="text-brand-light" />
        <h1 className="text-xl font-bold text-white">Trends</h1>
      </div>

      <WeeklyProgress />
      <FitnessSummary />
    </div>
  );
}
