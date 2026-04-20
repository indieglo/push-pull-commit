-- Push, Pull, Commit - Alcohol Logging
-- Run this in Supabase SQL Editor

create table if not exists alcohol_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  drinks numeric not null,
  notes text,
  created_at timestamptz default now()
);

alter table alcohol_logs enable row level security;

create policy "Users can view own alcohol logs" on alcohol_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own alcohol logs" on alcohol_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own alcohol logs" on alcohol_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own alcohol logs" on alcohol_logs
  for delete using (auth.uid() = user_id);

create index idx_alcohol_logs_user_date on alcohol_logs(user_id, date desc);
