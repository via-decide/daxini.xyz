/*
  /security/rateLimiter.js
  Server-side rate limiting with sliding window behavior.
*/

export class RateLimiter {
    constructor(limit = 50, windowMs = 15 * 60 * 1000) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.requests = new Map(); // ip -> [timestamps]
    }

    /**
     * Check if a request is allowed.
     * @param {string} ip 
     * @returns {boolean} - True if allowed, False if exceeded
     */
    check(ip) {
        const now = Date.now();
        const timestamps = this.requests.get(ip) || [];
        
        // Filter out expired timestamps
        const active = timestamps.filter(t => (now - t) < this.windowMs);
        
        if (active.length >= this.limit) {
            this.requests.set(ip, [...active, now]); // Still track the excessive request
            return false;
        }

        active.push(now);
        this.requests.set(ip, active);
        return true;
    }

    getUsage(ip) {
        return (this.requests.get(ip) || []).length;
    }
}

export const globalLimiter = new RateLimiter();
