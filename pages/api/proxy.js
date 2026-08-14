/**
 * Proxy API Route - Fetches pages from PeopleSoft
 * 
 * This endpoint proxies requests to the legacy PeopleSoft server
 * and returns the content to the client.
 */

import https from 'https';
import { URL } from 'url';
import { deserializeSessionCookie, serializeSessionCookie } from '../../utils/cookie-crypto';
import { legacyAgent, withRetry } from '../../utils/http-agent';
import { checkSsrfGuard } from '../../utils/ssrf-guard';

const PEOPLESOFT_BASE = 'https://scolaritate.usv.ro';

// Removed parseCookies, getSessionCookiesFromRequest, and encodeSessionCookie in favor of shared cookie-crypto utilities

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
 * Create a custom HTTPS agent that allows legacy SSL/TLS connections
 */
function legacyRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
        ...options.headers,
      },
      agent: legacyAgent,
    };

    const req = https.request(requestOptions, (res) => {
      // For redirect responses, drain body without buffering — only headers/status are needed.
      // Buffering HTML from 3xx hops wastes memory (SEC-05).
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: '',
          cookies: res.headers['set-cookie'] || [],
        });
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie'] || [],
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Process HTML to fix relative URLs - route through our proxy
 */
function processHtml(html, baseUrl) {
  const toAssetProxyUrl = (rawUrl = '') => {
    const value = String(rawUrl || '').trim();
    if (!value || value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('#')) {
      return value;
    }

    if (value.startsWith('/api/asset/')) {
      return value;
    }

    if (value.startsWith('/')) {
      return `/api/asset${value}`;
    }

    if (value.startsWith('https://scolaritate.usv.ro/')) {
      return `/api/asset/${value.slice('https://scolaritate.usv.ro/'.length)}`;
    }

    if (value.startsWith('http://scolaritate.usv.ro/')) {
      return `/api/asset/${value.slice('http://scolaritate.usv.ro/'.length)}`;
    }

    return value;
  };

  const rewriteTagAttribute = (inputHtml, tagName, attributeName) => {
    const regex = new RegExp(`(<${tagName}[^>]*\\s${attributeName}=["'])([^"']+)(["'][^>]*>)`, 'gi');
    return inputHtml.replace(regex, (_, prefix, attributeValue, suffix) => {
      return `${prefix}${toAssetProxyUrl(attributeValue)}${suffix}`;
    });
  };

  let processed = html;

  processed = rewriteTagAttribute(processed, 'script', 'src');
  processed = rewriteTagAttribute(processed, 'img', 'src');
  processed = rewriteTagAttribute(processed, 'iframe', 'src');
  processed = rewriteTagAttribute(processed, 'frame', 'src');
  processed = rewriteTagAttribute(processed, 'input', 'src');
  processed = rewriteTagAttribute(processed, 'link', 'href');

  processed = processed
    .replace(/background="([^"]+)"/gi, (_, value) => `background="${toAssetProxyUrl(value)}"`)
    .replace(/background='([^']+)'/gi, (_, value) => `background='${toAssetProxyUrl(value)}'`)
    .replace(/url\((['"]?)([^'"\)]+)\1\)/gi, (_, quote, value) => {
      const rewritten = toAssetProxyUrl(value);
      const wrappedQuote = quote || "'";
      return `url(${wrappedQuote}${rewritten}${wrappedQuote})`;
    });

  return processed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // NOTE: `headers` is intentionally NOT destructured from req.body.
  // Client-supplied headers are never forwarded upstream — all request headers
  // are constructed exclusively server-side to prevent cookie injection (F1/P3).
  const { url, method = 'GET', body } = req.body;

  // SEC-15: Ensure body is a string when provided, preventing [object Object] forwarding or length calculation errors
  if (body !== undefined && typeof body !== 'string') {
    return res.status(400).json({ error: 'Invalid request body format' });
  }

  // Decrypt and validate the session cookie (which also sets req.userid)
  const cookies = deserializeSessionCookie(req);

  if (!cookies) {
    return res.status(401).json({ success: false, error: 'Sesiune expirată sau invalidă. Te rugăm să te autentifici din nou.' });
  }

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    // Build full URL
    const fullUrl = url.startsWith('http') ? url : PEOPLESOFT_BASE + url;

    // SSRF guard: validate hostname allowlist + DNS-resolved IPs (SEC-04)
    const initialGuard = await checkSsrfGuard(fullUrl);
    if (!initialGuard.allowed) {
      const isInvalidUrl = initialGuard.reason.startsWith('Invalid URL');
      console.warn(`[SECURITY] SSRF guard blocked: ${fullUrl} — ${initialGuard.reason}`);
      return res.status(isInvalidUrl ? 400 : 403).json({
        success: false,
        error: isInvalidUrl ? 'Format URL invalid.' : 'Acces refuzat: Proxy-ul poate fi utilizat exclusiv pentru domenii oficiale USV.',
      });
    }
    
    console.log(`[PROXY] Fetching: ${fullUrl}`);

    const normalizedMethod = String(method || 'GET').toUpperCase();

    // Build upstream headers entirely server-side.
    // No client-supplied headers are forwarded — this prevents cookie injection
    // and hop-by-hop header smuggling (audit findings F1 and P3).
    const requestHeaders = {
      Cookie: cookies,
    };

    if (normalizedMethod === 'POST' && body) {
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      requestHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    // GET requests: wrap with withRetry to handle stale keep-alive ECONNRESET (SEC-08).
    // POST requests are never retried to avoid double form submission on PeopleSoft.
    let response;
    if (normalizedMethod === 'GET') {
      response = await withRetry(() => legacyRequest(fullUrl, {
        method: normalizedMethod,
        headers: requestHeaders,
      }));
    } else {
      response = await legacyRequest(fullUrl, {
        method: normalizedMethod,
        headers: requestHeaders,
        body,
      });
    }

    console.log(`[PROXY] Response status: ${response.status}`);

    const redirectStatuses = new Set([301, 302, 303, 307, 308]);
    const maxRedirects = 8;
    let redirectsFollowed = 0;
    let finalUrl = fullUrl;
    let activeCookies = cookies;
    let activeMethod = normalizedMethod;

    while (redirectStatuses.has(response.status) && response.headers.location && redirectsFollowed < maxRedirects) {
      const redirectUrl = response.headers.location.startsWith('http')
        ? response.headers.location
        : PEOPLESOFT_BASE + response.headers.location;

      // SSRF guard on redirect destination — also DNS-aware (SEC-04)
      const redirectGuard = await checkSsrfGuard(redirectUrl);
      if (!redirectGuard.allowed) {
        const isInvalidUrl = redirectGuard.reason.startsWith('Invalid URL');
        console.warn(`[SECURITY] SSRF guard blocked redirect: ${redirectUrl} — ${redirectGuard.reason}`);
        return res.status(isInvalidUrl ? 400 : 403).json({
          success: false,
          error: isInvalidUrl ? 'Format redirect URL invalid.' : 'Acces refuzat: Redirect către domeniu non-USV blocat.',
        });
      }

      activeCookies = mergeCookieState(activeCookies, response.cookies);
      finalUrl = redirectUrl;
      redirectsFollowed += 1;

      console.log(`[PROXY] Redirect ${redirectsFollowed} -> ${redirectUrl}`);

      const nextMethod = (response.status === 307 || response.status === 308) ? activeMethod : 'GET';
      // Redirect headers are also built server-side only — no client header forwarding
      const nextHeaders = {
        Cookie: activeCookies,
      };

      // Redirect follows are always GET (or preserved method for 307/308) — safe to retry
      response = await withRetry(() => legacyRequest(redirectUrl, {
        method: nextMethod,
        headers: nextHeaders,
      }));

      activeMethod = nextMethod;
    }

    // Process and return the HTML
    const processedHtml = processHtml(response.body, PEOPLESOFT_BASE);

    const mergedCookies = mergeCookieState(activeCookies, response.cookies);
    if (mergedCookies && req.userid) {
      const encodedSession = serializeSessionCookie(req, req.userid, mergedCookies);
      res.setHeader(
        'Set-Cookie',
        `PS_PROXY_SESSION=${encodedSession}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=7200`
      );
    }

    return res.status(200).json({
      success: true,
      html: processedHtml,
      originalUrl: fullUrl,
      finalUrl,
      redirectsFollowed,
      status: response.status,
    });

  } catch (error) {
    console.error('[PROXY] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Proxy request failed: ' + error.message,
    });
  }
}

// Limit request body size — PeopleSoft form payloads are always small
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};
