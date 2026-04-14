import { useState } from 'react';
import { Heart, Weight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { BloodPressureForm } from '../components/health/BloodPressureForm';
import { WeightForm } from '../components/health/WeightForm';
import { HealthHistory } from '../components/health/HealthHistory';

type ActiveForm = null | 'bp' | 'weight';

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Heart size={24} className="text-brand-light" />
        <h1 className="text-xl font-bold text-white">Health</h1>
      </div>

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
              Last: {lastBP.systolic}/{lastBP.diastolic}
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
              Last: {lastWeight.weight}kg
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
