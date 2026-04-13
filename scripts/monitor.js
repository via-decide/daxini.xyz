/*
  scripts/monitor.js
  Low-impact monitoring service for Zayvora node health and security events.
*/

import fs from 'fs';
import os from 'os';
import db from '../security/initDB.js';

function getMetrics() {
    const memory = process.memoryUsage();
    const load = os.loadavg();
    const uptime = os.uptime();
    
    // Security Event Stats (last 1 hour)
    const securityStats = db.prepare(`
        SELECT COUNT(*) as event_count, SUM(suspicion_delta) as total_suspicion
        FROM security_events
        WHERE timestamp > datetime('now', '-1 hour')
    `).get();

    return {
        timestamp: new Date().toISOString(),
        os_load: load[0],
        memory_used_mb: Math.floor(memory.rss / 1024 / 1024),
        system_uptime: Math.floor(uptime / 3600) + 'h',
        security: {
            events_1h: securityStats.event_count || 0,
            suspicion_pressure: securityStats.total_suspicion || 0
        }
    };
}

function runMonitor() {
    const data = getMetrics();
    const logLine = JSON.stringify(data) + '\n';
    
    fs.appendFileSync('./data/monitor_log.json', logLine);
    
    // Alert logic
    if (data.security.suspicion_pressure > 500) {
        console.error(`[ALERT] HIGH SECURITY PRESSURE DETECTED: ${data.security.suspicion_pressure}`);
    }
}

// Run every 5 minutes
setInterval(runMonitor, 5 * 60 * 1000);
console.log('[MONITOR] Zayvora health & security monitor active.');
runMonitor();
