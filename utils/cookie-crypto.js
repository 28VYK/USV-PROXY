/**
 * cookie-crypto.js — Shared session cookie encryption utilities.
 *
 * Provides AES-256-GCM symmetric encryption for the PS_PROXY_SESSION browser cookie.
 * Using authenticated encryption (GCM mode) guarantees both confidentiality
 * (cookie contents cannot be read) and integrity (cookie cannot be tampered with
 * without detection on the server side).
 *
 * Configuration:
 *   Set COOKIE_ENCRYPTION_KEY in .env to any passphrase of your choice.
 *   The raw passphrase is stretched to a stable 32-byte key via scrypt, so length
 *   and entropy of the passphrase do not need to match AES-256 key length exactly.
 *
 *   If COOKIE_ENCRYPTION_KEY is missing (local development), a deterministic
 *   fallback key is used automatically — the app still works without extra setup.
 *
 * Cookie wire format (after base64url encoding):
 *   base64url( iv_hex ":" authTag_hex ":" ciphertext_hex )
 *
 * Backward-compatibility:
 *   If a cookie does not match the expected format (e.g. old plain-base64 cookie
 *   from before this change was deployed), decryptSessionCookie falls back to the
 *   old plain base64url decode so existing logged-in users are not forced to
 *   re-authenticate immediately on deploy. The next successful page load will
 *   re-issue the cookie in the new encrypted format.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV — standard recommended size for GCM
const SCRYPT_SALT = 'usv-portal-cookie-salt-v1'; // static — change to rotate all sessions
const KEY_LENGTH = 32; // 256 bits

// Ensure the application does not start without a secure session key.
if (!process.env.COOKIE_ENCRYPTION_KEY) {
  throw new Error('FATAL: COOKIE_ENCRYPTION_KEY is not defined in the environment variables. The application cannot start securely.');
}

/**
 * Derive a stable 32-byte AES key from the configured passphrase.
 * scryptSync is intentionally called once at module load time; the result is
 * cached in this constant for the lifetime of the Node.js process.
 */
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.COOKIE_ENCRYPTION_KEY,
  SCRYPT_SALT,
  KEY_LENGTH
);

/**
 * Encrypt a plain-text session cookie string and return a base64url token
 * safe for use as a browser cookie value.
 *
 * @param {string} cookieValue - The raw PeopleSoft session cookie string (e.g. "PS_TOKEN=abc; PS_DEVICEFEATURES=...")
 * @returns {string} Opaque, encrypted base64url string to store in the browser.
 */
export function encryptSessionCookie(cookieValue) {
  if (!cookieValue) return '';

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(cookieValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Encode all three components into a single base64url string.
    const raw = `${iv.toString('hex')}:${authTag}:${encrypted}`;
    return Buffer.from(raw, 'utf8').toString('base64url');
  } catch (err) {
    console.error('[COOKIE-CRYPTO] Encryption failed:', err.message);
    throw new Error('Encryption failed: Secure session token generation is unavailable.');
  }
}

/**
 * Decrypt a cookie value that was previously produced by encryptSessionCookie.
 * Includes backward-compatible fallback for old plain-base64 cookies.
 *
 * @param {string} encoded - The raw cookie value from the browser (base64url string).
 * @returns {string} The original PeopleSoft session cookie string, or '' on any error.
 */
export function decryptSessionCookie(encoded) {
  if (!encoded) return '';

  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    const parts = raw.split(':');

    // Reject non-encrypted format. Must have exactly 3 colon-separated parts.
    if (parts.length !== 3) {
      console.error('[COOKIE-CRYPTO] Invalid cookie format (missing encryption envelope).');
      return '';
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // GCM auth tag mismatch means the cookie was tampered with or is from a
    // different key (e.g. after key rotation). Force re-login by returning ''.
    console.error('[COOKIE-CRYPTO] Decryption failed (tampered or key mismatch):', err.message);
    return '';
  }
}

/**
 * Parses raw Cookie header string into a key-value object map.
 */
function parseCookies(header = '') {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, cookiePart) => {
      const separatorIndex = cookiePart.indexOf('=');
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = cookiePart.slice(0, separatorIndex);
      const value = cookiePart.slice(separatorIndex + 1);
      accumulator[key] = value;
      return accumulator;
    }, {});
}

/**
 * Helper to extract client IP and User-Agent and generate their SHA-256 hashes.
 */
export function getClientContext(req) {
  if (!req) return { ipHash: '', uaHash: '' };

  const ip = req.headers['cf-connecting-ip'] ||
    req.headers['x-client-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;

  const ua = req.headers['user-agent'] || '';

  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex');
  const uaHash = crypto.createHash('sha256').update(ua).digest('hex');

  return { ipHash, uaHash };
}

/**
 * Serializes the user session into an encrypted cookie value bound to the client's IP and UA.
 * 
 * @param {object} req - Next.js API request object.
 * @param {string} userid - The student's username/userid.
 * @param {string} psCookies - The raw PeopleSoft session cookies string.
 * @returns {string} The encrypted, base64url-encoded cookie payload.
 */
export function serializeSessionCookie(req, userid, psCookies) {
  if (!userid || !psCookies) return '';
  const { ipHash, uaHash } = getClientContext(req);
  const payload = `${userid}|||${uaHash}|||${ipHash}|||${psCookies}`;
  return encryptSessionCookie(payload);
}

/**
 * Deserializes and validates the user session from the request's PS_PROXY_SESSION cookie.
 * Verifies that the client context (IP and User-Agent) matches the original hashes.
 * 
 * @param {object} req - Next.js API request object.
 * @returns {string} The decrypted PeopleSoft session cookies if valid, or '' if invalid/hijacked.
 */
export function deserializeSessionCookie(req) {
  try {
    const cookies = req.headers.cookie || '';
    const parsed = parseCookies(cookies);
    const encoded = parsed.PS_PROXY_SESSION;
    if (!encoded) return '';

    const decrypted = decryptSessionCookie(encoded);
    if (!decrypted) return '';

    const parts = decrypted.split('|||');
    if (parts.length >= 4) {
      const userid = parts[0];
      const uaHash = parts[1];
      const ipHash = parts[2];
      const psCookies = parts.slice(3).join('|||');

      const { ipHash: currentIpHash, uaHash: currentUaHash } = getClientContext(req);

      if (uaHash !== currentUaHash || ipHash !== currentIpHash) {
        console.warn(`[SECURITY] Session binding verification failed for user: ${userid}. IP/UA mismatch detected!`);
        return '';
      }

      req.userid = userid; // Store on request object for Set-Cookie refreshes
      return psCookies;
    }

    console.warn('[COOKIE-CRYPTO] Session cookie format invalid (missing context binding).');
    return '';
  } catch (err) {
    console.error('[COOKIE-CRYPTO] Deserialization failed:', err.message);
    return '';
  }
}
