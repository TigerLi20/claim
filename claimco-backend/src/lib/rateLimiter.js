/**
 * Simple in-memory rate limiter.
 * Tracks events by key and enforces max count per time window.
 * 
 * Note: In production, use Redis for distributed rate limiting.
 */
class RateLimiter {
    constructor() {
        this.store = {}; // key -> { timestamps: [], firstSeenAt }
    }

    /**
     * Check if an action is rate limited.
     * @param {string} key - Unique identifier (e.g., email address)
     * @param {number} maxCount - Maximum events allowed in window
     * @param {number} windowMs - Time window in milliseconds
     * @returns {object} - { allowed: boolean, remaining: number, resetAt: Date }
     */
    check(key, maxCount, windowMs) {
        const now = Date.now();

        if (!this.store[key]) {
            this.store[key] = { timestamps: [], firstSeenAt: now };
        }

        const data = this.store[key];

        // Remove old entries outside the window
        data.timestamps = data.timestamps.filter(ts => now - ts < windowMs);

        const allowed = data.timestamps.length < maxCount;
        const remaining = Math.max(0, maxCount - data.timestamps.length);

        // Calculate next reset time (when oldest entry expires)
        let resetAt = new Date(now);
        if (data.timestamps.length > 0) {
            resetAt = new Date(data.timestamps[0] + windowMs);
        }

        return { allowed, remaining, resetAt };
    }

    /**
     * Record an action.
     * @param {string} key - Unique identifier
     */
    record(key) {
        if (!this.store[key]) {
            this.store[key] = { timestamps: [], firstSeenAt: Date.now() };
        }
        this.store[key].timestamps.push(Date.now());
    }

    /**
     * Reset all tracking for a key.
     * @param {string} key - Unique identifier
     */
    reset(key) {
        delete this.store[key];
    }

    /**
     * Clean up old entries periodically (call from a scheduled task).
     * Removes entries not accessed in last hour.
     */
    cleanup() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        let removedCount = 0;

        for (const key in this.store) {
            const data = this.store[key];
            if (data.firstSeenAt < oneHourAgo && data.timestamps.length === 0) {
                delete this.store[key];
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`[RateLimiter] Cleaned up ${removedCount} old entries`);
        }
    }
}

// Export singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
