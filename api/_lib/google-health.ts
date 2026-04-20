import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase-admin.js';

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_HEALTH_API_BASE = 'https://health.googleapis.com/v4';

export function getEnv() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
  const scopes = process.env.GOOGLE_HEALTH_SCOPES;
  if (!clientId || !clientSecret || !redirectUri || !scopes) {
    throw new Error('Google Health credentials not configured');
  }
  return { clientId, clientSecret, redirectUri, scopes };
}

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
  const { clientId, redirectUri, scopes } = getEnv();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

async function googlePost(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json() as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google token error: ${json.error ?? res.status} ${json.error_description ?? ''}`);
  }
  return json;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getEnv();
  return googlePost(new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }));
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getEnv();
  return googlePost(new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }));
}

export interface GoogleHealthIntegration {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
}

export async function getValidAccessToken(userId: string): Promise<GoogleHealthIntegration | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_health')
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    const fresh = await refreshTokens(data.refresh_token);
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    // Google may or may not return a new refresh_token; keep the old one if absent
    const nextRefresh = fresh.refresh_token ?? data.refresh_token;
    await supabase
      .from('user_integrations')
      .update({
        access_token: fresh.access_token,
        refresh_token: nextRefresh,
        expires_at: newExpiresAt,
        scope: fresh.scope,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google_health');
    return {
      user_id: userId,
      access_token: fresh.access_token,
      refresh_token: nextRefresh,
      expires_at: newExpiresAt,
      scope: fresh.scope,
    };
  }

  return data as GoogleHealthIntegration;
}

// ---- Data fetch helpers ---------------------------------------------------

interface DataPointsResponse<T> {
  dataPoints?: T[];
  nextPageToken?: string;
}

async function listDataPoints<T>(
  accessToken: string,
  dataType: string,
  filter: string,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ filter, pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/${dataType}/dataPoints?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Health ${dataType} error: ${res.status} ${text}`);
    }
    const json = await res.json() as DataPointsResponse<T>;
    if (json.dataPoints) all.push(...json.dataPoints);
    pageToken = json.nextPageToken;
  } while (pageToken);
  return all;
}

export interface DailyFitnessRow {
  date: string; // ISO yyyy-mm-dd
  steps?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  sleepMinutes?: number;
}

interface StepsDataPoint {
  steps?: { interval?: { civilStartTime?: string; startTime?: string }; count?: number | string };
}

interface RestingHrDataPoint {
  dailyRestingHeartRate?: { date?: string; beatsPerMinute?: number };
}

interface HrvDataPoint {
  dailyHeartRateVariability?: { date?: string; rmssdMilliseconds?: number };
}

interface SleepDataPoint {
  sleep?: {
    interval?: { startTime?: string; endTime?: string; civilStartTime?: string };
  };
}

function toIsoDate(s: string | undefined): string | null {
  if (!s) return null;
  // Accept "2025-01-20" or "2025-01-20T..." — take first 10 chars if valid
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

export async function fetchDailyFitness(
  accessToken: string,
  sinceDate: string,
): Promise<Map<string, DailyFitnessRow>> {
  const rows = new Map<string, DailyFitnessRow>();
  const get = (date: string) => {
    let r = rows.get(date);
    if (!r) { r = { date }; rows.set(date, r); }
    return r;
  };

  // Steps: civil-day buckets via dailyRollUp would be ideal, but for MVP
  // we fetch raw steps and roll them up client-side by civil_start_time date.
  try {
    const stepsFilter = `steps.interval.civil_start_time >= "${sinceDate}"`;
    const stepsPoints = await listDataPoints<StepsDataPoint>(accessToken, 'steps', stepsFilter);
    for (const p of stepsPoints) {
      const raw = p.steps?.interval?.civilStartTime ?? p.steps?.interval?.startTime;
      const date = toIsoDate(raw);
      const count = p.steps?.count != null ? Number(p.steps.count) : 0;
      if (!date || !Number.isFinite(count)) continue;
      const row = get(date);
      row.steps = (row.steps ?? 0) + count;
    }
  } catch (err) {
    console.warn('fetchDailyFitness steps:', (err as Error).message);
  }

  try {
    const rhrFilter = `dailyRestingHeartRate.date >= "${sinceDate}"`;
    const rhrPoints = await listDataPoints<RestingHrDataPoint>(accessToken, 'dailyRestingHeartRate', rhrFilter);
    for (const p of rhrPoints) {
      const date = toIsoDate(p.dailyRestingHeartRate?.date);
      const bpm = p.dailyRestingHeartRate?.beatsPerMinute;
      if (!date || bpm == null) continue;
      get(date).restingHeartRate = Math.round(bpm);
    }
  } catch (err) {
    console.warn('fetchDailyFitness rhr:', (err as Error).message);
  }

  try {
    const hrvFilter = `dailyHeartRateVariability.date >= "${sinceDate}"`;
    const hrvPoints = await listDataPoints<HrvDataPoint>(accessToken, 'dailyHeartRateVariability', hrvFilter);
    for (const p of hrvPoints) {
      const date = toIsoDate(p.dailyHeartRateVariability?.date);
      const rmssd = p.dailyHeartRateVariability?.rmssdMilliseconds;
      if (!date || rmssd == null) continue;
      get(date).heartRateVariability = rmssd;
    }
  } catch (err) {
    console.warn('fetchDailyFitness hrv:', (err as Error).message);
  }

  try {
    // Sleep is session-based; roll up to minutes per civil date the session started on.
    // pageSize max 25 for sleep per docs.
    const sleepFilter = `sleep.interval.civil_start_time >= "${sinceDate}"`;
    const sleepPoints = await listDataPoints<SleepDataPoint>(accessToken, 'sleep', sleepFilter, 25);
    for (const p of sleepPoints) {
      const start = p.sleep?.interval?.startTime;
      const end = p.sleep?.interval?.endTime;
      const civilStart = p.sleep?.interval?.civilStartTime;
      if (!start || !end) continue;
      const startMs = Date.parse(start);
      const endMs = Date.parse(end);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
      const minutes = Math.round((endMs - startMs) / 60000);
      const date = toIsoDate(civilStart) ?? toIsoDate(start);
      if (!date) continue;
      const row = get(date);
      row.sleepMinutes = (row.sleepMinutes ?? 0) + minutes;
    }
  } catch (err) {
    console.warn('fetchDailyFitness sleep:', (err as Error).message);
  }

  return rows;
}
