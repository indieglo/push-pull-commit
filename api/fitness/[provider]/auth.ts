import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../_lib/fitness/registry.js';
import { signState } from '../../_lib/fitness/oauth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const providerName = typeof req.query.provider === 'string' ? req.query.provider : '';
  const provider = getProvider(providerName);
  if (!provider) {
    return res.status(404).json({ error: `unknown provider: ${providerName}` });
  }

  const userId = typeof req.query.user_id === 'string' ? req.query.user_id : null;
  if (!userId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    const state = signState(provider, userId);
    const url = provider.buildAuthorizeUrl(state);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, url);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
