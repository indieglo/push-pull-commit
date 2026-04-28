// Shared types for any third-party fitness provider that exposes a daily summary
// (steps, resting HR, HRV, sleep). New providers (Oura, Garmin, etc.) implement
// FitnessProvider and register themselves in registry.ts — no other code changes.

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  scope?: string | null;
}

export interface DailyFitnessRow {
  date: string; // yyyy-mm-dd
  steps?: number;
  restingHeartRate?: number;
  heartRateVariability?: number; // rmssd ms
  sleepMinutes?: number;
}

export interface FitnessProvider {
  // Stable string used as DB key (`user_integrations.provider`, `fitness_daily_logs.source`).
  name: string;
  // Human-readable label for the Settings UI.
  displayName: string;
  // Short blurb shown when the provider isn't connected.
  description: string;

  // Loaded lazily so missing env vars don't crash on import.
  getEnv(): { clientId: string; clientSecret: string; redirectUri: string };

  buildAuthorizeUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<TokenSet>;
  refreshTokens(refreshToken: string): Promise<TokenSet>;

  fetchDailyFitness(accessToken: string, sinceDate: string): Promise<Map<string, DailyFitnessRow>>;
}
