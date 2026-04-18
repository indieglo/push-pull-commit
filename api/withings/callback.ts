import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeCodeForTokens, verifyState } from '../_lib/withings.js';
import { getSupabaseAdmin } from '../_lib/supabase-admin.js';

function redirectToSettings(res: VercelResponse, status: 'success' | 'error', message?: string) {
  const params = new URLSearchParams({ withings: status });
  if (message) params.set('message', message);
  return res.redirect(302, `/settings?${params.toString()}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;

  // Withings ping during app registration — no code, no state. Respond 200 so the portal's "Test" passes.
  if (!code && !state) {
    return res.status(200).json({ ok: true, message: 'Withings callback endpoint is live.' });
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
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'withings',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        provider_user_id: String(tokens.userid),
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
