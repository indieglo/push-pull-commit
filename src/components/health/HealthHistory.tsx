import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Heart, Weight, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
// Types used implicitly through db operations

type Tab = 'bp' | 'weight';

function getBPColor(systolic: number, diastolic: number) {
  if (systolic < 120 && diastolic < 80) return 'text-success';
  if (systolic < 130 && diastolic < 80) return 'text-yellow-400';
  if (systolic < 140 || diastolic < 90) return 'text-orange-400';
  return 'text-danger';
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function HealthHistory() {
  const [tab, setTab] = useState<Tab>('bp');
  const [deleteId, setDeleteId] = useState<{ type: Tab; id: number } | null>(null);

  const bpReadings = useLiveQuery(
    () => db.bloodPressure.orderBy('date').reverse().limit(30).toArray()
  ) ?? [];

  const weightLogs = useLiveQuery(
    () => db.weightLogs.orderBy('date').reverse().limit(30).toArray()
  ) ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteId.type === 'bp') {
      await db.bloodPressure.delete(deleteId.id);
    } else {
      await db.weightLogs.delete(deleteId.id);
    }
    setDeleteId(null);
  };

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 mb-4">
        <button
          onClick={() => setTab('bp')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'bp' ? 'bg-brand/20 text-brand-light' : 'text-gray-400'
          }`}
        >
          <Heart size={14} /> BP ({bpReadings.length})
        </button>
        <button
          onClick={() => setTab('weight')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'weight' ? 'bg-brand/20 text-brand-light' : 'text-gray-400'
          }`}
        >
          <Weight size={14} /> Weight ({weightLogs.length})
        </button>
      </div>

      {/* BP History */}
      {tab === 'bp' && (
        <div className="space-y-2">
          {bpReadings.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No blood pressure readings yet</p>
          ) : (
            bpReadings.map((bp) => (
              <div key={bp.id} className="bg-surface rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-mono font-semibold ${getBPColor(bp.systolic, bp.diastolic)}`}>
                      {bp.systolic}/{bp.diastolic}
                    </span>
                    {bp.pulse && (
                      <span className="text-sm text-gray-400">{bp.pulse} bpm</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(bp.date)} at {bp.time}
                    {bp.notes && <span className="ml-2 text-gray-600">— {bp.notes}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId({ type: 'bp', id: bp.id! })}
                  className="p-1.5 text-gray-600 hover:text-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weight History */}
      {tab === 'weight' && (
        <div className="space-y-2">
          {weightLogs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No weight entries yet</p>
          ) : (
            weightLogs.map((wl, idx) => {
              const prev = weightLogs[idx + 1];
              const diff = prev ? wl.weight - prev.weight : null;
              return (
                <div key={wl.id} className="bg-surface rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-semibold text-white">
                        {wl.weight}kg
                      </span>
                      {diff !== null && (
                        <span className={`text-sm ${diff > 0 ? 'text-danger' : diff < 0 ? 'text-success' : 'text-gray-400'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                      {wl.fatPercent && (
                        <span className="text-sm text-gray-400">{wl.fatPercent}% fat</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(wl.date)}
                      {wl.source === 'withings' && <span className="ml-1 text-brand-light">(Withings)</span>}
                      {wl.notes && <span className="ml-2 text-gray-600">— {wl.notes}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId({ type: 'weight', id: wl.id! })}
                    className="p-1.5 text-gray-600 hover:text-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
          <div className="relative bg-surface rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Entry?</h3>
            <p className="text-gray-400 text-sm mb-4">This reading will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg bg-danger text-white font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
