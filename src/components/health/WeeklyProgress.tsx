import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingDown, TrendingUp, Minus, Weight, Wine, Heart, Activity } from 'lucide-react';
import { db } from '../../db/database';

type Direction = 'down-good' | 'up-good';

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function formatDelta(delta: number, unit: string, decimals = 1): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(decimals)}${unit}`;
}

function deltaTone(delta: number, direction: Direction): 'good' | 'bad' | 'flat' {
  if (Math.abs(delta) < 0.05) return 'flat';
  const wantDown = direction === 'down-good';
  const isDown = delta < 0;
  return isDown === wantDown ? 'good' : 'bad';
}

export function WeeklyProgress() {
  const weights = useLiveQuery(() => db.weightLogs.toArray()) ?? [];
  const alcohol = useLiveQuery(() => db.alcoholLogs.toArray()) ?? [];
  const bp = useLiveQuery(() => db.bloodPressure.toArray()) ?? [];
  const fitness = useLiveQuery(() => db.fitnessDailyLogs.toArray()) ?? [];

  const thisWeekStart = daysAgoISO(6); // last 7 days including today
  const priorWeekStart = daysAgoISO(13);
  const priorWeekEnd = daysAgoISO(7);

  const inRange = <T extends { date: string }>(rows: T[], start: string, end: string) =>
    rows.filter(r => r.date >= start && r.date <= end);

  const todayISO = daysAgoISO(0);
  const weightsThis = inRange(weights, thisWeekStart, todayISO);
  const weightsPrior = inRange(weights, priorWeekStart, priorWeekEnd);
  const alcoholThis = inRange(alcohol, thisWeekStart, todayISO);
  const alcoholPrior = inRange(alcohol, priorWeekStart, priorWeekEnd);
  const bpThis = inRange(bp, thisWeekStart, todayISO);
  const bpPrior = inRange(bp, priorWeekStart, priorWeekEnd);
  const fitnessThis = inRange(fitness, thisWeekStart, todayISO);
  const fitnessPrior = inRange(fitness, priorWeekStart, priorWeekEnd);

  const weightAvgThis = avg(weightsThis.map(w => w.weight));
  const weightAvgPrior = avg(weightsPrior.map(w => w.weight));

  // Alcohol: count every day as 0 if no entry (implicit sober day)
  const alcoholSumThis = sum(alcoholThis.map(a => a.drinks));
  const alcoholSumPrior = sum(alcoholPrior.map(a => a.drinks));

  const bpSysThis = avg(bpThis.map(r => r.systolic));
  const bpSysPrior = avg(bpPrior.map(r => r.systolic));
  const bpDiaThis = avg(bpThis.map(r => r.diastolic));
  const bpDiaPrior = avg(bpPrior.map(r => r.diastolic));

  const stepsThis = avg(fitnessThis.map(f => f.steps).filter((v): v is number => v != null));
  const stepsPrior = avg(fitnessPrior.map(f => f.steps).filter((v): v is number => v != null));

  const hasAnyData =
    weights.length + alcohol.length + bp.length + fitness.length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="bg-surface rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">This week vs last week</h3>
        <span className="text-xs text-gray-500">7-day windows</span>
      </div>

      <div className="space-y-2">
        <Row
          icon={<Weight size={16} className="text-brand-light" />}
          label="Weight"
          thisValue={weightAvgThis}
          priorValue={weightAvgPrior}
          unit="kg"
          decimals={1}
          direction="down-good"
          thisCount={weightsThis.length}
          priorCount={weightsPrior.length}
        />

        <Row
          icon={<Wine size={16} className="text-brand-light" />}
          label="Alcohol"
          thisValue={alcoholThis.length > 0 ? alcoholSumThis : null}
          priorValue={alcoholPrior.length > 0 ? alcoholSumPrior : null}
          unit=" drinks"
          decimals={0}
          isSum
          sumUnit="wk"
          direction="down-good"
          thisCount={alcoholThis.length}
          priorCount={alcoholPrior.length}
        />

        <BPRow
          sysThis={bpSysThis}
          diaThis={bpDiaThis}
          sysPrior={bpSysPrior}
          diaPrior={bpDiaPrior}
          thisCount={bpThis.length}
          priorCount={bpPrior.length}
        />

        <Row
          icon={<Activity size={16} className="text-info" />}
          label="Steps"
          thisValue={stepsThis}
          priorValue={stepsPrior}
          unit=""
          decimals={0}
          direction="up-good"
          thisCount={fitnessThis.filter(f => f.steps != null).length}
          priorCount={fitnessPrior.filter(f => f.steps != null).length}
          formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
        />
      </div>
    </div>
  );
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  thisValue: number | null;
  priorValue: number | null;
  unit: string;
  decimals: number;
  direction: Direction;
  thisCount: number;
  priorCount: number;
  subLabel?: string;
  isSum?: boolean;
  sumUnit?: string;
  formatValue?: (v: number) => string;
};

function Row({
  icon, label, thisValue, priorValue, unit, decimals, direction,
  thisCount, priorCount, subLabel, isSum, sumUnit, formatValue,
}: RowProps) {
  // Need at least one data point in each window to show a comparison.
  const hasBoth = thisValue != null && priorValue != null;
  // Averages deserve >= 2 datapoints per window to reduce noise; sums are ok with 1+.
  const thinData = !isSum && (thisCount < 2 || priorCount < 2);

  const fmt = (v: number) => formatValue ? formatValue(v) : v.toFixed(decimals);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-700 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="text-sm text-white">{label}</div>
          {subLabel && <div className="text-[11px] text-gray-500">{subLabel}</div>}
        </div>
      </div>

      {!hasBoth ? (
        <div className="text-xs text-gray-500 text-right">
          {thisValue == null && priorValue == null
            ? 'No data yet'
            : 'Log more to see trend'}
        </div>
      ) : thinData ? (
        <div className="text-xs text-gray-500 text-right">Log more to see trend</div>
      ) : (
        <div className="flex items-center gap-2 text-right">
          <div className="text-sm font-mono text-white">
            {fmt(thisValue!)}
            {unit}
            {isSum && sumUnit ? <span className="text-gray-500">/{sumUnit}</span> : null}
          </div>
          <Delta
            delta={thisValue! - priorValue!}
            direction={direction}
            unit={unit}
            decimals={decimals}
            formatValue={formatValue}
          />
        </div>
      )}
    </div>
  );
}

function Delta({
  delta, direction, unit, decimals, formatValue,
}: {
  delta: number;
  direction: Direction;
  unit: string;
  decimals: number;
  formatValue?: (v: number) => string;
}) {
  const tone = deltaTone(delta, direction);
  const classes =
    tone === 'good' ? 'text-success' :
    tone === 'bad' ? 'text-danger' :
    'text-gray-500';

  const Icon = tone === 'flat' ? Minus : delta < 0 ? TrendingDown : TrendingUp;

  const display = formatValue
    ? `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${formatValue(Math.abs(delta))}`
    : formatDelta(delta, unit, decimals);

  return (
    <div className={`flex items-center gap-0.5 text-xs font-mono ${classes} w-20 justify-end`}>
      <Icon size={12} />
      <span>{display}</span>
    </div>
  );
}

// Blood pressure gets its own row so the paired systolic/diastolic value
// can be shown as "118/76 vs 122/78". Each number is colored independently
// based on its own week-over-week delta — a mixed result (sys down, dia up)
// reads as green/red so you can see both trends at a glance.
function BPRow({
  sysThis, diaThis, sysPrior, diaPrior, thisCount, priorCount,
}: {
  sysThis: number | null;
  diaThis: number | null;
  sysPrior: number | null;
  diaPrior: number | null;
  thisCount: number;
  priorCount: number;
}) {
  const hasBoth =
    sysThis != null && diaThis != null && sysPrior != null && diaPrior != null;
  const thinData = thisCount < 2 || priorCount < 2;

  const toneFor = (delta: number): string => {
    if (delta === 0) return 'text-white';
    return delta < 0 ? 'text-success' : 'text-danger';
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-700 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <Heart size={16} className="text-brand-light" />
        <div className="text-sm text-white">Blood Pressure</div>
      </div>

      {!hasBoth ? (
        <div className="text-xs text-gray-500 text-right">
          {sysThis == null && sysPrior == null ? 'No data yet' : 'Log more to see trend'}
        </div>
      ) : thinData ? (
        <div className="text-xs text-gray-500 text-right">Log more to see trend</div>
      ) : (() => {
        const sysNow = Math.round(sysThis!);
        const diaNow = Math.round(diaThis!);
        const sysWas = Math.round(sysPrior!);
        const diaWas = Math.round(diaPrior!);
        return (
          <div className="text-sm font-mono text-right">
            <span className={toneFor(sysNow - sysWas)}>{sysNow}</span>
            <span className="text-gray-500">/</span>
            <span className={toneFor(diaNow - diaWas)}>{diaNow}</span>
            <span className="text-gray-500"> vs {sysWas}/{diaWas}</span>
          </div>
        );
      })()}
    </div>
  );
}
