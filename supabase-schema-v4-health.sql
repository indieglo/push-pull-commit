-- Push, Pull, Commit - Health Tracking Tables
-- Run this in Supabase SQL Editor

-- Blood pressure readings
create table if not exists blood_pressure (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  time text not null,
  systolic integer not null,
  diastolic integer not null,
  pulse integer,
  notes text,
  created_at timestamptz default now()
);

-- Weight logs
create table if not exists weight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight numeric not null,
  bmi numeric,
  fat_percent numeric,
  muscle_mass numeric,
  source text default 'manual' check (source in ('manual', 'withings')),
  notes text,
  created_at timestamptz default now()
);

-- RLS
alter table blood_pressure enable row level security;
alter table weight_logs enable row level security;

create policy "Users can view own BP readings" on blood_pressure
  for select using (auth.uid() = user_id);
create policy "Users can insert own BP readings" on blood_pressure
  for insert with check (auth.uid() = user_id);
create policy "Users can update own BP readings" on blood_pressure
  for update using (auth.uid() = user_id);
create policy "Users can delete own BP readings" on blood_pressure
  for delete using (auth.uid() = user_id);

create policy "Users can view own weight logs" on weight_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own weight logs" on weight_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own weight logs" on weight_logs
  for update using (auth.uid() = user_id);
create policy "Users can delete own weight logs" on weight_logs
  for delete using (auth.uid() = user_id);

-- Indexes
create index idx_blood_pressure_user_date on blood_pressure(user_id, date desc);
create index idx_weight_logs_user_date on weight_logs(user_id, date desc);
