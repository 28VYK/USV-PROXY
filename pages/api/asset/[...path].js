/**
 * Asset Proxy API Route
 * 
 * Proxies CSS, images, JavaScript and other static assets from PeopleSoft
 * using true streaming (stream.pipeline) to avoid buffering large files in
 * memory on the 180MB RAM VPS. CSS is the only exception — buffered for
 * url() path rewriting (CSS files are small by definition).
 */

import https from 'https';
import { URL } from 'url';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { serializeSessionCookie, deserializeSessionCookie } from '../../../utils/cookie-crypto';
import { legacyAgent } from '../../../utils/http-agent';
import { checkSsrfGuard } from '../../../utils/ssrf-guard';

const pipelineAsync = promisify(pipeline);

const PEOPLESOFT_BASE = 'https://scolaritate.usv.ro';

// Disable Next.js body parsing — this route only serves GET asset requests
export const config = {
  api: {
    bodyParser: false,
  },
};

function parseCookiePairs(cookieString = '') {
  return cookieString
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        key: part.slice(0, separatorIndex),
        value: part.slice(separatorIndex + 1),
      };
    })
    .filter(Boolean);
}

function extractCookiePairsFromSetCookie(setCookieHeaders = []) {
  return (setCookieHeaders || [])
    .map((entry) => String(entry || '').split(';')[0]?.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        key: entry.slice(0, separatorIndex),
        value: entry.slice(separatorIndex + 1),
      };
    })
    .filter(Boolean);
}

function mergeCookieState(existingCookieString, ...setCookieLists) {
  const cookieMap = new Map();

  parseCookiePairs(existingCookieString).forEach(({ key, value }) => {
    cookieMap.set(key, value);
  });

  setCookieLists.forEach((setCookieList) => {
    extractCookiePairsFromSetCookie(setCookieList).forEach(({ key, value }) => {
      cookieMap.set(key, value);
    });
  });

  return Array.from(cookieMap.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

// isAllowedUsvUrl removed — replaced by checkSsrfGuard from utils/ssrf-guard.js (SEC-04)
// which adds DNS resolution + private IP range validation on top of hostname allowlist.

/**
 * Streams an asset from PeopleSoft directly to the client response,
 * following redirects without buffering the body.
 *
 * For CSS files only, the body is buffered in memory (CSS files are small
 * by definition) so that url() references can be rewritten through the proxy.
 *
 * @param {string}      url            - Upstream URL to fetch
 * @param {string}      sessionCookies - PeopleSoft cookie string
 * @param {object}      res            - Next.js response object
 * @param {object}      req            - Next.js request object (for session refresh + abort)
 * @param {number}      redirectsLeft  - Remaining redirect budget
 * @param {string|null} latestCookies  - Accumulated cookie state across redirects
 */
async function streamAsset(url, sessionCookies, res, req, redirectsLeft = 5, latestCookies = null) {
  const activeCookies = latestCookies || sessionCookies;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    // PERF-01: Hard 45s deadline regardless of upstream data rate.
    // upstreamReq.setTimeout(30000) only catches inactivity; a drip-feed
    // upstream (1 byte/s) would keep the socket open indefinitely otherwise.
    const hardDeadline = setTimeout(() => {
      upstreamReq.destroy(new Error('Asset hard deadline exceeded (45s)'));
    }, 45_000);
    const clearDeadline = () => clearTimeout(hardDeadline);

    const upstreamReq = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
          'Accept': '*/*',
          'Accept-Encoding': 'identity', // Avoid compressed responses so Content-Length stays accurate
          'Cookie': activeCookies,
        },
        agent: legacyAgent,
      },
      async (upstreamRes) => {
        const { statusCode, headers: upstreamHeaders } = upstreamRes;

        // ── Redirect handling ───────────────────────────────────────────────
        if ((statusCode === 301 || statusCode === 302) && upstreamHeaders.location && redirectsLeft > 0) {
          const redirectUrl = upstreamHeaders.location.startsWith('http')
            ? upstreamHeaders.location
            : PEOPLESOFT_BASE + upstreamHeaders.location;

          // SSRF guard on redirect destination — DNS-aware (SEC-04)
          const redirectGuard = await checkSsrfGuard(redirectUrl);
          if (!redirectGuard.allowed) {
            console.warn(`[SECURITY] Blocked redirect SSRF in asset proxy: ${redirectUrl} — ${redirectGuard.reason}`);
            upstreamRes.resume();
            clearDeadline();
            reject(new Error('Access denied: Redirect target blocked by SSRF guard.'));
            return;
          }

          console.log(`[ASSET] Redirect (${redirectsLeft} left) → ${redirectUrl}`);

          // Drain the current response before making the next request
          upstreamRes.resume();

          const mergedAfterRedirect = mergeCookieState(activeCookies, upstreamHeaders['set-cookie'] || []);

          try {
            await streamAsset(redirectUrl, sessionCookies, res, req, redirectsLeft - 1, mergedAfterRedirect);
            clearDeadline();
            resolve();
          } catch (err) {
            clearDeadline();
            reject(err);
          }
          return;
        }

        // ── 404 pass-through ────────────────────────────────────────────────
        if (statusCode === 404) {
          upstreamRes.resume();
          res.status(404).send('Asset not found');
          clearDeadline();
          resolve();
          return;
        }

        // ── Session cookie refresh ──────────────────────────────────────────
        const setCookieList = upstreamHeaders['set-cookie'] || [];
        if (setCookieList.length > 0 && req.userid) {
          const mergedCookies = mergeCookieState(activeCookies, setCookieList);
          const encodedSession = serializeSessionCookie(req, req.userid, mergedCookies);
          res.setHeader(
            'Set-Cookie',
            `PS_PROXY_SESSION=${encodedSession}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=7200`
          );
        }

        // ── Response headers ────────────────────────────────────────────────
        const contentType = upstreamHeaders['content-type'] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        if (upstreamHeaders['content-length']) {
          res.setHeader('Content-Length', upstreamHeaders['content-length']);
        }

        if (contentType.includes('text/html')) {
          res.setHeader('Cache-Control', 'no-store');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }

        res.status(statusCode || 200);

        // ── CSS: buffer + rewrite url() references ──────────────────────────
        // CSS files are small by nature; buffering them is safe and necessary
        // so we can rewrite relative url() paths through the proxy.
        if (contentType.includes('text/css')) {
          const chunks = [];

          // Abort upstream if client disconnects during CSS buffering
          const onCssClientClose = () => { upstreamReq.destroy(); };
          res.on('close', onCssClientClose);

          upstreamRes.on('data', (chunk) => chunks.push(chunk));
          upstreamRes.on('end', () => {
            res.off('close', onCssClientClose);
            let cssContent = Buffer.concat(chunks).toString('utf-8');
            cssContent = cssContent.replace(
              /url\(['"]?\/([^'")]+)['"]\)/g,
              "url('/api/asset/$1')"
            );
            cssContent = cssContent.replace(
              /url\(['"]?(?!data:)(?!http)([^'"]+)['"]\)/g,
              (match, p1) => {
                if (!p1.startsWith('/')) return match;
                return `url('/api/asset${p1}')`;
              }
            );
            // PERF-02: wrap res.send in try/catch so sync errors propagate
            try {
              res.send(cssContent);
              clearDeadline();
              resolve();
            } catch (sendErr) {
              clearDeadline();
              reject(sendErr);
            }
          });
          upstreamRes.on('error', (err) => {
            res.off('close', onCssClientClose);
            clearDeadline();
            reject(err);
          });
          return;
        }

        // ── All other content types: stream directly (zero buffer) ──────────
        // Abort the upstream request if the client disconnects early
        const onClientClose = () => {
          upstreamReq.destroy();
        };
        res.on('close', onClientClose);

        try {
          await pipelineAsync(upstreamRes, res);
        } catch (pipeErr) {
          // EPIPE / ERR_STREAM_DESTROYED = client disconnected — not a server error
          if (pipeErr.code !== 'EPIPE' && pipeErr.code !== 'ERR_STREAM_DESTROYED') {
            clearDeadline();
            reject(pipeErr);
            return;
          }
        } finally {
          res.off('close', onClientClose);
        }

        clearDeadline();
        resolve();
      }
    );

    upstreamReq.on('error', (err) => { clearDeadline(); reject(err); });
    upstreamReq.setTimeout(30000, () => {
      upstreamReq.destroy();
      clearDeadline();
      reject(new Error('Asset request timeout'));
    });

    upstreamReq.end();
  });
}

export default async function handler(req, res) {
  // Get the path from query parameter  
  const { path } = req.query;
  
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  // ── Authentication guard ──────────────────────────────────────────────────
  const sessionCookies = deserializeSessionCookie(req);
  if (!sessionCookies) {
    console.warn(`[SECURITY] Blocked unauthenticated asset proxy request`);
    return res.status(401).json({ error: 'Sesiune expirată sau invalidă. Vă rugăm să vă autentificați din nou.' });
  }

  try {
    // Build full URL including query string from original request
    const fullPath = Array.isArray(path) ? '/' + path.join('/') : '/' + path;
    
    // Reconstruct query string (excluding 'path' parameter)
    const queryParams = { ...req.query };
    delete queryParams.path;
    const queryString = Object.keys(queryParams).length > 0 
      ? '?' + new URLSearchParams(queryParams).toString()
      : '';
    
    const fullUrl = PEOPLESOFT_BASE + fullPath + queryString;

    // SSRF guard: validate hostname allowlist + DNS-resolved IPs (SEC-04)
    const guard = await checkSsrfGuard(fullUrl);
    if (!guard.allowed) {
      console.warn(`[SECURITY] SSRF guard blocked asset request: ${fullUrl} — ${guard.reason}`);
      return res.status(403).json({ error: 'Acces refuzat: Proxy-ul poate fi utilizat exclusiv pentru domenii oficiale USV.' });
    }

    console.log(`[ASSET] Streaming: ${fullUrl}`);

    // Delegate entirely to streamAsset — zero buffering for binary content,
    // CSS buffered only for url() rewriting. No Buffer.concat used here.
    await streamAsset(fullUrl, sessionCookies, res, req);

  } catch (error) {
    console.error('[ASSET] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch asset: ' + error.message });
    }
  }
}
