/**
 * Proxy API Route - Fetches pages from PeopleSoft
 * 
 * This endpoint proxies requests to the legacy PeopleSoft server
 * and returns the content to the client.
 */

import https from 'https';
import { URL } from 'url';

const PEOPLESOFT_BASE = 'https://scolaritate.usv.ro';

/**
 * Create a custom HTTPS agent that allows legacy SSL/TLS connections
 */
function createLegacyAgent() {
  return new https.Agent({
    rejectUnauthorized: false,
    minVersion: 'TLSv1',
    maxVersion: 'TLSv1.2',
    ciphers: 'ALL:@SECLEVEL=0',
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

/**
 * Process HTML to fix relative URLs - route through our proxy
 */
function processHtml(html, baseUrl) {
  let processed = html
    // Route ALL src attributes through asset proxy (images, scripts)
    .replace(/src="\/([^"]+)"/g, 'src="/api/asset/$1"')
    .replace(/src='\/([^']+)'/g, "src='/api/asset/$1'")
    // Route CSS link tags through asset proxy
    .replace(/href="\/([^"]+\.css[^"]*)"/g, 'href="/api/asset/$1"')
    // Route /cs/ paths (PeopleSoft cache servlet) through asset proxy
    .replace(/href="\/cs\/([^"]+)"/g, 'href="/api/asset/cs/$1"')
    // Route other links through data attributes for JS handling
    .replace(/href="\/([^"]+)"/g, 'href="#" data-proxy-href="/$1"')
    // Fix form actions
    .replace(/action="\/([^"]+)"/g, 'action="#" data-original-action="/$1"')
    .replace(/action="([^"#][^"]*)"/g, 'action="#" data-original-action="$1"')
    // Fix absolute URLs to PeopleSoft
    .replace(/https:\/\/scolaritate\.usv\.ro\//g, '/api/asset/')
    // Fix url() in inline styles
    .replace(/url\(['"]?\/([^'")]+)['"]?\)/g, "url('/api/asset/$1')")
    // Fix background attribute
    .replace(/background="\/([^"]+)"/g, 'background="/api/asset/$1"')
    ;

  return processed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, cookies, method = 'GET', body } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    // Build full URL
    const fullUrl = url.startsWith('http') ? url : PEOPLESOFT_BASE + url;
    
    console.log(`[PROXY] Fetching: ${fullUrl}`);

    const response = await legacyRequest(fullUrl, {
      method,
      headers: cookies ? { 'Cookie': cookies } : {},
      body,
    });

    console.log(`[PROXY] Response status: ${response.status}`);

    // Handle redirects
    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.location;
      console.log(`[PROXY] Redirect to: ${redirectUrl}`);
      
      // Follow the redirect
      const redirectResponse = await legacyRequest(
        redirectUrl.startsWith('http') ? redirectUrl : PEOPLESOFT_BASE + redirectUrl,
        {
          headers: cookies ? { 'Cookie': cookies } : {},
        }
      );
      
      return res.status(200).json({
        success: true,
        html: processHtml(redirectResponse.body, PEOPLESOFT_BASE),
        originalUrl: fullUrl,
        finalUrl: redirectUrl,
      });
    }

    // Process and return the HTML
    const processedHtml = processHtml(response.body, PEOPLESOFT_BASE);

    return res.status(200).json({
      success: true,
      html: processedHtml,
      originalUrl: fullUrl,
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
