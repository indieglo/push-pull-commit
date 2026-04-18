import type { VercelRequest, VercelResponse } from '@vercel/node';

// Placeholder callback endpoint for Withings OAuth2 registration.
// Full token exchange logic will be added once the app is registered.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(200).json({
      ok: true,
      message: 'Withings callback endpoint is live. Waiting for OAuth flow implementation.',
    });
  }

  return res.status(200).json({
    ok: true,
    received: { code: String(code).slice(0, 8) + '...', state },
    message: 'Callback received. Token exchange not yet implemented.',
  });
}
