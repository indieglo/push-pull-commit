# Push, Pull, Commit

A gym workout tracker built as a Progressive Web App (PWA). Log sets, reps, and weights at the gym from your phone — offline-first with optional cloud sync.

## Features

- **Workout templates** — Quick-start Strength A/B routines or build your own
- **Set tracking** — Log weight, reps, and bodyweight exercises with optional added weight
- **Cardio tracking** — Duration and distance for swimming (laps) and jogging (km)
- **Rest timer** — Configurable countdown with vibration alert (works in background)
- **Progressive overload cues** — Rate each exercise Easy/Challenging/Hard, and get "increase weight" or "keep weight" recommendations next session based on effort + rep count
- **Last performance display** — See your previous weights and reps for each exercise
- **Incomplete set warnings** — Alerts you to unfinished sets before ending a workout
- **Offline-first** — All data stored locally in IndexedDB via Dexie.js
- **Cloud sync** — Optional Supabase backend with Google OAuth
- **Installable PWA** — Add to home screen for a native app feel

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Dexie.js (IndexedDB wrapper)
- Supabase (auth + Postgres)
- vite-plugin-pwa

## Quick Start

```bash
git clone https://github.com/indieglo/push-pull-commit.git
cd push-pull-commit
npm install --legacy-peer-deps
npm run dev
```

The app works fully offline without any backend. For cloud sync, see the Supabase setup below.

## Supabase Setup (optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema in the Supabase SQL Editor:
   - Paste the contents of `supabase-full-schema.sql` and click Run
   - Then paste `supabase-schema-v3.sql` and click Run
3. Enable Google OAuth under **Auth > Sign In / Providers > Google**
4. Copy your `.env.example` to `.env` and fill in your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The anon key is found under **Settings > API > anon public** (the long `eyJ...` JWT).

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables
4. Deploy

After deploying, update your Supabase **Auth > URL Configuration** redirect URLs and your Google OAuth authorized origins to include your Vercel domain.

## Importing Workout History

You can import past workouts from a CSV file via **Settings > Import Workout CSV**.

Expected CSV format:

```
Week,Day,Date,Workout,Exercise,Weight,Sets,Reps or Time,Notes
1,Mon,Jan 6,Strength A,Dumbbell Bench Press,20kg,3,10/10/8,challenging
,,,,Push-Ups,BW,3,15/12/10,hard
```

- **Weight**: `BW` for bodyweight, `20kg`, `7.5kg each`, etc.
- **Reps or Time**: `12/12/12` for rep splits, `45 seconds`, `1:00`, `20 laps`, etc.
- Empty cells in Date/Workout/Exercise columns are filled down from the previous row
- See `sample-workout.csv` for a complete example

## License

MIT
