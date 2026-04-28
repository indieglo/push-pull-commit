import crypto from 'crypto';
import { getSupabaseAdmin } from '../supabase-admin.js';
import type { FitnessProvider, TokenSet } from './types.js';

// State is base64url(userId|issuedAt) . hex(hmac). HMAC key is the provider's
// own client_secret — different for each provider, which is fine because the
// callback that verifies state already knows which provider it's handling.
export function signState(provider: FitnessProvider, userId: string): string {
  const { clientSecret } = provider.getEnv();
  const payload = `${userId}|${Date.now()}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', clientSecret).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

export function verifyState(provider: FitnessProvider, state: string, maxAgeMs = 10 * 60 * 1000): string | null {
  const { clientSecret } = provider.getEnv();
  const [encoded, sig] = state.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac('sha256', clientSecret).update(encoded).digest('hex');
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const [userId, issuedAtStr] = Buffer.from(encoded, 'base64url').toString().split('|');
  if (!userId || !issuedAtStr) return null;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > maxAgeMs) return null;
  return userId;
}

export interface ProviderIntegration {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
}

// Persist tokens after the OAuth callback exchanges the auth code.
export async function persistTokens(
  provider: FitnessProvider,
  userId: string,
  tokens: TokenSet,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    throw new Error('Provider did not return a refresh_token — revoke app access in your account and retry');
  }
  const { error } = await supabase
    .from('user_integrations')
    .upsert({
      user_id: userId,
      provider: provider.name,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });
  if (error) throw new Error(`DB error: ${error.message}`);
}

// Returns a usable access token, refreshing in place if it's within 5 minutes
// of expiry. Returns null if the user hasn't connected this provider.
export async function getValidAccessToken(
  provider: FitnessProvider,
  userId: string,
): Promise<ProviderIntegration | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider.name)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    const fresh = await provider.refreshTokens(data.refresh_token);
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    // Some providers rotate the refresh token on every refresh; keep the old one if not.
    const nextRefresh = fresh.refresh_token ?? data.refresh_token;
    await supabase
      .from('user_integrations')
      .update({
        access_token: fresh.access_token,
        refresh_token: nextRefresh,
        expires_at: newExpiresAt,
        scope: fresh.scope ?? data.scope,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', provider.name);
    return {
      user_id: userId,
      provider: provider.name,
      access_token: fresh.access_token,
      refresh_token: nextRefresh,
      expires_at: newExpiresAt,
      scope: fresh.scope ?? data.scope,
    };
  }

  return data as ProviderIntegration;
}

export async function markSynced(provider: FitnessProvider, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('user_integrations')
    .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', provider.name);
}
