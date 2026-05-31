import https from 'https';

/**
 * Singleton HTTPS Agent with TLS connection pooling and keep-alive enabled.
 * 
 * Reuses active sockets for subsequent requests to scolaritate.usv.ro,
 * eliminating the expensive TCP/TLS handshake latency on every API call.
 * Sockets are automatically destroyed if idle for more than 15 seconds to free system resources.
 */
export const legacyAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,       // maximum sockets per host
  maxFreeSockets: 10,   // maximum free sockets to keep open
  timeout: 30000,       // 30 seconds connection timeout
  
  // PeopleSoft legacy TLS requirements
  rejectUnauthorized: true,
  minVersion: 'TLSv1',
  maxVersion: 'TLSv1.2',
  ciphers: 'ALL:@SECLEVEL=0',
  honorCipherOrder: false,
});
