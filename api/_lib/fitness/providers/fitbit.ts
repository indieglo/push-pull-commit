import type { FitnessProvider, TokenSet, DailyFitnessRow } from '../types.js';

const AUTHORIZE_URL = 'https://www.fitbit.com/oauth2/authorize';
const TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
const API_BASE = 'https://api.fitbit.com';

// Fitbit returns scopes space-separated. activity → steps; heartrate → resting HR + HRV; sleep → sleep minutes.
const SCOPES = 'activity heartrate sleep';

function getEnv() {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Fitbit credentials not configured');
  }
  return { clientId, clientSecret, redirectUri };
}

async function fitbitTokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const { clientId, clientSecret } = getEnv();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const json = await res.json() as TokenSet & { errors?: Array<{ message?: string }>; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    const detail = json.errors?.[0]?.message ?? json.error_description ?? json.error ?? `status ${res.status}`;
    throw new Error(`Fitbit token error: ${detail}`);
  }
  return json;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fitbitGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  // Some endpoints (HRV) return 404 if the user has no data yet — treat as empty.
  if (res.status === 404) return {} as T;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fitbit ${path} error: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface StepsSeries {
  'activities-steps'?: Array<{ dateTime: string; value: string }>;
}

interface HeartSeries {
  'activities-heart'?: Array<{ dateTime: string; value: { restingHeartRate?: number } }>;
}

interface HrvSeries {
  hrv?: Array<{ dateTime: string; value: { dailyRmssd?: number } }>;
}

interface SleepResponse {
  sleep?: Array<{ dateOfSleep: string; minutesAsleep?: number; isMainSleep?: boolean }>;
}

async function fetchDailyFitness(accessToken: string, sinceDate: string): Promise<Map<string, DailyFitnessRow>> {
  const rows = new Map<string, DailyFitnessRow>();
  const get = (date: string): DailyFitnessRow => {
    let r = rows.get(date);
    if (!r) { r = { date }; rows.set(date, r); }
    return r;
  };
  const end = todayIso();

  // Steps
  try {
    const data = await fitbitGet<StepsSeries>(accessToken, `/1/user/-/activities/steps/date/${sinceDate}/${end}.json`);
    for (const point of data['activities-steps'] ?? []) {
      const n = Number(point.value);
      if (!Number.isFinite(n) || n <= 0) continue;
      get(point.dateTime).steps = n;
    }
  } catch (err) {
    console.warn('[fitbit] steps:', (err as Error).message);
  }

  // Resting heart rate (also returned by the heart endpoint)
  try {
    const data = await fitbitGet<HeartSeries>(accessToken, `/1/user/-/activities/heart/date/${sinceDate}/${end}.json`);
    for (const point of data['activities-heart'] ?? []) {
      const rhr = point.value?.restingHeartRate;
      if (rhr == null) continue;
      get(point.dateTime).restingHeartRate = Math.round(rhr);
    }
  } catch (err) {
    console.warn('[fitbit] heart:', (err as Error).message);
  }

  // HRV (rmssd)
  try {
    const data = await fitbitGet<HrvSeries>(accessToken, `/1/user/-/hrv/date/${sinceDate}/${end}.json`);
    for (const point of data.hrv ?? []) {
      const rmssd = point.value?.dailyRmssd;
      if (rmssd == null) continue;
      get(point.dateTime).heartRateVariability = Math.round(rmssd);
    }
  } catch (err) {
    console.warn('[fitbit] hrv:', (err as Error).message);
  }

  // Sleep (sum minutesAsleep per dateOfSleep, the civil date the session ended on)
  try {
    const data = await fitbitGet<SleepResponse>(accessToken, `/1.2/user/-/sleep/date/${sinceDate}/${end}.json`);
    for (const session of data.sleep ?? []) {
      const date = session.dateOfSleep;
      const mins = session.minutesAsleep;
      if (!date || mins == null) continue;
      const row = get(date);
      row.sleepMinutes = (row.sleepMinutes ?? 0) + mins;
    }
  } catch (err) {
    console.warn('[fitbit] sleep:', (err as Error).message);
  }

  return rows;
}

export const fitbitProvider: FitnessProvider = {
  name: 'fitbit',
  displayName: 'Fitbit',
  description: 'Pull steps, sleep, resting HR, and HRV from your Fitbit account',
  getEnv,
  buildAuthorizeUrl(state) {
    const { clientId, redirectUri } = getEnv();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
      // Fitbit recommends prompt=consent for first-run so the refresh token is always issued
      prompt: 'consent',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },
  exchangeCodeForTokens(code) {
    const { clientId, redirectUri } = getEnv();
    return fitbitTokenRequest(new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    }));
  },
  refreshTokens(refreshToken) {
    return fitbitTokenRequest(new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }));
  },
  fetchDailyFitness,
};
