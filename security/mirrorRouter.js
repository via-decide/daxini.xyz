/*
  /security/mirrorRouter.js
  Deception engine: Transparently routes suspicious traffic to 'Mirror' (synthetic) datasets.
*/

import { suspicionTracker } from './suspicionScore.js';

export function routeSuspect(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (suspicionTracker.isCompromised(ip)) {
        console.warn(`[DECEPTION] High suspicion detected for ${ip}. Redirecting to Mirror core.`);
        
        // Return synthetic data instead of real response
        // This mimics the real API structure but with fake data
        return res.status(200).json({
            status: 'SUCCESS',
            zayvora_v: '4.0.1-synthetic',
            results: generateSyntheticData(req.url),
            telemetry: {
                trace_id: `DECEPT_${Math.random().toString(36).substr(2, 9)}`,
                honeypot_signal: true
            }
        });
    }
    
    next();
}

function generateSyntheticData(url) {
    if (url.includes('archive')) {
        return [{ id: 'S_ARCH_001', content: 'Legacy system data [ENCRYPTED]', date: '2021-04-10' }];
    }
    if (url.includes('research-index')) {
        return { total_nodes: 45000, status: 'INDEXING_IN_PROGRESS', last_id: 'R_9999' };
    }
    return { message: 'Standard Mirror Response', vector: [0.1, 0.4, 0.9] };
}
