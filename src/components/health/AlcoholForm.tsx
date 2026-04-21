import { useState } from 'react';
import { Wine } from 'lucide-react';
import { db } from '../../db/database';

interface AlcoholFormProps {
  onSave: () => void;
}

const QUICK_OPTIONS = [0, 1, 2, 3, 4];

export function AlcoholForm({ onSave }: AlcoholFormProps) {
  const now = new Date();
  const [drinks, setDrinks] = useState<string>('0');
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;
    const n = parseFloat(drinks);
    if (isNaN(n) || n < 0) return;

    setError(null);
    setSubmitting(true);
    try {
      await db.alcoholLogs.add({
        date,
        drinks: n,
        notes: notes || undefined,
        syncStatus: 'pending',
      });
      onSave();
    } catch (e) {
      console.error('Failed to save alcohol entry', e);
      const msg = e instanceof Error ? e.message : 'Unknown error saving entry';
      setError(`Save failed: ${msg}. Try reloading the app.`);
      setSubmitting(false);
    }
  };

  const isValid = drinks !== '' && !isNaN(parseFloat(drinks)) && parseFloat(drinks) >= 0;

  return (
    <div className="bg-surface rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Wine size={18} className="text-brand-light" />
        <h3 className="font-semibold text-white">Log Drinks</h3>
      </div>

      {/* Quick-pick chips */}
      <div className="flex gap-2 mb-3">
        {QUICK_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setDrinks(String(n))}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              parseFloat(drinks) === n
                ? 'bg-brand text-white'
                : 'bg-surface-dark text-gray-300 hover:bg-gray-700'
            }`}
          >
            {n === 4 ? '4+' : n}
          </button>
        ))}
      </div>

      {/* Precise input */}
      <div className="mb-3">
        <label className="text-xs text-gray-400 mb-1 block">Exact number (supports halves)</label>
        <input
          type="text"
          inputMode="decimal"
          value={drinks}
          onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setDrinks(e.target.value)}
          className="w-full bg-surface-dark border border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono text-white focus:border-brand-light focus:outline-none"
        />
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
        placeholder="Notes (optional) — e.g. beer, red wine, occasion"
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
        {submitting ? 'Saving…' : 'Save Entry'}
      </button>
    </div>
  );
}
