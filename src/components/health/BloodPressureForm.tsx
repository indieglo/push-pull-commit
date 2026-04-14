import { useState } from 'react';
import { Heart } from 'lucide-react';
import { db } from '../../db/database';

interface BloodPressureFormProps {
  onSave: () => void;
}

export function BloodPressureForm({ onSave }: BloodPressureFormProps) {
  const now = new Date();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (isNaN(sys) || isNaN(dia)) return;

    await db.bloodPressure.add({
      date,
      time,
      systolic: sys,
      diastolic: dia,
      pulse: pulse ? parseInt(pulse) : null,
      notes: notes || undefined,
      syncStatus: 'pending',
    });

    onSave();
  };

  const isValid = systolic && diastolic && parseInt(systolic) > 0 && parseInt(diastolic) > 0;

  // BP category indicator
  const getBPCategory = () => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (isNaN(sys) || isNaN(dia)) return null;
    if (sys < 120 && dia < 80) return { label: 'Normal', color: 'text-success' };
    if (sys < 130 && dia < 80) return { label: 'Elevated', color: 'text-yellow-400' };
    if (sys < 140 || dia < 90) return { label: 'High (Stage 1)', color: 'text-orange-400' };
    return { label: 'High (Stage 2)', color: 'text-danger' };
  };

  const category = getBPCategory();

  return (
    <div className="bg-surface rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Heart size={18} className="text-brand-light" />
        <h3 className="font-semibold text-white">Log Blood Pressure</h3>
      </div>

      {/* BP inputs */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Systolic</label>
          <input
            type="text"
            inputMode="numeric"
            value={systolic}
            onChange={(e) => /^\d*$/.test(e.target.value) && setSystolic(e.target.value)}
            placeholder="120"
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Diastolic</label>
          <input
            type="text"
            inputMode="numeric"
            value={diastolic}
            onChange={(e) => /^\d*$/.test(e.target.value) && setDiastolic(e.target.value)}
            placeholder="80"
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Pulse</label>
          <input
            type="text"
            inputMode="numeric"
            value={pulse}
            onChange={(e) => /^\d*$/.test(e.target.value) && setPulse(e.target.value)}
            placeholder="72"
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none"
          />
        </div>
      </div>

      {/* BP category */}
      {category && (
        <p className={`text-sm mb-3 ${category.color}`}>{category.label}</p>
      )}

      {/* Date/time */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-light focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-light focus:outline-none"
          />
        </div>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-light focus:outline-none resize-none mb-3"
      />

      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full py-2.5 rounded-lg bg-brand text-white font-medium disabled:opacity-40 transition-opacity"
      >
        Save Reading
      </button>
    </div>
  );
}
