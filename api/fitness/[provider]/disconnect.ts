import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, verifyUserToken } from '../../_lib/supabase-admin.js';
import { getProvider } from '../../_lib/fitness/registry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const providerName = typeof req.query.provider === 'string' ? req.query.provider : '';
  const provider = getProvider(providerName);
  if (!provider) {
    return res.status(404).json({ error: `unknown provider: ${providerName}` });
  }

  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const userId = await verifyUserToken(auth.slice(7));
  if (!userId) {
    return res.status(401).json({ error: 'invalid token' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider.name);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
