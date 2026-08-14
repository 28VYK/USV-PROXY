import https from 'https';
import { legacyAgent } from '../../../utils/http-agent';

// Global cache variable that persists across development hot-reloads
if (!global.vpnHealthCache) {
  global.vpnHealthCache = {
    online: true,
    latencyMs: 0,
    timestamp: 0,
  };
}

const CACHE_TTL_MS = 5000; // 5 seconds cache TTL

function checkVpnStatus() {
  return new Promise((resolve) => {
    const startTime = process.hrtime();
    const req = https.request({
      hostname: 'scolaritate.usv.ro',
      port: 443,
      path: '/',
      method: 'HEAD',
      agent: legacyAgent,
      timeout: 2500, // 2.5 seconds timeout
    }, (res) => {
      res.resume();
      const diff = process.hrtime(startTime);
      const latencyMs = Math.round((diff[0] * 1000) + (diff[1] / 1e6));
      resolve({ online: true, latencyMs });
    });

    req.on('error', (err) => {
      console.warn(`[VPN-HEALTH] Probe failed: ${err.message}`);
      resolve({ online: false, latencyMs: 0 });
    });

    req.setTimeout(2500, () => {
      req.destroy();
      console.warn('[VPN-HEALTH] Probe timeout');
      resolve({ online: false, latencyMs: 0 });
    });

    req.end();
  });
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = Date.now();
  const cacheAge = now - global.vpnHealthCache.timestamp;

  let fromCache = true;
  if (cacheAge > CACHE_TTL_MS) {
    fromCache = false;
    const status = await checkVpnStatus();
    global.vpnHealthCache = {
      online: status.online,
      latencyMs: status.latencyMs,
      timestamp: now,
    };
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.status(200).json({
    online: global.vpnHealthCache.online,
    latencyMs: global.vpnHealthCache.latencyMs,
    timestamp: global.vpnHealthCache.timestamp,
    cached: fromCache,
  });
}
