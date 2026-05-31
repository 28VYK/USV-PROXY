/**
 * Asset Proxy API Route
 * 
 * Proxies CSS, images, JavaScript and other static assets from PeopleSoft
 * This is needed because the browser can't directly access the legacy server.
 */

import https from 'https';
import { URL } from 'url';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { serializeSessionCookie, deserializeSessionCookie } from '../../../utils/cookie-crypto';
import { legacyAgent } from '../../../utils/http-agent';

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

/**
 * Validates that a URL targets an allowed USV domain to prevent SSRF.
 */
function isAllowedUsvUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const h = parsed.hostname.toLowerCase();
    return h === 'scolaritate.usv.ro' || h === 'usv.ro' || h.endsWith('.usv.ro');
  } catch {
    return false;
  }
}

/**
 * Streams an asset from PeopleSoft directly to the client response,
 * following redirects without buffering the body.
 *
 * For CSS files only, the body is buffered in memory (CSS files are small
 * by definition) so that url() references can be rewritten through the proxy.
 *
 * @param {string}           url            - Upstream URL to fetch
 * @param {string}           sessionCookies - PeopleSoft cookie string
 * @param {object}           res            - Next.js response object
 * @param {object}           req            - Next.js request object (for session refresh + abort)
 * @param {number}           redirectsLeft  - Remaining redirect budget
 * @param {string|null}      latestCookies  - Accumulated cookie state across redirects
 */
async function streamAsset(url, sessionCookies, res, req, redirectsLeft = 5, latestCookies = null) {
  const activeCookies = latestCookies || sessionCookies;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

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

          if (!isAllowedUsvUrl(redirectUrl)) {
            console.warn(`[SECURITY] Blocked redirect SSRF in asset proxy: ${redirectUrl}`);
            // Drain the response body before rejecting to free the socket back to the pool
            upstreamRes.resume();
            reject(new Error('Access denied: Redirect target must be a USV domain.'));
            return;
          }

          console.log(`[ASSET] Redirect (${redirectsLeft} left) → ${redirectUrl}`);

          // Drain the current response before making the next request
          upstreamRes.resume();

          const mergedAfterRedirect = mergeCookieState(activeCookies, upstreamHeaders['set-cookie'] || []);

          try {
            await streamAsset(redirectUrl, sessionCookies, res, req, redirectsLeft - 1, mergedAfterRedirect);
            resolve();
          } catch (err) {
            reject(err);
          }
          return;
        }

        // ── 404 pass-through ────────────────────────────────────────────────
        if (statusCode === 404) {
          upstreamRes.resume();
          res.status(404).send('Asset not found');
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
          upstreamRes.on('data', (chunk) => chunks.push(chunk));
          upstreamRes.on('end', () => {
            let cssContent = Buffer.concat(chunks).toString('utf-8');
            cssContent = cssContent.replace(
              /url\(['"]?\/([^'"\)]+)['"]?\)/g,
              "url('/api/asset/$1')"
            );
            cssContent = cssContent.replace(
              /url\(['"]?(?!data:)(?!http)([^'"\)]+)['"]?\)/g,
              (match, p1) => {
                if (!p1.startsWith('/')) return match;
                return `url('/api/asset${p1}')`;
              }
            );
            res.send(cssContent);
            resolve();
          });
          upstreamRes.on('error', reject);
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
            reject(pipeErr);
            return;
          }
        } finally {
          res.off('close', onClientClose);
        }

        resolve();
      }
    );

    upstreamReq.on('error', reject);
    upstreamReq.setTimeout(30000, () => {
      upstreamReq.destroy();
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
    
    console.log(`[ASSET] Fetching: ${fullUrl}`);

    const sessionCookies = deserializeSessionCookie(req);
    if (!sessionCookies) {
      console.warn(`[SECURITY] Blocked unauthenticated asset proxy request to: ${fullUrl}`);
      return res.status(401).json({ error: 'Sesiune expirată sau invalidă. Vă rugăm să vă autentificați din nou.' });
    }

    const response = await legacyRequest(fullUrl, {
      headers: { Cookie: sessionCookies },
    });

    const mergedCookies = mergeCookieState(sessionCookies, response.headers['set-cookie'] || []);
    if (mergedCookies && req.userid) {
      const encodedSession = serializeSessionCookie(req, req.userid, mergedCookies);
      res.setHeader(
        'Set-Cookie',
        `PS_PROXY_SESSION=${encodedSession}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=7200`
      );
    }

    // Handle 404 and other errors
    if (response.status === 404) {
      return res.status(404).send('Asset not found');
    }

    // Set appropriate content type
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    
    // Handle different content types
    if (contentType.includes('text/css')) {
      let cssContent = response.body.toString('utf-8');
      // Rewrite url() references in CSS to go through our proxy
      cssContent = cssContent.replace(/url\(['"]?\/([^'")]+)['"]?\)/g, "url('/api/asset/$1')");
      cssContent = cssContent.replace(/url\(['"]?(?!data:)(?!http)([^'")]+)['"]?\)/g, (match, p1) => {
        // Handle relative URLs in CSS
        if (!p1.startsWith('/')) {
          return match; // Keep relative paths as-is for now
        }
        return `url('/api/asset${p1}')`;
      });
      res.send(cssContent);
    } else if (contentType.includes('text/html')) {
      res.send(response.body.toString('utf-8'));
    } else if (contentType.includes('javascript') || contentType.includes('text/plain')) {
      res.send(response.body.toString('utf-8'));
    } else {
      // For binary files (images, etc), send as-is
      res.send(response.body);
    }

  } catch (error) {
    console.error('[ASSET] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch asset: ' + error.message });
  }
}

