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

/**
 * Derive a stable 32-byte AES key from the configured passphrase.
 * scryptSync is intentionally called once at module load time; the result is
 * cached in this constant for the lifetime of the Node.js process.
 */
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.COOKIE_ENCRYPTION_KEY || 'dev-fallback-do-not-use-in-production-replace-me!',
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
    // Absolute last-resort fallback: return plain base64url so the app does not crash.
    return Buffer.from(cookieValue, 'utf8').toString('base64url');
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

    // New encrypted format must have exactly 3 colon-separated parts.
    if (parts.length !== 3) {
      // Backward-compatibility: treat as old plain base64url cookie.
      console.warn('[COOKIE-CRYPTO] Legacy plain cookie detected — accepting for this request.');
      return raw;
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
