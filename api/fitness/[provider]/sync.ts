import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, verifyUserToken } from '../../_lib/supabase-admin.js';
import { getProvider } from '../../_lib/fitness/registry.js';
import { getValidAccessToken, markSynced } from '../../_lib/fitness/oauth.js';
import type { FitnessProvider } from '../../_lib/fitness/types.js';

interface SyncResult {
  userId: string;
  provider: string;
  inserted: number;
  updated: number;
  error?: string;
}

async function syncUser(provider: FitnessProvider, userId: string, lookbackDays = 30): Promise<SyncResult> {
  try {
    const integration = await getValidAccessToken(provider, userId);
    if (!integration) {
      return { userId, provider: provider.name, inserted: 0, updated: 0, error: 'not connected' };
    }

    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rowsByDate = await provider.fetchDailyFitness(integration.access_token, sinceDate);

    if (rowsByDate.size === 0) {
      await markSynced(provider, userId);
      return { userId, provider: provider.name, inserted: 0, updated: 0 };
    }

    const supabase = getSupabaseAdmin();
    const dates = Array.from(rowsByDate.keys());
    const { data: existing } = await supabase
      .from('fitness_daily_logs')
      .select('id, date, steps, resting_heart_rate, heart_rate_variability, sleep_minutes')
      .eq('user_id', userId)
      .eq('source', provider.name)
      .in('date', dates);

    const existingByDate = new Map((existing ?? []).map(row => [row.date, row]));

    let inserted = 0;
    let updated = 0;

    for (const [date, r] of rowsByDate) {
      const row = {
        user_id: userId,
        date,
        steps: r.steps ?? null,
        resting_heart_rate: r.restingHeartRate ?? null,
        heart_rate_variability: r.heartRateVariability ?? null,
        sleep_minutes: r.sleepMinutes ?? null,
        source: provider.name,
        updated_at: new Date().toISOString(),
      };

      const prior = existingByDate.get(date);
      if (prior) {
        if (
          prior.steps !== row.steps ||
          prior.resting_heart_rate !== row.resting_heart_rate ||
          prior.heart_rate_variability !== row.heart_rate_variability ||
          prior.sleep_minutes !== row.sleep_minutes
        ) {
          await supabase.from('fitness_daily_logs').update(row).eq('id', prior.id);
          updated++;
        }
      } else {
        const { error } = await supabase.from('fitness_daily_logs').insert(row);
        if (!error) inserted++;
      }
    }

    await markSynced(provider, userId);
    return { userId, provider: provider.name, inserted, updated };
  } catch (err) {
    return { userId, provider: provider.name, inserted: 0, updated: 0, error: (err as Error).message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const providerName = typeof req.query.provider === 'string' ? req.query.provider : '';
  const provider = getProvider(providerName);
  if (!provider) {
    return res.status(404).json({ error: `unknown provider: ${providerName}` });
  }

  // Cron trigger: Vercel sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization ?? '';

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('user_id')
        .eq('provider', provider.name);

      const results: SyncResult[] = [];
      for (const row of integrations ?? []) {
        results.push(await syncUser(provider, row.user_id));
      }
      return res.status(200).json({ ok: true, results });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Manual trigger from the client
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const userId = await verifyUserToken(auth.slice(7));
  if (!userId) {
    return res.status(401).json({ error: 'invalid token' });
  }

  try {
    const result = await syncUser(provider, userId);
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
