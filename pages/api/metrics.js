import https from 'https';
import { legacyAgent } from '../../utils/http-agent';

function checkVpnLatency() {
  return new Promise((resolve) => {
    const startTime = process.hrtime();
    const req = https.request({
      hostname: 'scolaritate.usv.ro',
      port: 443,
      path: '/',
      method: 'HEAD',
      agent: legacyAgent,
      timeout: 2000,
    }, (res) => {
      res.resume();
      const diff = process.hrtime(startTime);
      const latencySeconds = diff[0] + diff[1] / 1e9;
      resolve({ online: 1, latency: latencySeconds });
    });

    req.on('error', () => {
      resolve({ online: 0, latency: 0 });
    });

    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ online: 0, latency: 0 });
    });

    req.end();
  });
}

export default async function handler(req, res) {
  const expectedToken = process.env.METRICS_TOKEN;
  if (!expectedToken) {
    return res.status(403).send('Forbidden: Token not configured');
  }

  // Support both secure Authorization Bearer header AND URL query parameter token fallback
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  let isAuthenticated = false;
  if (authHeader === `Bearer ${expectedToken}`) {
    isAuthenticated = true;
  } else if (queryToken === expectedToken) {
    isAuthenticated = true;
  }

  if (!isAuthenticated) {
    return res.status(403).send('Forbidden');
  }

  // Node.js memory footprint
  const memory = process.memoryUsage();

  // Active sessions, unique student counts, and cumulative logins count
  // Obtained from RAM-only cache maintained by the session validator helper
  let activeSessionsCount = 0;
  let uniqueStudentsCount = 0;
  let totalLoginsCount = 0;

  try {
    activeSessionsCount = Object.keys(global.activeSessions || {}).length;
    uniqueStudentsCount = Object.keys(global.uniqueStudents || {}).length;
    totalLoginsCount = global.totalLoginsCount || 0;
  } catch (err) {
    // Fail-safe default to zero
  }

  // VPN connectivity latency
  const vpnStatus = await checkVpnLatency();

  // Format into standard Prometheus exposition text
  const payload = [
    '# HELP node_memory_rss_bytes Resident Set Size (RSS) in bytes.',
    '# TYPE node_memory_rss_bytes gauge',
    `node_memory_rss_bytes ${memory.rss}`,
    '',
    '# HELP node_memory_heap_total_bytes V8 Heap total size in bytes.',
    '# TYPE node_memory_heap_total_bytes gauge',
    `node_memory_heap_total_bytes ${memory.heapTotal}`,
    '',
    '# HELP node_memory_heap_used_bytes V8 Heap used size in bytes.',
    '# TYPE node_memory_heap_used_bytes gauge',
    `node_memory_heap_used_bytes ${memory.heapUsed}`,
    '',
    '# HELP usv_active_sessions Active concurrent sessions.',
    '# TYPE usv_active_sessions gauge',
    `usv_active_sessions ${activeSessionsCount}`,
    '',
    '# HELP usv_unique_students Unique student accounts seen since launch.',
    '# TYPE usv_unique_students gauge',
    `usv_unique_students ${uniqueStudentsCount}`,
    '',
    '# HELP usv_total_logins Cumulative total logins recorded.',
    '# TYPE usv_total_logins counter',
    `usv_total_logins ${totalLoginsCount}`,
    '',
    '# HELP usv_vpn_online VPN connectivity status (1 = online, 0 = offline).',
    '# TYPE usv_vpn_online gauge',
    `usv_vpn_online ${vpnStatus.online}`,
    '',
    '# HELP usv_vpn_latency_seconds VPN latency in seconds.',
    '# TYPE usv_vpn_latency_seconds gauge',
    `usv_vpn_latency_seconds ${vpnStatus.latency.toFixed(6)}`,
    ''
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  return res.status(200).send(payload);
}
