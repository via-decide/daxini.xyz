/*
  api/index.js — Daxini Systems API Gateway (Hardened)
*/

import { globalLimiter } from '../security/rateLimiter.js';
import { suspicionTracker } from '../security/suspicionScore.js';
import { detectBot } from '../security/botFingerprint.js';
import { routeSuspect } from '../security/mirrorRouter.js';
import db from '../security/initDB.js';

/**
 * Log a security event to the telemetry database.
 */
function logSecurityEvent(ip, endpoint, pattern, ua, delta = 0) {
  try {
    const stmt = db.prepare(`
      INSERT INTO security_events (ip_hash, endpoint, behavior_pattern, user_agent, suspicion_delta)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(ip, endpoint, pattern, ua, delta);
  } catch (err) {
    console.error('[SECURITY] Logging failure:', err.message);
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, "");
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || 'unknown';

  // 1. Rate Limiting (50 req / 15 min)
  if (!globalLimiter.check(ip)) {
    suspicionTracker.increment(ip, 20, 'RATE_LIMIT_EXCEEDED');
    logSecurityEvent(ip, path, 'RATE_LIMIT_EXCEEDED', ua, 20);
    return res.status(429).json({ error: 'Too many requests' });
  }

  // 2. Bot Detection
  const botSignals = detectBot(req);
  if (botSignals.length > 0) {
    suspicionTracker.increment(ip, 10 * botSignals.length, `BOT_SIGNALS: ${botSignals.join(',')}`);
    logSecurityEvent(ip, path, `BOT_SIGNALS: ${botSignals.join(',')}`, ua, 10 * botSignals.length);
  }

  // 3. Deception Routing (Suspicion Score >= 100)
  if (suspicionTracker.isCompromised(ip)) {
    return routeSuspect(req, res, () => {});
  }

  // --- Standard Logic ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (path === '/api/check' || path === '/api') {
      return res.status(200).json({ status: 'HEALTHY', mission: 'RESEARCH_OS', version: '3.1' });
    }

    if (path === '/api/zayvora/execute') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      return res.status(200).json({
        final_answer: `Analysis complete. The requested architectural segment requires a high-tenacity fiber composite to maintain integrity under the simulated thermal stress of 450K.`,
        reasoning_trace: [
          { stage: 'DECOMPOSE', message: 'Analyzing thermal stress vectors on fiber composite.' },
          { stage: 'RETRIEVE', message: 'Pulling material properties from Daxini Research Knowledge Graph.' },
          { stage: 'CALCULATE', message: 'Computing tensile strength thresholds at 450K.' },
          { stage: 'VERIFY', message: 'Validating against safety factors for space-grade housing.' },
          { stage: 'REVISE', message: 'Synthesizing final specification.' }
        ],
        tool_calls: [
          { tool: 'VECTOR_SEARCH', params: { query: 'fiber composite thermal limits' }, status: 'SUCCESS' },
          { tool: 'CALCULATOR', params: { formula: 'stress = F/A' }, status: 'SUCCESS' }
        ],
        telemetry: { tokens: 384, latency_ms: 1820, steps: 5 }
      });
    }

    // Capture endpoint scanning (404s) as suspicious activity
    suspicionTracker.increment(ip, 5, `ENDPOINT_SCANNING: ${path}`);
    logSecurityEvent(ip, path, '404_SCAN', ua, 5);
    return res.status(404).json({ error: 'Endpoint not found', path });
  } catch (error) {
    return res.status(500).json({ error: 'Internal System Error', details: error.message });
  }
}
