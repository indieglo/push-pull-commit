# Health & Training Data — Analyst Brief

Paste alongside the CSV export when sharing with anyone (or any model) you'd like to do routine planning, trend analysis, or experiment design.

## About the subject

- Male, parent of two young kids (one toddler, one preschooler as of mid-2026). Re-establishing fitness after several years of inconsistency during the early-parenthood phase.
- On low-dose blood pressure medication.
- Trains primarily at a commercial gym with access to dumbbells, cable rows, lat pulldown, and pool. Some bodyweight work at home.
- Owns: Withings smart scale, Omron BP cuff, Fitbit (transitioning to an Oura Ring in ~1–2 months).
- Tracking philosophy: lightweight, data-honest. Wants to see how sleep, alcohol, BP, and bodyweight correlate with training output, not aspirational metrics.

## Files in this export

| File | What it contains |
|---|---|
| `workouts_flat.csv` | **Start here.** One row per set (or per cardio entry). Columns: date, workout name, exercise, category, set number, weight (kg), reps, duration, distance, effort rating, notes. Easiest format for plotting and analysis. |
| `workouts.csv` | Workout sessions — date, name, start/complete timestamps, notes. |
| `workout_exercises.csv` | Junction rows linking workouts to exercises with effort rating + cardio duration/distance. |
| `exercise_sets.csv` | Individual set entries (weight, reps, duration). |
| `exercises.csv` | Exercise library — name, category, bodyweight/unilateral flags. |
| `blood_pressure.csv` | Manual BP readings: date, time, systolic, diastolic, pulse, notes. |
| `weight_logs.csv` | Bodyweight + body composition. `source` distinguishes manual entries from Withings. |
| `alcohol_logs.csv` | Daily standard-drink count (halves allowed). |
| `fitness_daily_logs.csv` | Per-day steps / RHR / HRV / sleep minutes from connected fitness providers (currently Fitbit; Oura later). `source` field tags which provider supplied each row. |

## Data quirks to be aware of

- **Categories**: `push`, `pull`, `legs`, `core`, `cardio`. Strength split is roughly A (push) / B (pull) — programmed by the user, not a named template.
- **Bodyweight exercises**: `weight_kg` will be null. Use `is_bodyweight=true` on the exercise row.
- **Unilateral exercises** (curls, bird-dog, etc.): the `reps` value is **per side**, not total. Flag is on the exercise row (`is_unilateral`).
- **Effort rating**: `easy` / `challenging` / `hard`, set per exercise per session. Self-reported, optional.
- **Timed exercises** (planks, side planks): `reps` is null; `duration_seconds` carries the hold time.
- **Cardio exercises** (swim, jog): no individual sets — `duration_minutes` and `distance` live on `workout_exercises` instead. `exercise_sets` is empty for these.
- **BP**: this user considers **diastolic the primary clinically-relevant number**, systolic secondary. Diastolic is the metric to track for medication efficacy.
- **Alcohol**: a `0` row means the user logged the day explicitly; a missing date means they didn't log. Don't assume null = zero.
- **Sleep minutes**: total time asleep (Fitbit's `minutesAsleep` summed across main + naps for that civil date), not time in bed.
- **HRV**: Fitbit's `dailyRmssd` in milliseconds. Only available for nights the device was worn during deep sleep.
- **Imported history**: workouts from Aug–Nov 2025 were imported from a pre-app spreadsheet; these have weight + reps but no effort ratings or notes. Sessions from late March 2026 onward are app-native and richer.

## What's NOT in these CSVs (data the analyst should ask about)

These shape the training context but aren't in any table:

1. **Subjective state at training time** — energy, soreness, mood, stress. Not tracked.
2. **Diet** — no food log. The user has a goal to "eat better" but no quantitative data.
3. **Injuries / aches / form notes** — only what made it into a workout's `notes` field, which is sparse.
4. **Programming intent** — there's no stored template or progression scheme. The pattern is roughly: push-day exercises, pull-day exercises, occasional pool day. Recommendations should respect available equipment + the constraint that sessions must fit around two young kids.
5. **Pre-app training history before Aug 2025** — long-form lifting background exists but isn't in this dataset.
6. **Medication details** — only that the user takes low-dose BP meds. Specific drug/dose not in the data.
7. **Sleep quality, sleep stages, readiness scores** — until the Oura Ring transition, only total sleep minutes are captured.
8. **Goals & constraints** — primary goals: re-build a sustainable strength habit, lower BP (especially diastolic), drink less, sleep more. Hard constraint: sessions must be ~45–60 min and unscheduled-childcare-resistant.
9. **Anything still pending sync on the user's phone** — usually a handful of recent entries. The user can hit **Settings → Sync Now** in the app before exporting to flush these.

## Suggested analysis angles

If asking for help with planning, these are the questions most worth running against the data:

- **Strength trajectory by category**: rolling 4-week max + average weight × reps for top compound lifts. Is push/pull/legs progress symmetric or lopsided?
- **Cadence stability**: workouts per week over the past 8/12/24 weeks. Where do the gaps land (illness? travel? kid weeks?)? Match against `alcohol_logs` and `sleep_minutes`.
- **Recovery × performance**: 7-day rolling average of RHR & HRV against effort ratings. Does "hard" cluster on days following poor sleep or higher alcohol intake?
- **BP trend with focus on diastolic**: 14-day rolling average diastolic + systolic, annotated with alcohol weeks and weight trend. Goal: visible drop and/or stabilization.
- **Alcohol & weight**: weekly drink total against 7-day weight trend. Bodyweight is a lagging indicator.
- **Cardio dosage**: pool sessions per month, distance/duration trend. Where would adding 1 more cardio session per week fit without compressing strength volume?
