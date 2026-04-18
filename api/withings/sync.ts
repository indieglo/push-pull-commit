import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchMeasures, getValidAccessToken } from '../_lib/withings';
import { getSupabaseAdmin, verifyUserToken } from '../_lib/supabase-admin';

interface SyncResult {
  userId: string;
  inserted: number;
  updated: number;
  error?: string;
}

async function syncUser(userId: string, lookbackDays = 90): Promise<SyncResult> {
  try {
    const integration = await getValidAccessToken(userId);
    if (!integration) {
      return { userId, inserted: 0, updated: 0, error: 'not connected' };
    }

    const sinceUnix = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);
    const measures = await fetchMeasures(integration.access_token, sinceUnix);

    if (measures.length === 0) {
      await markSynced(userId);
      return { userId, inserted: 0, updated: 0 };
    }

    const supabase = getSupabaseAdmin();
    const grpids = measures.map(m => String(m.grpid));
    const { data: existing } = await supabase
      .from('weight_logs')
      .select('id, provider_ref, weight, fat_percent, muscle_mass')
      .eq('user_id', userId)
      .eq('source', 'withings')
      .in('provider_ref', grpids);

    const existingByRef = new Map((existing ?? []).map(row => [row.provider_ref, row]));

    let inserted = 0;
    let updated = 0;

    for (const m of measures) {
      const dateIso = new Date(m.date * 1000).toISOString().slice(0, 10);
      const ref = String(m.grpid);
      const row = {
        user_id: userId,
        date: dateIso,
        weight: m.weight,
        fat_percent: m.fatPercent ?? null,
        muscle_mass: m.muscleMass ?? null,
        source: 'withings' as const,
        provider_ref: ref,
      };

      const prior = existingByRef.get(ref);
      if (prior) {
        if (prior.weight !== row.weight || prior.fat_percent !== row.fat_percent || prior.muscle_mass !== row.muscle_mass) {
          await supabase.from('weight_logs').update(row).eq('id', prior.id);
          updated++;
        }
      } else {
        const { error } = await supabase.from('weight_logs').insert(row);
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
    .eq('provider', 'withings');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron trigger: Vercel sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization ?? '';

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('user_id')
        .eq('provider', 'withings');

      const results: SyncResult[] = [];
      for (const row of integrations ?? []) {
        results.push(await syncUser(row.user_id));
      }
      return res.status(200).json({ ok: true, results });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Manual trigger: client sends its Supabase access token as Bearer
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
