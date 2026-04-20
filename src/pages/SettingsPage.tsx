import { Settings, LogOut, Upload, Trash2, AlertTriangle, Wrench } from 'lucide-react';
import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { syncAll } from '../lib/sync';
import { importCSVData } from '../db/csv-import';
import { db } from '../db/database';
import { WithingsConnect } from '../components/settings/WithingsConnect';
import { GoogleHealthConnect } from '../components/settings/GoogleHealthConnect';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cheap counts — kept in a separate live query so a throw in the expensive
  // incomplete-detail loop can't wipe them back to 0s during sync churn.
  const dbStats = useLiveQuery(async () => {
    try {
      const [exercises, workouts, workoutExercises, sets, bpReadings, weightLogs, alcoholLogs] = await Promise.all([
        db.exercises.count(),
        db.workouts.count(),
        db.workoutExercises.count(),
        db.exerciseSets.count(),
        db.bloodPressure.count(),
        db.weightLogs.count(),
        db.alcoholLogs.count(),
      ]);
      const [pendingWorkouts, pendingWEs, pendingSets, pendingBP, pendingWeight, pendingAlcohol] = await Promise.all([
        db.workouts.where('syncStatus').equals('pending').count(),
        db.workoutExercises.where('syncStatus').equals('pending').count(),
        db.exerciseSets.where('syncStatus').equals('pending').count(),
        db.bloodPressure.where('syncStatus').equals('pending').count(),
        db.weightLogs.where('syncStatus').equals('pending').count(),
        db.alcoholLogs.where('syncStatus').equals('pending').count(),
      ]);
      return {
        exercises, workouts, workoutExercises, sets, bpReadings, weightLogs, alcoholLogs,
        pendingWorkouts, pendingWEs, pendingSets, pendingBP, pendingWeight, pendingAlcohol,
        pending: pendingWorkouts + pendingWEs + pendingSets + pendingBP + pendingWeight + pendingAlcohol,
      };
    } catch {
      return undefined; // keeps previous value rather than flashing fallback zeros
    }
  }) ?? {
    exercises: 0, workouts: 0, workoutExercises: 0, sets: 0, bpReadings: 0, weightLogs: 0, alcoholLogs: 0,
    pendingWorkouts: 0, pendingWEs: 0, pendingSets: 0, pendingBP: 0, pendingWeight: 0, pendingAlcohol: 0,
    pending: 0,
  };

  // Expensive per-incomplete-workout detail loop, isolated so it can't gate the counts.
  const incompleteDetails = useLiveQuery(async () => {
    try {
      const pendingWorkoutRows = await db.workouts.where('syncStatus').equals('pending').toArray();
      const incompleteRows = pendingWorkoutRows.filter(w => !w.completedAt);
      return await Promise.all(
        incompleteRows.map(async (w) => {
          const weRows = await db.workoutExercises.where('workoutId').equals(w.id!).toArray();
          let setCount = 0;
          for (const we of weRows) {
            setCount += await db.exerciseSets.where('workoutExerciseId').equals(we.id!).count();
          }
          return {
            id: w.id!,
            date: w.date,
            name: w.name ?? 'Untitled',
            startedAt: w.startedAt,
            exerciseCount: weRows.length,
            setCount,
          };
        })
      );
    } catch {
      return undefined;
    }
  }) ?? [];
  const incompleteWorkouts = incompleteDetails.length;

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const result = await syncAll(user.id);
      if (result.errors.length > 0) {
        alert(`Sync finished with ${result.errors.length} error(s):\n\n${result.errors.slice(0, 5).join('\n')}`);
      } else {
        alert('Sync complete!');
      }
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

  const handleDiscardIncomplete = async () => {
    const incomplete = await db.workouts.filter(w => !w.completedAt).toArray();
    if (incomplete.length === 0) {
      alert('No incomplete workouts to discard.');
      return;
    }

    if (!confirm(`Permanently delete ${incomplete.length} incomplete workout${incomplete.length !== 1 ? 's' : ''} and their exercises and sets? This matches how Cancel on an active workout should have behaved.`)) {
      return;
    }

    let deletedSets = 0;
    let deletedWEs = 0;
    for (const w of incomplete) {
      const weRows = await db.workoutExercises.where('workoutId').equals(w.id!).toArray();
      for (const we of weRows) {
        deletedSets += await db.exerciseSets.where('workoutExerciseId').equals(we.id!).count();
        await db.exerciseSets.where('workoutExerciseId').equals(we.id!).delete();
      }
      deletedWEs += weRows.length;
      await db.workoutExercises.where('workoutId').equals(w.id!).delete();
      await db.workouts.delete(w.id!);
    }

    const activeId = localStorage.getItem('activeWorkoutId');
    if (activeId && incomplete.some(w => String(w.id) === activeId)) {
      localStorage.removeItem('activeWorkoutId');
    }

    alert(`Discarded ${incomplete.length} workout${incomplete.length !== 1 ? 's' : ''}, ${deletedWEs} exercise entries, ${deletedSets} sets.`);
  };

  const handleKeepIncomplete = async () => {
    const incomplete = await db.workouts.filter(w => !w.completedAt).toArray();
    if (incomplete.length === 0) return;
    if (!confirm(`Mark ${incomplete.length} incomplete workout${incomplete.length !== 1 ? 's' : ''} as completed so they can sync? Only do this if these are real workouts you forgot to finish.`)) {
      return;
    }
    for (const w of incomplete) {
      await db.workouts.update(w.id!, {
        completedAt: w.startedAt ?? new Date().toISOString(),
        syncStatus: 'pending',
      });
    }
    alert(`Marked ${incomplete.length} as completed. Hit Sync Now to push.`);
  };

  const discardOne = async (workoutId: number) => {
    if (!confirm('Discard this workout and all its sets?')) return;
    const weRows = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
    for (const we of weRows) {
      await db.exerciseSets.where('workoutExerciseId').equals(we.id!).delete();
    }
    await db.workoutExercises.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
    const activeId = localStorage.getItem('activeWorkoutId');
    if (activeId === String(workoutId)) localStorage.removeItem('activeWorkoutId');
  };

  const keepOne = async (workoutId: number) => {
    const w = await db.workouts.get(workoutId);
    if (!w) return;
    await db.workouts.update(workoutId, {
      completedAt: w.startedAt ?? new Date().toISOString(),
      syncStatus: 'pending',
    });
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

      {/* Integrations */}
      {user && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Integrations</h2>
          <WithingsConnect />
          <GoogleHealthConnect />
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
            { label: 'Alcohol Logs', count: dbStats.alcoholLogs },
          ].map(({ label, count }) => (
            <div key={label} className="flex justify-between text-sm px-2 py-1 rounded bg-background">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-mono">{count}</span>
            </div>
          ))}
        </div>
        {dbStats.pending > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-xs text-yellow-400 space-y-0.5">
            <div className="font-semibold">{dbStats.pending} pending sync</div>
            {dbStats.pendingWorkouts > 0 && (
              <div>• {dbStats.pendingWorkouts} workout{dbStats.pendingWorkouts !== 1 ? 's' : ''}{incompleteWorkouts > 0 ? ` (${incompleteWorkouts} incomplete)` : ''}</div>
            )}
            {dbStats.pendingWEs > 0 && <div>• {dbStats.pendingWEs} exercise entries</div>}
            {dbStats.pendingSets > 0 && <div>• {dbStats.pendingSets} sets</div>}
            {dbStats.pendingBP > 0 && <div>• {dbStats.pendingBP} BP readings</div>}
            {dbStats.pendingWeight > 0 && <div>• {dbStats.pendingWeight} weight logs</div>}
            {dbStats.pendingAlcohol > 0 && <div>• {dbStats.pendingAlcohol} alcohol logs</div>}
            {incompleteWorkouts > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-gray-400">
                  {incompleteWorkouts} incomplete workout{incompleteWorkouts !== 1 ? 's are' : ' is'} blocking the sync. Incomplete workouts should have been discarded when cancelled — these are likely leftovers.
                </div>
                <div className="bg-background rounded-lg p-2 space-y-2 max-h-64 overflow-y-auto">
                  {incompleteDetails.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-gray-200 text-sm truncate">{w.date} — {w.name}</div>
                        <div className="text-gray-500 text-[11px] font-mono">{w.exerciseCount} exercises, {w.setCount} sets</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => keepOne(w.id)}
                          className="px-2 py-1 rounded border border-gray-600 text-gray-300 text-[11px] hover:text-white hover:border-brand-light transition-colors"
                          title="Mark this workout completed so it syncs"
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => discardOne(w.id)}
                          className="px-2 py-1 rounded border border-danger/30 text-danger/80 text-[11px] hover:text-danger hover:border-danger transition-colors"
                          title="Permanently delete this workout and its data"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleDiscardIncomplete}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-danger/20 text-danger font-medium hover:bg-danger/30 transition-colors"
                >
                  <Trash2 size={14} />
                  Discard All Incomplete
                </button>
                <button
                  onClick={handleKeepIncomplete}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-gray-200 transition-colors text-xs"
                >
                  <Wrench size={12} />
                  Keep and Mark Completed
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        Push, Pull, Commit v1.0
      </p>
    </div>
  );
}
