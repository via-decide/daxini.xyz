/*
  security/initDB.js
  Initializes the telemetry database with a resilient mock fallback.
  Prevents 500 errors on Vercel caused by native dependency failures.
*/

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Database class to mimic better-sqlite3 API
class MockDatabase {
    constructor(path) {
        console.warn(`[SECURITY] Using In-Memory Mock Database (Reason: ${path === ':memory:' ? 'Requested' : 'Native Driver Failed'})`);
        this.inMemory = {};
    }
    prepare(sql) {
        return {
            run: (...args) => ({ changes: 0, lastInsertRowid: 0 }),
            get: (...args) => undefined,
            all: (...args) => []
        };
    }
    transaction(fn) { return fn; }
    close() {}
}

let db;

try {
    // We use a dynamic import to prevent top-level crashes if the library is missing
    const { default: Database } = await import('better-sqlite3');
    
    try {
        const dbPath = path.join(__dirname, '../data/telemetry.db');
        db = new Database(dbPath);
    } catch (err) {
        // Fallback to SQLite in-memory if disk is read-only
        db = new Database(':memory:');
    }
} catch (err) {
    // total fallback to Mock if better-sqlite3 is completely missing (Vercel case)
    db = new MockDatabase('Vercel Fallback');
}

// Ensure tables exist (on whichever DB we have)
const schema = [
    `CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_hash TEXT,
        fingerprint_id TEXT,
        endpoint TEXT,
        behavior_pattern TEXT,
        user_agent TEXT,
        suspicion_delta INTEGER,
        threat_score REAL
    )`,
    `CREATE TABLE IF NOT EXISTS reputation_scores (
        target_id TEXT PRIMARY KEY,
        target_type TEXT,
        score REAL DEFAULT 0.0,
        trust_flags TEXT,
        last_incident DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS threat_edges (
        source_id TEXT,
        target_id TEXT,
        relation_type TEXT,
        weight REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(source_id, target_id, relation_type)
    )`,
    `CREATE TABLE IF NOT EXISTS security_statistics (
        target_id TEXT,
        window_start INTEGER,
        req_count INTEGER DEFAULT 0,
        err_count INTEGER DEFAULT 0,
        unique_endpoints TEXT,
        PRIMARY KEY(target_id, window_start)
    )`
];

schema.forEach(sql => {
    try {
        db.prepare(sql).run();
    } catch (e) {
        console.error("[SECURITY] Schema Init Error:", e.message);
    }
});

console.log('[SECURITY] Resilient database initialized.');

export default db;
