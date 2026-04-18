-- v5: OAuth token storage for third-party health integrations (Withings, Google Fit, Oura)

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  provider_user_id text,
  last_sync_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_integrations_user_id_idx on public.user_integrations(user_id);
create index if not exists user_integrations_provider_idx on public.user_integrations(provider);

alter table public.user_integrations enable row level security;

-- Users can read their own connection status (but tokens should stay server-side only)
create policy "Users can view own integrations"
  on public.user_integrations for select
  using (auth.uid() = user_id);

-- Only server-side (service role) writes tokens; no client insert/update/delete policies on purpose.

-- Track Withings measurement IDs on weight_logs to dedupe imports across syncs.
alter table public.weight_logs
  add column if not exists provider_ref text;

create index if not exists weight_logs_provider_ref_idx on public.weight_logs(user_id, source, provider_ref);
