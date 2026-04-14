import { useState } from 'react';
import { Heart, Weight, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { BloodPressureForm } from '../components/health/BloodPressureForm';
import { WeightForm } from '../components/health/WeightForm';
import { HealthHistory } from '../components/health/HealthHistory';

type ActiveForm = null | 'bp' | 'weight';

function daysAgo(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function HealthPage() {
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const recentBP = useLiveQuery(
    () => db.bloodPressure.orderBy('date').reverse().limit(1).toArray()
  );
  const recentWeight = useLiveQuery(
    () => db.weightLogs.orderBy('date').reverse().limit(1).toArray()
  );

  const lastBP = recentBP?.[0];
  const lastWeight = recentWeight?.[0];

  const bpDays = lastBP ? daysAgo(lastBP.date) : null;
  const weightDays = lastWeight ? daysAgo(lastWeight.date) : null;
  const bpOverdue = bpDays === null || bpDays >= 4; // nudge if no reading in 4+ days
  const weightOverdue = weightDays === null || weightDays >= 8; // nudge if no reading in 8+ days

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Heart size={24} className="text-brand-light" />
        <h1 className="text-xl font-bold text-white">Health</h1>
      </div>

      {/* Nudges */}
      {(bpOverdue || weightOverdue) && (
        <div className="space-y-2 mb-4">
          {bpOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
              <AlertCircle size={16} className="text-yellow-400 shrink-0" />
              <span className="text-sm text-yellow-400">
                {bpDays === null ? 'No BP readings yet — log your first one!' : `Last BP reading was ${formatDaysAgo(bpDays)} — time for a check`}
              </span>
            </div>
          )}
          {weightOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
              <AlertCircle size={16} className="text-yellow-400 shrink-0" />
              <span className="text-sm text-yellow-400">
                {weightDays === null ? 'No weight entries yet — log your first one!' : `Last weigh-in was ${formatDaysAgo(weightDays)} — time to step on the scale`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick-add buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setActiveForm(activeForm === 'bp' ? null : 'bp')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
            activeForm === 'bp'
              ? 'bg-brand/20 border-brand-light text-brand-light'
              : 'bg-surface border-gray-700 text-gray-300 hover:border-brand-light'
          }`}
        >
          <Heart size={24} />
          <span className="text-sm font-medium">Blood Pressure</span>
          {lastBP && (
            <span className="text-xs text-gray-500">
              Last: {lastBP.systolic}/{lastBP.diastolic} ({formatDaysAgo(bpDays!)})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveForm(activeForm === 'weight' ? null : 'weight')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
            activeForm === 'weight'
              ? 'bg-brand/20 border-brand-light text-brand-light'
              : 'bg-surface border-gray-700 text-gray-300 hover:border-brand-light'
          }`}
        >
          <Weight size={24} />
          <span className="text-sm font-medium">Weight</span>
          {lastWeight && (
            <span className="text-xs text-gray-500">
              Last: {lastWeight.weight}kg ({formatDaysAgo(weightDays!)})
            </span>
          )}
        </button>
      </div>

      {/* Active form */}
      {activeForm === 'bp' && (
        <BloodPressureForm onSave={() => setActiveForm(null)} />
      )}
      {activeForm === 'weight' && (
        <WeightForm onSave={() => setActiveForm(null)} />
      )}

      {/* History */}
      <HealthHistory />
    </div>
  );
}
