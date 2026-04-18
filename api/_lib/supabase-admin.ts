import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials not configured');
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Verify a user's access token (from the client's Supabase session) and return their user_id.
// Returns null if token is invalid/expired.
export async function verifyUserToken(accessToken: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user.id;
}
