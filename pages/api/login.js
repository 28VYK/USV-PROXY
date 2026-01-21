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

  const { userid, password } = req.body;

  if (!userid || !password) {
    return res.status(400).json({ error: 'Missing userid or password' });
  }

  try {
    console.log(`[LOGIN] Attempting login for user: ${userid}`);

    // Step 1: Get the login page to obtain session cookie
    const loginPage = await legacyRequest(PEOPLESOFT_BASE + LOGIN_PATH);
    
    console.log(`[LOGIN] Got login page, status: ${loginPage.status}`);
    console.log(`[LOGIN] Cookies received: ${loginPage.cookies.length}`);

    // Extract session cookies
    let sessionCookies = loginPage.cookies.map(cookie => cookie.split(';')[0]).join('; ');

    // Step 2: Submit login form
    const loginData = new URLSearchParams({
      userid: userid,
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

    // Process the HTML to fix URLs - route through our proxy
    portalHtml = portalHtml
      // Route ALL src attributes through asset proxy (images, scripts)
      .replace(/src="\/([^"]+)"/g, 'src="/api/asset/$1"')
      .replace(/src='\/([^']+)'/g, "src='/api/asset/$1'")
      // Route CSS link tags through asset proxy
      .replace(/href="\/([^"]+\.css[^"]*)"/g, 'href="/api/asset/$1"')
      // Route script imports
      .replace(/href="\/cs\/([^"]+)"/g, 'href="/api/asset/cs/$1"')
      // Keep other links as data attributes for JavaScript handling
      .replace(/href="\/([^"]+)"/g, 'href="#" data-proxy-href="/$1"')
      // Rewrite form actions
      .replace(/action="\/([^"]+)"/g, 'action="#" data-original-action="/$1"')
      // Fix any absolute URLs to the PeopleSoft server
      .replace(/https:\/\/scolaritate\.usv\.ro\//g, '/api/asset/')
      // Fix url() in inline styles
      .replace(/url\(['"]?\/([^'")]+)['"]?\)/g, "url('/api/asset/$1')")
      // Fix background attribute
      .replace(/background="\/([^"]+)"/g, 'background="/api/asset/$1"');

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

