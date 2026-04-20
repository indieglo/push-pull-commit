import { useState } from 'react';
import { Heart, Weight, Wine, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { BloodPressureForm } from '../components/health/BloodPressureForm';
import { WeightForm } from '../components/health/WeightForm';
import { AlcoholForm } from '../components/health/AlcoholForm';
import { HealthHistory } from '../components/health/HealthHistory';
import { FitnessSummary } from '../components/health/FitnessSummary';
import { WeeklyProgress } from '../components/health/WeeklyProgress';

type ActiveForm = null | 'bp' | 'weight' | 'alcohol';

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
  const recentAlcohol = useLiveQuery(
    () => db.alcoholLogs.orderBy('date').reverse().limit(1).toArray()
  );

  const lastBP = recentBP?.[0];
  const lastWeight = recentWeight?.[0];
  const lastAlcohol = recentAlcohol?.[0];

  const bpDays = lastBP ? daysAgo(lastBP.date) : null;
  const weightDays = lastWeight ? daysAgo(lastWeight.date) : null;
  const alcoholDays = lastAlcohol ? daysAgo(lastAlcohol.date) : null;
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertCircle size={16} className="text-warning shrink-0" />
              <span className="text-sm text-warning">
                {bpDays === null ? 'No BP readings yet — log your first one!' : `Last BP reading was ${formatDaysAgo(bpDays)} — time for a check`}
              </span>
            </div>
          )}
          {weightOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertCircle size={16} className="text-warning shrink-0" />
              <span className="text-sm text-warning">
                {weightDays === null ? 'No weight entries yet — log your first one!' : `Last weigh-in was ${formatDaysAgo(weightDays)} — time to step on the scale`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Week-over-week motivation card */}
      <WeeklyProgress />

      {/* Fitness summary (from Google Health / future Oura) */}
      <FitnessSummary />

      {/* Quick-add buttons — sit above History so they're next to the
          readouts they feed into */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
            <span className="text-xs text-gray-500 text-center">
              {lastBP.systolic}/{lastBP.diastolic}
              <br />({formatDaysAgo(bpDays!)})
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
            <span className="text-xs text-gray-500 text-center">
              {lastWeight.weight}kg
              <br />({formatDaysAgo(weightDays!)})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveForm(activeForm === 'alcohol' ? null : 'alcohol')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
            activeForm === 'alcohol'
              ? 'bg-brand/20 border-brand-light text-brand-light'
              : 'bg-surface border-gray-700 text-gray-300 hover:border-brand-light'
          }`}
        >
          <Wine size={24} />
          <span className="text-sm font-medium">Alcohol</span>
          {lastAlcohol && (
            <span className="text-xs text-gray-500 text-center">
              {lastAlcohol.drinks} drink{lastAlcohol.drinks === 1 ? '' : 's'}
              <br />({formatDaysAgo(alcoholDays!)})
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
      {activeForm === 'alcohol' && (
        <AlcoholForm onSave={() => setActiveForm(null)} />
      )}

      {/* History */}
      <HealthHistory />
    </div>
  );
}
