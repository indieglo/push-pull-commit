-- Push, Pull, Commit - Schema v2 Migration
-- Run this AFTER the initial schema to add cardio support
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)

-- Add cardio fields to exercises
alter table exercises add column if not exists is_cardio boolean default false;
alter table exercises add column if not exists distance_unit text; -- 'laps', 'km', 'miles'

-- Add cardio fields to workout_exercises
alter table workout_exercises add column if not exists duration_minutes numeric;
alter table workout_exercises add column if not exists distance numeric;
alter table workout_exercises add column if not exists cardio_notes text;
