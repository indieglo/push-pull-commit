import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase-admin';

const WITHINGS_AUTHORIZE_URL = 'https://account.withings.com/oauth2_user/authorize2';
const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';
const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';

// Weight-only scope for now; add heart_rate / sleep later if the user owns compatible Withings devices
export const WITHINGS_SCOPE = 'user.metrics';

export function getEnv() {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;
  const redirectUri = process.env.WITHINGS_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Withings credentials not configured');
  }
  return { clientId, clientSecret, redirectUri };
}

// Sign state with client_secret to prevent CSRF. Format: base64url(userId|issuedAt).hex(hmac)
export function signState(userId: string): string {
  const { clientSecret } = getEnv();
  const payload = `${userId}|${Date.now()}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', clientSecret).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

export function verifyState(state: string, maxAgeMs = 10 * 60 * 1000): string | null {
  const { clientSecret } = getEnv();
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

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getEnv();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: WITHINGS_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${WITHINGS_AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  userid: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// Withings wraps responses as { status, body }. Throws if status != 0.
async function withingsPost(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(WITHINGS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json() as { status: number; body?: TokenResponse; error?: string };
  if (json.status !== 0 || !json.body) {
    throw new Error(`Withings token error: status=${json.status} ${json.error ?? ''}`);
  }
  return json.body;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getEnv();
  return withingsPost(new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }));
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getEnv();
  return withingsPost(new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }));
}

export interface WithingsIntegration {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  provider_user_id: string | null;
}

// Get a valid access token for a user, refreshing if needed
export async function getValidAccessToken(userId: string): Promise<WithingsIntegration | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'withings')
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  // Refresh 5 minutes before expiry
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    const fresh = await refreshTokens(data.refresh_token);
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    await supabase
      .from('user_integrations')
      .update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: newExpiresAt,
        scope: fresh.scope,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'withings');
    return {
      user_id: userId,
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: newExpiresAt,
      provider_user_id: data.provider_user_id,
    };
  }

  return data as WithingsIntegration;
}

// Withings measure types:
// 1 = Weight (kg), 6 = Fat Ratio (%), 76 = Muscle Mass (kg), 88 = Bone Mass (kg)
const MEASURE_WEIGHT = 1;
const MEASURE_FAT_RATIO = 6;
const MEASURE_MUSCLE_MASS = 76;

export interface WithingsMeasure {
  grpid: number;
  date: number; // unix seconds
  weight?: number; // kg
  fatPercent?: number;
  muscleMass?: number;
}

function decodeMeasure(raw: { value: number; unit: number; type: number }): number {
  return raw.value * Math.pow(10, raw.unit);
}

export async function fetchMeasures(accessToken: string, sinceUnix?: number): Promise<WithingsMeasure[]> {
  const body = new URLSearchParams({
    action: 'getmeas',
    meastypes: [MEASURE_WEIGHT, MEASURE_FAT_RATIO, MEASURE_MUSCLE_MASS].join(','),
    category: '1', // real measurements, not user-declared goals
  });
  if (sinceUnix) body.set('lastupdate', String(sinceUnix));

  const res = await fetch(WITHINGS_MEASURE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const json = await res.json() as {
    status: number;
    body?: {
      measuregrps?: Array<{
        grpid: number;
        date: number;
        measures: Array<{ value: number; unit: number; type: number }>;
      }>;
    };
    error?: string;
  };

  if (json.status !== 0) {
    throw new Error(`Withings measure error: status=${json.status} ${json.error ?? ''}`);
  }

  const groups = json.body?.measuregrps ?? [];
  return groups.map(g => {
    const result: WithingsMeasure = { grpid: g.grpid, date: g.date };
    for (const m of g.measures) {
      const value = decodeMeasure(m);
      if (m.type === MEASURE_WEIGHT) result.weight = value;
      else if (m.type === MEASURE_FAT_RATIO) result.fatPercent = value;
      else if (m.type === MEASURE_MUSCLE_MASS) result.muscleMass = value;
    }
    return result;
  }).filter(m => m.weight !== undefined);
}
