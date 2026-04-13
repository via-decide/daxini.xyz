/*
  /security/suspicionScore.js
  Manages client reputation scores based on behavior signals.
*/

export class SuspicionScore {
    constructor() {
        this.scores = new Map(); // ip -> score
        this.THRESHOLD = 100;
    }

    /**
     * Increment the suspicion score for an IP.
     * @param {string} ip - Client IP
     * @param {number} points - Points to add
     * @param {string} signal - The reason/signal
     */
    increment(ip, points, signal) {
        const current = this.scores.get(ip) || 0;
        const updated = current + points;
        this.scores.set(ip, updated);
        
        console.warn(`[SECURITY] Suspicion increased for ${ip} [+${points}]: ${signal} (Total: ${updated})`);
        
        return updated;
    }

    /**
     * Check if an IP should be rerouted to deception.
     * @param {string} ip 
     */
    isCompromised(ip) {
        return (this.scores.get(ip) || 0) >= this.THRESHOLD;
    }

    /**
     * Decay scores over time (e.g., call this once an hour)
     */
    decay() {
        for (const [ip, score] of this.scores) {
            if (score > 0) {
                this.scores.set(ip, Math.max(0, score - 5));
            }
        }
    }
}

export const suspicionTracker = new SuspicionScore();
