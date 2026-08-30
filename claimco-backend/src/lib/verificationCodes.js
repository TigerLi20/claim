const crypto = require("crypto");

/**
 * Generate a random 6-digit verification code.
 * @returns {string} - 6-digit code as string (e.g., "123456")
 */
function generateCode() {
    return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

/**
 * Hash a verification code using SHA-256.
 * Codes are always stored hashed in the database, never plaintext.
 * @param {string} code - 6-digit code to hash
 * @returns {string} - Hex-encoded SHA-256 hash
 */
function hashCode(code) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Calculate expiry timestamp (current time + 10 minutes).
 * @returns {string} - ISO timestamp string
 */
function getExpiryTime() {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    return expiresAt.toISOString();
}

/**
 * Check if a verification code has expired.
 * @param {string} expiresAt - ISO timestamp string from database
 * @returns {boolean} - true if expired, false if still valid
 */
function isExpired(expiresAt) {
    return new Date(expiresAt) < new Date();
}

/**
 * Validate that a submitted code matches the stored hash.
 * @param {string} submittedCode - User-submitted code (plaintext)
 * @param {string} storedHash - Hashed code from database
 * @returns {boolean} - true if match, false otherwise
 */
function verifyCode(submittedCode, storedHash) {
    const submittedHash = hashCode(submittedCode);
    return submittedHash === storedHash;
}

/**
 * Extract domain from email address.
 * @param {string} email - Email address
 * @returns {string} - Domain portion (e.g., "brown.edu" from "user@brown.edu")
 */
function extractEmailDomain(email) {
    const parts = email.toLowerCase().split("@");
    return parts.length === 2 ? parts[1] : null;
}

/**
 * Normalize email to lowercase for consistency.
 * @param {string} email - Raw email input
 * @returns {string} - Lowercase email
 */
function normalizeEmail(email) {
    return email.toLowerCase();
}

module.exports = {
    generateCode,
    hashCode,
    getExpiryTime,
    isExpired,
    verifyCode,
    extractEmailDomain,
    normalizeEmail,
};
