import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCodeForTokens, verifyState } from '../_lib/google-health.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

function redirectToSettings(res: VercelResponse, status: 'success' | 'error', message?: string) {
  const params = new URLSearchParams({ google_health: status });
  if (message) params.set('message', message);
  return res.redirect(302, `/settings?${params.toString()}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const errorParam = typeof req.query.error === 'string' ? req.query.error : null;

  if (errorParam) {
    return redirectToSettings(res, 'error', errorParam);
  }

  if (!code || !state) {
    return redirectToSettings(res, 'error', 'Missing code or state');
  }

  const userId = verifyState(state);
  if (!userId) {
    return redirectToSettings(res, 'error', 'Invalid or expired state');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return redirectToSettings(res, 'error', 'No refresh token returned — revoke app access in Google Account and retry');
    }
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'google_health',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (error) {
      return redirectToSettings(res, 'error', `DB error: ${error.message}`);
    }

    return redirectToSettings(res, 'success');
  } catch (err) {
    return redirectToSettings(res, 'error', (err as Error).message);
  }
}
