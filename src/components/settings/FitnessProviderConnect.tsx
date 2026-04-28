import { useEffect, useState } from 'react';
import { Activity, Check, AlertCircle, RefreshCw, Link2Off } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export interface FitnessProviderConfig {
  name: string;        // e.g. 'fitbit'
  displayName: string; // e.g. 'Fitbit'
  description: string; // shown when not connected
}

interface IntegrationRow {
  provider: string;
  connected_at: string;
  last_sync_at: string | null;
  scope: string | null;
}

async function getAuthHeaders(): Promise<HeadersInit | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function formatAgo(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  config: FitnessProviderConfig;
}

export function FitnessProviderConnect({ config }: Props) {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<IntegrationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadIntegration = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_integrations')
      .select('provider, connected_at, last_sync_at, scope')
      .eq('user_id', user.id)
      .eq('provider', config.name)
      .maybeSingle();
    setIntegration(data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadIntegration();
    // The OAuth callback redirects back with ?provider=<name>&status=success|error
    const params = new URLSearchParams(window.location.search);
    if (params.get('provider') === config.name) {
      const status = params.get('status');
      if (status === 'success') {
        setMessage({ type: 'success', text: `${config.displayName} connected!` });
      } else if (status === 'error') {
        setMessage({ type: 'error', text: params.get('message') || 'Connection failed' });
      }
      // Clear the query so reload doesn't re-show the message
      const url = new URL(window.location.href);
      url.searchParams.delete('provider');
      url.searchParams.delete('status');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams}` : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, config.name]);

  const handleConnect = () => {
    if (!user) return;
    window.location.href = `/api/fitness/${config.name}/auth?user_id=${encodeURIComponent(user.id)}`;
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setMessage(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not signed in');
      const res = await fetch(`/api/fitness/${config.name}/sync`, { method: 'POST', headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      const { inserted, updated, error } = json.result || {};
      if (error) throw new Error(error);
      setMessage({
        type: 'success',
        text: `Synced: ${inserted ?? 0} new, ${updated ?? 0} updated`,
      });
      await loadIntegration();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if (!confirm(`Disconnect ${config.displayName}? Synced fitness data will remain, but new data will stop syncing.`)) return;
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not signed in');
      const res = await fetch(`/api/fitness/${config.name}/disconnect`, { method: 'POST', headers });
      if (!res.ok) throw new Error('Disconnect failed');
      setIntegration(null);
      setMessage({ type: 'success', text: 'Disconnected' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  if (!user) return null;

  return (
    <div className="bg-surface rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
            <Activity size={20} className="text-brand-light" />
          </div>
          <div>
            <div className="text-white font-medium">{config.displayName}</div>
            <div className="text-xs text-gray-500">
              {loading ? 'Loading...' : integration
                ? `Connected • last sync ${formatAgo(integration.last_sync_at)}`
                : config.description}
            </div>
          </div>
        </div>
        {integration ? (
          <div className="flex items-center gap-1 text-success text-xs">
            <Check size={14} /> Connected
          </div>
        ) : null}
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-2 my-2 rounded-lg text-xs ${
          message.type === 'success'
            ? 'bg-success/10 border border-success/20 text-success'
            : 'bg-danger/10 border border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {!integration ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand text-white font-medium disabled:opacity-50 mt-2"
        >
          Connect {config.displayName}
        </button>
      ) : (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-brand-light transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 py-2 px-3 rounded-lg border border-danger/30 text-danger/80 hover:text-danger hover:border-danger transition-colors"
          >
            <Link2Off size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// Single source of truth for which providers ship in the UI. Add a new entry
// here when you add a provider on the API side.
export const FITNESS_PROVIDERS: FitnessProviderConfig[] = [
  {
    name: 'fitbit',
    displayName: 'Fitbit',
    description: 'Pull steps, sleep, resting HR, and HRV from your Fitbit account',
  },
];
