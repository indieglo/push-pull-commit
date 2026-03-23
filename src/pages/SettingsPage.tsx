import { Settings, LogOut, Upload, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { syncAll } from '../lib/sync';
import { importCSVData } from '../db/csv-import';
import { db } from '../db/database';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await syncAll(user.id);
      alert('Sync complete!');
    } catch {
      alert('Sync failed. Check your connection.');
    }
    setSyncing(false);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importCSVData();
      setImportResult(`Imported ${result.workouts} workouts with ${result.sets} sets`);
    } catch (err) {
      setImportResult(`Import failed: ${err}`);
    }
    setImporting(false);
  };

  const handleClearData = async () => {
    if (!confirm('This will clear local data on this device. Your cloud data in Supabase is not affected — it will sync back next time you sign in. Continue?')) return;
    await db.exerciseSets.clear();
    await db.workoutExercises.clear();
    await db.workouts.clear();
    await db.exercises.clear();
    localStorage.removeItem('activeWorkoutId');
    window.location.reload();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-brand-light" />
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Account */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</h2>
        {user ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white">{user.email}</div>
              <div className="text-xs text-gray-400">Signed in with Google</div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-gray-400 hover:text-danger transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Not signed in. Data is stored locally only.</p>
        )}
      </div>

      {/* Sync */}
      {user && (
        <div className="bg-surface rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sync</h2>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full py-2.5 rounded-lg bg-brand text-white font-medium disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Data */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Data</h2>

        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-brand-light transition-colors mb-3 disabled:opacity-50"
        >
          <Upload size={18} />
          {importing ? 'Loading...' : 'Load Past Workouts'}
        </button>
        <p className="text-xs text-gray-500 mb-2">Loads your pre-app workout history so you can see previous weights and reps.</p>

        {importResult && (
          <p className="text-sm text-gray-400 mb-3">{importResult}</p>
        )}

        <button
          onClick={handleClearData}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-danger/30 text-danger/80 hover:text-danger hover:border-danger transition-colors"
        >
          <Trash2 size={18} />
          Clear Local Data
        </button>
        <p className="text-xs text-gray-500 mt-2">Clears data on this device only. Cloud data is not affected.</p>
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        Push, Pull, Commit v1.0
      </p>
    </div>
  );
}
