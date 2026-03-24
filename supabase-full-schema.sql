-- Push, Pull, Commit - Full Supabase Schema
-- Paste this entire script into Supabase SQL Editor and click Run

-- =============================================
-- TABLES
-- =============================================

-- Exercises table (shared library, but users can add custom ones)
create table if not exists exercises (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('push', 'pull', 'legs', 'core', 'cardio')),
  is_bodyweight boolean default false,
  is_cardio boolean default false,
  muscle_group text,
  distance_unit text, -- 'laps', 'km', 'miles'
  created_at timestamptz default now()
);

-- Workouts table
create table if not exists workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  name text not null,
  notes text,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout exercises (join table with ordering)
create table if not exists workout_exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references workouts(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  "order" integer not null,
  duration_minutes numeric,
  distance numeric,
  cardio_notes text,
  created_at timestamptz default now()
);

-- Individual sets
create table if not exists exercise_sets (
  id uuid default gen_random_uuid() primary key,
  workout_exercise_id uuid references workout_exercises(id) on delete cascade not null,
  set_number integer not null,
  weight numeric, -- kg, null for bodyweight
  reps integer,
  duration_seconds integer, -- for timed exercises
  is_bodyweight boolean default false,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table exercises enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table exercise_sets enable row level security;

-- Exercises policies
create policy "Users can view own exercises" on exercises
  for select using (auth.uid() = user_id);
create policy "Users can insert own exercises" on exercises
  for insert with check (auth.uid() = user_id);
create policy "Users can update own exercises" on exercises
  for update using (auth.uid() = user_id);
create policy "Users can delete own exercises" on exercises
  for delete using (auth.uid() = user_id);

-- Workouts policies
create policy "Users can view own workouts" on workouts
  for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on workouts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on workouts
  for update using (auth.uid() = user_id);
create policy "Users can delete own workouts" on workouts
  for delete using (auth.uid() = user_id);

-- Workout exercises policies
create policy "Users can view own workout exercises" on workout_exercises
  for select using (
    exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid())
  );
create policy "Users can insert own workout exercises" on workout_exercises
  for insert with check (
    exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid())
  );
create policy "Users can update own workout exercises" on workout_exercises
  for update using (
    exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid())
  );
create policy "Users can delete own workout exercises" on workout_exercises
  for delete using (
    exists (select 1 from workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid())
  );

-- Exercise sets policies
create policy "Users can view own exercise sets" on exercise_sets
  for select using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = exercise_sets.workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy "Users can insert own exercise sets" on exercise_sets
  for insert with check (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = exercise_sets.workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy "Users can update own exercise sets" on exercise_sets
  for update using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = exercise_sets.workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy "Users can delete own exercise sets" on exercise_sets
  for delete using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = exercise_sets.workout_exercise_id and w.user_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES
-- =============================================

create index idx_workouts_user_date on workouts(user_id, date desc);
create index idx_workout_exercises_workout on workout_exercises(workout_id);
create index idx_exercise_sets_workout_exercise on exercise_sets(workout_exercise_id);
