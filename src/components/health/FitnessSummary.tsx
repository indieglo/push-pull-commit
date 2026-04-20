import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Heart, Moon, Zap } from 'lucide-react';
import { db } from '../../db/database';

function formatSleep(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatSteps(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDayShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
}

export function FitnessSummary() {
  const recent = useLiveQuery(
    () => db.fitnessDailyLogs.orderBy('date').reverse().limit(7).toArray()
  ) ?? [];

  if (recent.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-brand-light" />
          <h3 className="font-semibold text-white">Fitness</h3>
        </div>
        <p className="text-sm text-gray-500">
          No fitness data yet. Connect Google Health in Settings to pull steps, sleep, and resting heart rate.
        </p>
      </div>
    );
  }

  // Chronological (oldest → newest) for mini-chart
  const ordered = [...recent].reverse();
  const latest = recent[0];

  // 7-day averages for context
  const avg = (pick: (r: typeof recent[number]) => number | null | undefined) => {
    const vals = recent.map(pick).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgSteps = avg(r => r.steps);
  const avgRhr = avg(r => r.restingHeartRate);
  const avgSleep = avg(r => r.sleepMinutes);
  const avgHrv = avg(r => r.heartRateVariability);

  return (
    <div className="bg-surface rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-brand-light" />
          <h3 className="font-semibold text-white">Fitness</h3>
        </div>
        <span className="text-xs text-gray-500">7-day avg</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat
          icon={<Activity size={14} className="text-brand-light" />}
          label="Steps"
          value={formatSteps(latest.steps)}
          sub={avgSteps != null ? formatSteps(Math.round(avgSteps)) : '—'}
        />
        <Stat
          icon={<Heart size={14} className="text-brand-light" />}
          label="RHR"
          value={latest.restingHeartRate != null ? `${latest.restingHeartRate}` : '—'}
          sub={avgRhr != null ? `${Math.round(avgRhr)}` : '—'}
        />
        <Stat
          icon={<Moon size={14} className="text-brand-light" />}
          label="Sleep"
          value={formatSleep(latest.sleepMinutes)}
          sub={avgSleep != null ? formatSleep(Math.round(avgSleep)) : '—'}
        />
        <Stat
          icon={<Zap size={14} className="text-brand-light" />}
          label="HRV"
          value={latest.heartRateVariability != null ? latest.heartRateVariability.toFixed(0) : '—'}
          sub={avgHrv != null ? avgHrv.toFixed(0) : '—'}
        />
      </div>

      <div className="space-y-1">
        {ordered.map(r => (
          <div key={r.date} className="flex items-center gap-3 text-xs">
            <span className="w-10 text-gray-500">{formatDayShort(r.date)}</span>
            <span className="w-14 font-mono text-gray-300 text-right">{formatSteps(r.steps)}</span>
            <span className="w-10 font-mono text-gray-300 text-right">
              {r.restingHeartRate != null ? r.restingHeartRate : '—'}
            </span>
            <span className="w-14 font-mono text-gray-300 text-right">{formatSleep(r.sleepMinutes)}</span>
            <span className="w-10 font-mono text-gray-300 text-right">
              {r.heartRateVariability != null ? r.heartRateVariability.toFixed(0) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface-dark rounded-lg p-2">
      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="text-base font-mono font-semibold text-white leading-tight">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">avg {sub}</div>
    </div>
  );
}
