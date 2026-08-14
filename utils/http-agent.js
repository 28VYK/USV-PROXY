import https from 'https';

/**
 * Singleton HTTPS Agent with TLS connection pooling and keep-alive enabled.
 * 
 * Reuses active sockets for subsequent requests to scolaritate.usv.ro,
 * eliminating the expensive TCP/TLS handshake latency on every API call.
 * Sockets are automatically destroyed if idle for more than 15 seconds to free system resources.
 */
export const legacyAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,       // maximum sockets per host
  maxFreeSockets: 10,   // maximum free sockets to keep open
  timeout: 30000,       // 30 seconds connection timeout
  
  // PeopleSoft legacy TLS requirements
  rejectUnauthorized: true,
  minVersion: 'TLSv1',
  maxVersion: 'TLSv1.2',
  ciphers: 'ALL:@SECLEVEL=0',
  honorCipherOrder: false,
});

/**
 * Error codes that indicate a transient socket issue safe to retry.
 * ECONNRESET: server closed a stale keep-alive socket before we could send.
 * ETIMEDOUT:  connection timed out (upstream may be temporarily unreachable).
 * ECONNREFUSED: connection refused (rare, but transient on legacy servers).
 */
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED']);

/**
 * Wraps an async factory function with retry logic for transient network errors.
 *
 * IMPORTANT: Only use this for idempotent operations (GET requests).
 * Never retry POST requests that may have side effects on PeopleSoft.
 *
 * @template T
 * @param {() => Promise<T>} fn           - Async factory to call (and retry)
 * @param {number}           [maxAttempts=2] - Total attempts before giving up
 * @returns {Promise<T>}
 */
export async function withRetry(fn, maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt >= maxAttempts;
      const isRetryable = RETRYABLE_CODES.has(err.code);

      if (!isLast && isRetryable) {
        console.warn(`[HTTP-AGENT] ${err.code} on attempt ${attempt}/${maxAttempts} — retrying in ${150 * attempt}ms`);
        await new Promise((r) => setTimeout(r, 150 * attempt));
        continue;
      }

      throw err;
    }
  }
}
