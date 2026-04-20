-- Push, Pull, Commit - Google Health daily fitness logs
-- Run this in Supabase SQL Editor

create table if not exists fitness_daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  steps integer,
  resting_heart_rate integer,
  heart_rate_variability numeric,
  sleep_minutes integer,
  source text not null default 'google_health',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date, source)
);

alter table fitness_daily_logs enable row level security;

create policy "Users can view own fitness logs" on fitness_daily_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own fitness logs" on fitness_daily_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own fitness logs" on fitness_daily_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own fitness logs" on fitness_daily_logs
  for delete using (auth.uid() = user_id);

create index idx_fitness_daily_logs_user_date on fitness_daily_logs(user_id, date desc);
