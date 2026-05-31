/**
 * SSRF Guard Utility
 *
 * Provides DNS-aware URL validation to prevent Server-Side Request Forgery.
 * Validates both the hostname allowlist AND the resolved IP addresses to
 * block DNS rebinding / subdomain takeover attacks towards private ranges.
 *
 * Note: a TOCTOU window exists between this check and the actual TCP connect
 * (DNS rebinding with very short TTL). This guard eliminates the vast majority
 * of practical SSRF vectors; full mitigation would require socket-level IP pinning.
 */

import { promises as dnsPromises } from 'dns';
import { URL } from 'url';

// ── DNS result cache (PERF-03 / SEC-13) ──────────────────────────────────────
// Caches DNS lookup results per hostname with a 30-second TTL.
// - Eliminates per-request DNS latency (~1-5ms per lookup).
// - Reduces the TOCTOU window for DNS rebinding attacks (SEC-13).
// - On DNS error with a warm cache entry, we fail-closed (do NOT serve stale).
const DNS_CACHE_TTL_MS = 30_000;
const dnsCache = new Map(); // host → { addresses: [{address, family}], expiry: number }

async function resolveWithCache(host) {
  const now = Date.now();
  const cached = dnsCache.get(host);
  if (cached && cached.expiry > now) {
    return cached.addresses;
  }
  // Fetch fresh — throws on error (handled by caller → fail-closed)
  const addresses = await dnsPromises.lookup(host, { all: true });
  dnsCache.set(host, { addresses, expiry: now + DNS_CACHE_TTL_MS });
  return addresses;
}

// ── Allowlist ────────────────────────────────────────────────────────────────

const ALLOWED_EXACT = new Set(['scolaritate.usv.ro', 'usv.ro']);
const ALLOWED_SUFFIX = '.usv.ro';

// ── Private / Reserved IP ranges ─────────────────────────────────────────────

/**
 * IPv4 private/reserved ranges as [startInt, endInt] pairs (inclusive).
 * Covers loopback, RFC1918, link-local, shared address space, and IANA special.
 */
const PRIVATE_V4_RANGES = [
  [0x00000000, 0x00FFFFFF], // 0.0.0.0/8        — "this" network
  [0x7F000000, 0x7FFFFFFF], // 127.0.0.0/8      — loopback
  [0x0A000000, 0x0AFFFFFF], // 10.0.0.0/8       — RFC1918
  [0xAC100000, 0xAC1FFFFF], // 172.16.0.0/12    — RFC1918
  [0xC0A80000, 0xC0A8FFFF], // 192.168.0.0/16   — RFC1918
  [0xA9FE0000, 0xA9FEFFFF], // 169.254.0.0/16   — link-local / cloud metadata
  [0x64400000, 0x647FFFFF], // 100.64.0.0/10    — shared address space (RFC6598)
  [0xC0000000, 0xC00000FF], // 192.0.0.0/24     — IANA special purpose
];

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0);
}

function isPrivateV4(ip) {
  const n = ipv4ToInt(ip);
  return PRIVATE_V4_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

/**
 * Checks common IPv6 private/reserved prefixes.
 * Handles: loopback, unspecified, unique-local (fc/fd), link-local (fe80::/10),
 * and IPv4-mapped addresses (::ffff:).
 */
function isPrivateV6(ip) {
  const lower = ip.toLowerCase();

  if (lower === '::1' || lower === '::') return true;

  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4
  if (lower.startsWith('::ffff:')) {
    const embedded = lower.slice(7); // strip '::ffff:'
    if (embedded.includes('.')) {
      return isPrivateV4(embedded);
    }
    return true; // non-dotted hex form — reject to be safe
  }

  // Unique-local fc00::/7 (covers fc:: and fd::)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  // Link-local fe80::/10 (fe80 – febf)
  if (lower.startsWith('fe')) {
    const secondByte = parseInt(lower.slice(2, 4), 16);
    if (!isNaN(secondByte) && secondByte >= 0x80 && secondByte <= 0xbf) return true;
  }

  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validates that a URL:
 *  1. Uses https: protocol only
 *  2. Targets an allowed USV hostname (exact or *.usv.ro suffix)
 *  3. Resolves via DNS to non-private IP addresses
 *
 * Fail-closed: any DNS error is treated as a blocked request.
 *
 * @param {string} url - Full URL to validate
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function checkSsrfGuard(url) {
  // 1. Parse
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }

  // 2. Protocol — https only
  if (parsed.protocol !== 'https:') {
    return { allowed: false, reason: `Protocol not allowed: ${parsed.protocol}` };
  }

  // 3. Hostname allowlist
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_EXACT.has(host) && !host.endsWith(ALLOWED_SUFFIX)) {
    return { allowed: false, reason: `Hostname not in USV allowlist: ${host}` };
  }

  // 4. DNS resolution + IP range check (cached, SEC-11, PERF-03)
  let addresses;
  try {
    addresses = await resolveWithCache(host);
  } catch (err) {
    console.warn(`[SSRF-GUARD] DNS resolution failed for "${host}": ${err.message}`);
    return { allowed: false, reason: `DNS resolution failed: ${err.message}` };
  }

  // SEC-11: fail-closed if DNS returns no addresses (edge-case, no-throw empty list)
  if (!Array.isArray(addresses) || addresses.length === 0) {
    console.warn(`[SSRF-GUARD] DNS returned no addresses for "${host}" — fail-closed`);
    return { allowed: false, reason: 'DNS resolution returned no addresses' };
  }

  for (const { address, family } of addresses) {
    if (family === 4 && isPrivateV4(address)) {
      console.warn(`[SSRF-GUARD] Blocked — ${host} resolved to private IPv4: ${address}`);
      return { allowed: false, reason: `Resolved to private IPv4: ${address}` };
    }
    if (family === 6 && isPrivateV6(address)) {
      console.warn(`[SSRF-GUARD] Blocked — ${host} resolved to private IPv6: ${address}`);
      return { allowed: false, reason: `Resolved to private IPv6: ${address}` };
    }
  }

  return { allowed: true };
}

/**
 * Synchronous hostname-only check — no DNS resolution.
 * Use as a fast pre-filter where async is not available, or as the first
 * gate before calling checkSsrfGuard.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isAllowedUsvHostname(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_EXACT.has(host) || host.endsWith(ALLOWED_SUFFIX);
  } catch {
    return false;
  }
}
