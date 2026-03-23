# Project Specification: Personal Workout Dashboard & Analyzer (PWA)

## 1. Overview
I am building a Progressive Web App (PWA) to replace my gym spreadsheet. The primary goal is logging workouts seamlessly on my phone at the gym, and then using the dashboard on a larger screen to analyze trends, track progressive overload, and plan future phases. 

## 2. Tech Stack
* **Frontend:** React (built with Vite) for a fast, responsive Single Page Application.
* **Styling:** Tailwind CSS (dark mode default).
* **Charting:** Recharts (for visualizing volume, weight trends, and workout consistency).
* **Backend/Database:** Supabase (PostgreSQL). We need a real relational database to run queries for trend analysis.
* **Hosting:** Vercel or Netlify (with PWA manifest configured for "Add to Home Screen" on Android).

## 3. Database Schema (PostgreSQL via Supabase)
To enable trend analysis, data must be normalized (no "12/12/12" strings).

* **`workouts` table:**
  * `id` (UUID)
  * `date` (Timestamp)
  * `name` (String - e.g., "Strength A", "Phase 2")
  * `notes` (Text)

* **`exercises` table:**
  * `id` (UUID)
  * `workout_id` (UUID, Foreign Key)
  * `name` (String - e.g., "Dumbbell Bench Press")
  * `order` (Integer - execution order in the workout)

* **`sets` table:**
  * `id` (UUID)
  * `exercise_id` (UUID, Foreign Key)
  * `set_number` (Integer)
  * `weight` (Numeric/Decimal - strip out "kg" or "lbs", store as pure number)
  * `reps` (Integer)
  * `duration_seconds` (Integer - for timed holds like Planks)
  * `is_bodyweight` (Boolean)

## 4. Core Features & UI Screens

### A. The Gym Logger (Mobile Optimized)
* **Start Session:** Select a planned routine or start empty.
* **Logging Interface:** Large, tap-friendly numeric inputs for Weight and Reps. 
* **"Last Time" Context:** When I select an exercise (e.g., "Lat Pulldown"), the UI *must* display what I did last week (e.g., "Last: 3 sets x 10 reps @ 44kg") so I know my target for progressive overload.

### B. The Analytics Dashboard (Desktop/Tablet Optimized)
* **Consistency Heatmap:** A GitHub-style contribution graph showing workout frequency.
* **Exercise Progression Charts:** A line graph where I can select an exercise (e.g., "Goblet Squats") and view my Estimated 1RM or Total Volume over time.
* **Phase Planner:** A simple UI to copy previous workouts and increment the target weights/reps for the next 4-week phase.

## 5. Initial Tasks for the AI Assistant
1. Initialize the Vite/React project and set up Tailwind CSS.
2. Generate the Supabase SQL schema and provide the commands to set up the tables.
3. Build a data-import script. I have historical CSV data that currently formats reps as "12/12/12" and weights as "22.5kg". Write a script to parse this messy CSV data into the clean, relational Supabase schema.
4. Scaffold the mobile-first "Gym Logger" screen.
5. Implement the PWA manifest and service worker so it can be installed on an Android device.