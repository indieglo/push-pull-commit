import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchDailyFitness, getValidAccessToken } from '../_lib/google-health.js';
import { getSupabaseAdmin, verifyUserToken } from '../_lib/supabase-admin.js';

interface SyncResult {
  userId: string;
  inserted: number;
  updated: number;
  error?: string;
}

async function syncUser(userId: string, lookbackDays = 30): Promise<SyncResult> {
  try {
    const integration = await getValidAccessToken(userId);
    if (!integration) {
      return { userId, inserted: 0, updated: 0, error: 'not connected' };
    }

    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rowsByDate = await fetchDailyFitness(integration.access_token, sinceDate);

    if (rowsByDate.size === 0) {
      await markSynced(userId);
      return { userId, inserted: 0, updated: 0 };
    }

    const supabase = getSupabaseAdmin();
    const dates = Array.from(rowsByDate.keys());
    const { data: existing } = await supabase
      .from('fitness_daily_logs')
      .select('id, date, steps, resting_heart_rate, heart_rate_variability, sleep_minutes')
      .eq('user_id', userId)
      .eq('source', 'google_health')
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
        source: 'google_health' as const,
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

    await markSynced(userId);
    return { userId, inserted, updated };
  } catch (err) {
    return { userId, inserted: 0, updated: 0, error: (err as Error).message };
  }
}

async function markSynced(userId: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('user_integrations')
    .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', 'google_health');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization ?? '';

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('user_id')
        .eq('provider', 'google_health');

      const results: SyncResult[] = [];
      for (const row of integrations ?? []) {
        results.push(await syncUser(row.user_id));
      }
      return res.status(200).json({ ok: true, results });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const userId = await verifyUserToken(auth.slice(7));
  if (!userId) {
    return res.status(401).json({ error: 'invalid token' });
  }

  try {
    const result = await syncUser(userId);
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
