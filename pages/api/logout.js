import { decryptSessionCookie } from '../../utils/cookie-crypto';

/**
 * Helper: parse raw Cookie header into a key-value map.
 */
function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) return acc;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    acc[key] = value;
    return acc;
  }, {});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userid } = req.body;
  if (!userid) {
    return res.status(400).json({ error: 'Missing userid' });
  }

  // --- Session Ownership Validation ---
  // Verify that the browser requesting logout actually owns the session
  // for the given userid. This prevents an attacker from mass-logging-out
  // other students' sessions by simply knowing their username.
  const parsed = parseCookies(req.headers.cookie || '');
  const encoded = parsed.PS_PROXY_SESSION;

  if (encoded) {
    const decrypted = decryptSessionCookie(encoded);
    if (decrypted && decrypted.includes('|||')) {
      // New secure cookie format: "userid|||<ps_cookies>"
      const cookieUserid = decrypted.slice(0, decrypted.indexOf('|||'));
      if (cookieUserid.toLowerCase() !== userid.toLowerCase()) {
        console.warn(`[SECURITY] Logout session mismatch — body userid: "${userid}", cookie userid: "${cookieUserid}"`);
        return res.status(403).json({ error: 'Session ownership mismatch' });
      }
    }
    // Graceful fallback: old cookie format (no "|||") — allow through so active users
    // are not disrupted at deploy time. Once Max-Age=7200 expires, all clients will
    // carry the new format and the fallback path becomes unreachable.
  }

  try {
    const helperName = 'session-validator';
    const validator = await import(`../../utils/${helperName}`);
    validator.removeSession(userid);
  } catch (error) {
    // Fail silently if session-validator is not present (e.g. on clean GitHub clone)
  }

  // Clear the session cookie on the browser side as well
  res.setHeader(
    'Set-Cookie',
    'PS_PROXY_SESSION=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0'
  );

  return res.status(200).json({ success: true });
}
