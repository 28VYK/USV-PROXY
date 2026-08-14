/**
 * metrics-tracker.js — In-memory session and metrics tracking for Prometheus.
 *
 * This module tracks active sessions, unique student counts, and cumulative logins
 * strictly in-memory (RAM) to support the stats dashboard, complying with GDPR guidelines
 * (no persistent tracking database, disk logs, or external integrations).
 */

// Initialize global in-memory maps if not present
global.activeSessions = global.activeSessions || {};
global.uniqueStudents = global.uniqueStudents || {};
global.totalLoginsCount = global.totalLoginsCount || 0;

/**
 * Registers an active session on successful login.
 */
export async function registerSession(userid) {
  if (!userid) return;
  const sessionKey = userid.toLowerCase();
  const now = Date.now();

  // 1. Add/update the active sessions map (store timestamp)
  global.activeSessions[sessionKey] = now;

  // 2. Add/update the unique students directory (store true)
  global.uniqueStudents[sessionKey] = true;

  // 3. Increment the cumulative logins counter
  global.totalLoginsCount = (global.totalLoginsCount || 0) + 1;
}

/**
 * Updates the last active timestamp of a session (called via heartbeat).
 */
export function touchSession(userid) {
  if (!userid) return;
  const sessionKey = userid.toLowerCase();
  
  // Register or update active timestamp
  global.activeSessions[sessionKey] = Date.now();
}

/**
 * Removes an active session manually (called via logout).
 */
export function removeSession(userid) {
  if (!userid) return;
  const sessionKey = userid.toLowerCase();
  if (global.activeSessions[sessionKey] !== undefined) {
    delete global.activeSessions[sessionKey];
  }
}

/**
 * Automatically cleans up sessions that haven't sent a heartbeat within the last 90 seconds.
 */
export function cleanExpiredSessions() {
  const sessions = global.activeSessions || {};
  const now = Date.now();
  const threshold = 90 * 1000; // 90 seconds

  Object.keys(sessions).forEach((key) => {
    if (now - sessions[key] > threshold) {
      delete sessions[key];
    }
  });
}

// Spin up the background cleanup task every 15 seconds in the Node.js server environment
if (typeof window === 'undefined') {
  if (global.sessionCleanupInterval === undefined) {
    global.sessionCleanupInterval = setInterval(() => {
      cleanExpiredSessions();
    }, 15000);

    if (global.sessionCleanupInterval.unref) {
      global.sessionCleanupInterval.unref();
    }
  }
}
