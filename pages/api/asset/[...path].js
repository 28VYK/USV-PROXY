/**
 * Asset Proxy API Route
 * 
 * Proxies CSS, images, JavaScript and other static assets from PeopleSoft
 * This is needed because the browser can't directly access the legacy server.
 */

import https from 'https';
import { URL } from 'url';

const PEOPLESOFT_BASE = 'https://scolaritate.usv.ro';

function createLegacyAgent() {
  return new https.Agent({
    rejectUnauthorized: false,
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

    const response = await legacyRequest(fullUrl);

    // Handle 404 and other errors
    if (response.status === 404) {
      return res.status(404).send('Asset not found');
    }

    // Set appropriate content type
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    // Set cache headers for static assets
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
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
      // For HTML responses (shouldn't happen often for assets), rewrite URLs
      let htmlContent = response.body.toString('utf-8');
      htmlContent = htmlContent
        .replace(/src="\/([^"]+)"/g, 'src="/api/asset/$1"')
        .replace(/href="\/([^"]+\.css[^"]*)"/g, 'href="/api/asset/$1"');
      res.send(htmlContent);
    } else if (contentType.includes('javascript') || contentType.includes('text/plain')) {
      // For JS files, also rewrite any hardcoded paths
      let jsContent = response.body.toString('utf-8');
      jsContent = jsContent.replace(/'\/PT90SYS\//g, "'/api/asset/PT90SYS/");
      jsContent = jsContent.replace(/"\/PT90SYS\//g, '"/api/asset/PT90SYS/');
      res.send(jsContent);
    } else {
      // For binary files (images, etc), send as-is
      res.send(response.body);
    }

  } catch (error) {
    console.error('[ASSET] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch asset: ' + error.message });
  }
}

