-- Push, Pull, Commit - Schema v3 Migration
-- Run this AFTER the full schema to add effort rating and unilateral support
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)

-- Add effort rating to workout_exercises
alter table workout_exercises add column if not exists effort_rating text; -- 'easy', 'challenging', 'hard'

-- Add unilateral flag to exercises
alter table exercises add column if not exists is_unilateral boolean default false;
