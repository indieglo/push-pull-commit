import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildAuthorizeUrl, signState } from '../_lib/withings.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = typeof req.query.user_id === 'string' ? req.query.user_id : null;
  if (!userId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    const state = signState(userId);
    const url = buildAuthorizeUrl(state);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, url);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
