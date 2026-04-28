import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from '../../_lib/fitness/registry.js';
import { verifyState, persistTokens } from '../../_lib/fitness/oauth.js';

function redirectToSettings(res: VercelResponse, providerName: string, status: 'success' | 'error', message?: string) {
  const params = new URLSearchParams({ provider: providerName, status });
  if (message) params.set('message', message);
  return res.redirect(302, `/settings?${params.toString()}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const providerName = typeof req.query.provider === 'string' ? req.query.provider : '';
  const provider = getProvider(providerName);
  if (!provider) {
    return res.status(404).json({ error: `unknown provider: ${providerName}` });
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const errorParam = typeof req.query.error === 'string' ? req.query.error : null;

  if (errorParam) {
    return redirectToSettings(res, providerName, 'error', errorParam);
  }

  if (!code || !state) {
    return redirectToSettings(res, providerName, 'error', 'Missing code or state');
  }

  const userId = verifyState(provider, state);
  if (!userId) {
    return redirectToSettings(res, providerName, 'error', 'Invalid or expired state');
  }

  try {
    const tokens = await provider.exchangeCodeForTokens(code);
    await persistTokens(provider, userId, tokens);
    return redirectToSettings(res, providerName, 'success');
  } catch (err) {
    return redirectToSettings(res, providerName, 'error', (err as Error).message);
  }
}
