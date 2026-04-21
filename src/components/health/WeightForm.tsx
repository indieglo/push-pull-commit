import { useState } from 'react';
import { Weight } from 'lucide-react';
import { db } from '../../db/database';

interface WeightFormProps {
  onSave: () => void;
}

export function WeightForm({ onSave }: WeightFormProps) {
  const now = new Date();
  const [weight, setWeight] = useState('');
  const [fatPercent, setFatPercent] = useState('');
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;

    const fat = fatPercent ? parseFloat(fatPercent) : null;

    setError(null);
    setSubmitting(true);
    try {
      await db.weightLogs.add({
        date,
        weight: w,
        fatPercent: fat,
        source: 'manual',
        notes: notes || undefined,
        syncStatus: 'pending',
      });
      onSave();
    } catch (e) {
      console.error('Failed to save weight entry', e);
      const msg = e instanceof Error ? e.message : 'Unknown error saving weight';
      setError(`Save failed: ${msg}. Try reloading the app.`);
      setSubmitting(false);
    }
  };

  const isValid = weight && parseFloat(weight) > 0;

  return (
    <div className="bg-surface rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Weight size={18} className="text-brand-light" />
        <h3 className="font-semibold text-white">Log Weight</h3>
      </div>

      {/* Weight + body fat */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Weight (kg)</label>
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setWeight(e.target.value)}
            placeholder="80.0"
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Body Fat %</label>
          <input
            type="text"
            inputMode="decimal"
            value={fatPercent}
            onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setFatPercent(e.target.value)}
            placeholder="optional"
            className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none"
          />
        </div>
      </div>

      {/* Date */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-light focus:outline-none"
        />
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-light focus:outline-none resize-none mb-3"
      />

      {error && (
        <div className="mb-3 p-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full py-2.5 rounded-lg bg-brand text-white font-medium disabled:opacity-40 transition-opacity"
      >
        {submitting ? 'Saving…' : 'Save Weight'}
      </button>
    </div>
  );
}
