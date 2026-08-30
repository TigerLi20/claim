/**
 * Abstract DeliveryProvider interface.
 * Implementations handle sending verification codes via email.
 */
class DeliveryProvider {
    /**
     * Send a verification code via email.
     * @param {string} to - Email address to send to
     * @param {string} code - 6-digit verification code (plaintext, before hashing)
     * @returns {Promise<void>}
     */
    async sendEmail(to, code) {
        throw new Error("sendEmail() must be implemented by subclass");
    }
}

module.exports = DeliveryProvider;
