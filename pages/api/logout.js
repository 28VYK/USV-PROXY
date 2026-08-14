import { deserializeSessionCookie } from '../../utils/cookie-crypto';
import { removeSession } from '../../utils/metrics-tracker';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userid } = req.body;
  if (!userid) {
    return res.status(400).json({ error: 'Missing userid' });
  }

  // --- Session Ownership Validation (SEC-18 / SEC-20) ---
  // Verify that the browser requesting logout actually owns the session
  // for the given userid. This prevents an attacker from mass-logging-out
  // other students' sessions by simply knowing their username.
  const psCookies = deserializeSessionCookie(req);

  if (!psCookies || !req.userid) {
    return res.status(401).json({ error: 'Sesiune expirată sau invalidă.' });
  }

  if (req.userid.toLowerCase() !== userid.toLowerCase()) {
    console.warn(`[SECURITY] Logout session mismatch — body userid: "${userid}", cookie userid: "${req.userid}"`);
    return res.status(403).json({ error: 'Session ownership mismatch' });
  }

  // Remove from active metrics tracker
  removeSession(userid);

  // Clear the session cookie on the browser side as well
  res.setHeader(
    'Set-Cookie',
    'PS_PROXY_SESSION=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0'
  );

  return res.status(200).json({ success: true });
}

// SEC-18: Limit body size to 1kb
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1kb',
    },
  },
};
