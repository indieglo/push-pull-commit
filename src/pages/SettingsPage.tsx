import { Settings, LogOut, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { syncAll } from '../lib/sync';
import { importCSVData } from '../db/csv-import';
import { db } from '../db/database';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live counts for local DB stats
  const dbStats = useLiveQuery(async () => {
    const [exercises, workouts, workoutExercises, sets, bpReadings, weightLogs] = await Promise.all([
      db.exercises.count(),
      db.workouts.count(),
      db.workoutExercises.count(),
      db.exerciseSets.count(),
      db.bloodPressure.count(),
      db.weightLogs.count(),
    ]);
    const [pendingWorkouts, pendingWEs, pendingSets, pendingBP, pendingWeight] = await Promise.all([
      db.workouts.where('syncStatus').equals('pending').count(),
      db.workoutExercises.where('syncStatus').equals('pending').count(),
      db.exerciseSets.where('syncStatus').equals('pending').count(),
      db.bloodPressure.where('syncStatus').equals('pending').count(),
      db.weightLogs.where('syncStatus').equals('pending').count(),
    ]);
    return {
      exercises, workouts, workoutExercises, sets, bpReadings, weightLogs,
      pending: pendingWorkouts + pendingWEs + pendingSets + pendingBP + pendingWeight,
    };
  }) ?? { exercises: 0, workouts: 0, workoutExercises: 0, sets: 0, bpReadings: 0, weightLogs: 0, pending: 0 };

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const csvText = await file.text();
      const result = await importCSVData(csvText);
      setImportResult(`Imported ${result.workouts} workouts with ${result.sets} sets from ${file.name}`);
    } catch (err) {
      setImportResult(`Import failed: ${err}`);
    }
    setImporting(false);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearData = async () => {
    // Check for unsynced data before clearing
    const pendingWorkouts = await db.workouts.where('syncStatus').equals('pending').count();
    const pendingSets = await db.exerciseSets.where('syncStatus').equals('pending').count();
    const pendingTotal = pendingWorkouts + pendingSets;

    let message = 'This will clear local data on this device. Your cloud data is not affected — it will sync back next time.';
    if (pendingTotal > 0) {
      message = `⚠️ You have unsynced data (${pendingWorkouts} workout${pendingWorkouts !== 1 ? 's' : ''}, ${pendingSets} set${pendingSets !== 1 ? 's' : ''}) that has NOT been backed up to the cloud yet.\n\nClearing now will PERMANENTLY lose this data.\n\nSync first to avoid data loss. Continue anyway?`;
    }

    if (!confirm(message)) return;

    localStorage.removeItem('activeWorkoutId');
    db.close();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('PushPullCommitDB');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
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
          {dbStats.pending > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
              <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
              <span className="text-xs text-yellow-400">
                {dbStats.pending} unsynced change{dbStats.pending !== 1 ? 's' : ''} — sync to back up
              </span>
            </div>
          )}
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-brand-light transition-colors mb-1 disabled:opacity-50"
        >
          <Upload size={18} />
          {importing ? 'Importing...' : 'Import Workout CSV'}
        </button>
        <p className="text-xs text-gray-500 mb-3">Import workout history from a CSV file. See README for format details.</p>

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

      {/* Local DB Stats */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Local Database</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Exercise Library', count: dbStats.exercises },
            { label: 'Workouts', count: dbStats.workouts },
            { label: 'Exercise Entries', count: dbStats.workoutExercises },
            { label: 'Sets Logged', count: dbStats.sets },
            { label: 'BP Readings', count: dbStats.bpReadings },
            { label: 'Weight Logs', count: dbStats.weightLogs },
          ].map(({ label, count }) => (
            <div key={label} className="flex justify-between text-sm px-2 py-1 rounded bg-background">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-mono">{count}</span>
            </div>
          ))}
        </div>
        {dbStats.pending > 0 && (
          <div className="mt-2 text-xs text-yellow-400">
            {dbStats.pending} pending sync
          </div>
        )}
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        Push, Pull, Commit v1.0
      </p>
    </div>
  );
}
