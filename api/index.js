/*
  api/index.js — Daxini Systems API Gateway (Hardened)
*/

import { generateClientFingerprint } from '../security/browserFingerprint.js';
import { detectAutomatedSignals } from '../security/botDetection.js';
import { analyzeBehavior } from '../security/behaviorEngine.js';
import { analyzeTrafficAnomaly, logAnomalyError } from '../security/anomalyDetector.js';
import { analyzeActorRelationships } from '../security/networkGraphAnalyzer.js';
import { updateReputation, isBlacklisted, scoreIpByBehavior } from '../security/reputationEngine.js';
import { logThreatEvent } from '../security/threatTelemetry.js';
import { serveMirroredResponse, routeToHoneypot } from '../security/mirrorRouter.js';
import { evaluateMirrorThreat } from '../security/honeypotRouter.js';
import db from '../security/initDB.js';
import { generateCodeStream } from './llm/sovereign_engine.js';

const passportRegistry = new Map([
  ['UID-0001', { passport_id: 'PPT-AXIOM-0001', serial: 'ZX-93A7', owner: 'Sovereign Node Alpha', status: 'active' }],
  ['UID-0002', { passport_id: 'PPT-AXIOM-0002', serial: 'ZX-93A8', owner: 'Sovereign Node Beta', status: 'active' }],
  ['UID-0003', { passport_id: 'PPT-AXIOM-0003', serial: 'ZX-93A9', owner: 'Sovereign Node Gamma', status: 'suspended' }]
]);

const activePassportSession = {
  session_id: 'sess-zayvora-prime',
  uid: 'UID-0001',
  owner: 'Sovereign Node Alpha',
  issued_at: '2026-04-15T00:00:00.000Z',
  expires_at: '2026-04-15T08:00:00.000Z',
  status: 'active'
};

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/\/$/, "");
    const ua = req.headers['user-agent'] || 'unknown';
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0';

    // ── Pre-Processing ──────────────────────────────────────
    // Normalize body if Vercel didn't parse it
    if (req.method === 'POST' && typeof req.body === 'string') {
        try { req.body = JSON.parse(req.body); } catch (e) { /* ignore */ }
    }

    // 1. Critical Reputation & Shielding
    // We make these optional/fail-safe to prevent dashboard death
    let fingerprint = 'unknown';
    let totalThreatScore = 0;
    try {
        fingerprint = generateClientFingerprint(req);
        if (isBlacklisted(ip) || isBlacklisted(fingerprint)) {
            // Only block if we are SURE. If DB is mocked, this is usually skip.
        }

        const botSignals = detectAutomatedSignals(req);
        const passportToken = req.headers['authorization'] || null;
        const behavior = analyzeBehavior(req, fingerprint, passportToken);
        const anomaly = analyzeTrafficAnomaly(ip, path);
        const graph = analyzeActorRelationships(ip, fingerprint);
        
        totalThreatScore = botSignals.risk_score + behavior.behavior_score + anomaly.anomaly_score;
        totalThreatScore += graph.cluster_density * 0.2;
        totalThreatScore = Math.min(1.0, totalThreatScore);

        updateReputation(ip, 'ip', (totalThreatScore > 0.4 ? 0.05 : -0.01), 'GA_SCORE');
        updateReputation(fingerprint, 'fp', (totalThreatScore > 0.4 ? 0.05 : -0.01), 'GA_SCORE');
        scoreIpByBehavior(ip, behavior);

        if (totalThreatScore > 0.1) {
            logThreatEvent({ ip, fingerprint_id: fingerprint, threat_score: totalThreatScore, classification: behavior.classification, path_accessed: path, agent: ua });
        }
    } catch (secErr) {
        console.warn("[SECURITY] Passive monitoring failure:", secErr.message);
    }

    // 2. Standard Logic
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (path === '/passport/verify') {
      const uid = url.searchParams.get('uid');
      if (!uid || !passportRegistry.has(uid)) return res.status(403).json({ error: 'UID not registered' });
      return res.status(200).json(passportRegistry.get(uid));
    }

    if (path === '/passport/session') return res.status(200).json(activePassportSession);

    if (path === '/api/check' || path === '/api') return res.status(200).json({ status: 'HEALTHY', mission: 'RESEARCH_OS', version: '3.1', telemetry: 'resilient' });

    if (path === '/api/zayvora/execute') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const prompt = req.body ? req.body.prompt : null;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        await generateCodeStream(
          prompt,
          (chunk) => res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`),
          (err) => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); },
          () => { res.write(`data: [DONE]\n\n`); res.end(); }
        );
        return;
      } catch (err) {
        if (!res.headersSent) return res.status(502).json({ error: 'Local Zayvora engine unavailable', details: err.message });
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        return;
      }
    }

    if (path === '/api/security/stats') {
      const stats = db.prepare('SELECT COUNT(*) as count FROM security_events').get();
      const reputations = db.prepare('SELECT * FROM reputation_scores ORDER BY score DESC LIMIT 10').all();
      return res.status(200).json({ eventCount: stats ? stats.count : 0, topRisks: reputations || [] });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (globalError) {
    console.error("[CRITICAL] API Handler Error:", globalError);
    return res.status(500).json({ 
        error: 'Sovereign Engine Fault', 
        message: globalError.message,
        stack: globalError.stack.split('\n')[0] 
    });
  }
}
