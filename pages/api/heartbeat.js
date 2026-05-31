import { deserializeSessionCookie } from '../../utils/cookie-crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Authentication guard (fail-closed) ────────────────────────────────────
  // Identity is derived exclusively from the encrypted PS_PROXY_SESSION cookie.
  // The `userid` field from the request body is ignored entirely — it cannot
  // be trusted and is not needed (SEC-06 / F2).
  const sessionData = deserializeSessionCookie(req);
  if (!sessionData) {
    return res.status(401).json({ error: 'Sesiune expirată sau invalidă.' });
  }

  // req.userid is set by deserializeSessionCookie — use that as the source of truth
  const authenticatedUserid = req.userid;

  try {
    const helperName = 'session-validator';
    const validator = await import(`../../utils/${helperName}`);
    validator.touchSession(authenticatedUserid);
  } catch (error) {
    // Fail silently if session-validator is not present (e.g. on clean GitHub clone)
  }

  return res.status(200).json({ success: true });
}

// Heartbeat payloads are tiny — enforce a strict body size limit (SEC-07)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1kb',
    },
  },
};
