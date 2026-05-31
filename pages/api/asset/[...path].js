/**
 * Asset Proxy API Route
 * 
 * Proxies CSS, images, JavaScript and other static assets from PeopleSoft
 * This is needed because the browser can't directly access the legacy server.
 */

import https from 'https';
import { URL } from 'url';
import { serializeSessionCookie, deserializeSessionCookie } from '../../../utils/cookie-crypto';

const PEOPLESOFT_BASE = 'https://scolaritate.usv.ro';

// Removed encodeSessionCookie alias in favor of serializeSessionCookie

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

// Removed parseCookies and getSessionCookiesFromRequest in favor of shared cookie-crypto utilities

function createLegacyAgent() {
  return new https.Agent({
    rejectUnauthorized: true,
    minVersion: 'TLSv1',
    maxVersion: 'TLSv1.2',
    ciphers: 'ALL:@SECLEVEL=0',
    honorCipherOrder: false,
  });
}

function legacyRequest(url, options = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': '*/*',
        'Accept-Encoding': 'identity', // Don't request compressed responses
        ...options.headers,
      },
      agent: createLegacyAgent(),
    };

    const req = https.request(requestOptions, (res) => {
      // Handle redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : PEOPLESOFT_BASE + res.headers.location;

        // Security check: only redirect to USV domains to prevent SSRF/Open Redirect
        try {
          const parsedRedirect = new URL(redirectUrl);
          const redirectHostname = parsedRedirect.hostname.toLowerCase();
          const isRedirectValidUsv = redirectHostname === 'scolaritate.usv.ro' || redirectHostname === 'usv.ro' || redirectHostname.endsWith('.usv.ro');
          
          if (!isRedirectValidUsv) {
            console.warn(`[SECURITY] Blocked redirect SSRF attempt in asset proxy: ${redirectUrl}`);
            reject(new Error('Access denied: Redirect target must be a USV domain.'));
            return;
          }
        } catch (e) {
          reject(new Error('Invalid redirect URL format in asset proxy.'));
          return;
        }

        console.log(`[ASSET] Following redirect to: ${redirectUrl}`);
        resolve(legacyRequest(redirectUrl, options, maxRedirects - 1));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

export default async function handler(req, res) {
  // Get the path from query parameter  
  const { path } = req.query;
  
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
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
    const response = await legacyRequest(fullUrl, {
      headers: sessionCookies ? { Cookie: sessionCookies } : {},
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

