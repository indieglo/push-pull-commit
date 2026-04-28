import type { FitnessProvider } from './types.js';
import { fitbitProvider } from './providers/fitbit.js';

// To add a provider (Oura, Garmin, etc.):
//   1. implement FitnessProvider in providers/<name>.ts
//   2. add a line below
//   3. add a cron entry in vercel.json pointing at /api/fitness/<name>/sync
const providers: Record<string, FitnessProvider> = {
  [fitbitProvider.name]: fitbitProvider,
};

export function getProvider(name: string): FitnessProvider | null {
  return providers[name] ?? null;
}

export function listProviders(): FitnessProvider[] {
  return Object.values(providers);
}
