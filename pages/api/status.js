/**
 * USV Portal — Status API Proxy
 *
 * Interoghează local instanța Uptime Kuma din același spațiu de rețea VPN.
 * Returnează datele de monitorizare procesate pentru frontend-ul React.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apelăm direct pe interfața locală a containerului Uptime Kuma (port 3001)
    const [configRes, heartbeatRes] = await Promise.all([
      fetch('http://127.0.0.1:3001/api/status-page/status'),
      fetch('http://127.0.0.1:3001/api/status-page/heartbeat/status')
    ]);

    if (!configRes.ok || !heartbeatRes.ok) {
      throw new Error(`Uptime Kuma fetch failed. Config: ${configRes.status}, Heartbeat: ${heartbeatRes.status}`);
    }

    const configData = await configRes.json();
    const heartbeatData = await heartbeatRes.json();

    return res.status(200).json({
      publicGroupList: configData.publicGroupList || [],
      heartbeatList: heartbeatData.heartbeatList || {},
      uptimeList: heartbeatData.uptimeList || {},
      incident: configData.incident || null
    });
  } catch (error) {
    console.error('[STATUS API] Error fetching from Uptime Kuma:', error);
    return res.status(503).json({
      error: 'Serviciul de monitorizare este temporar indisponibil.',
      details: error.message
    });
  }
}

// Dezactivăm body parser pentru că este o rută de tip GET simplă
export const config = {
  api: {
    externalResolver: true,
  },
};
