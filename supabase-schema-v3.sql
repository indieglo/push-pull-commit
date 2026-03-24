-- Push, Pull, Commit - Schema v3 Migration
-- Run this AFTER the full schema to add effort rating support
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)

-- Add effort rating to workout_exercises
alter table workout_exercises add column if not exists effort_rating text; -- 'easy', 'challenging', 'hard'
