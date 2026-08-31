/**
 * Abstract DeliveryProvider interface.
 * Implementations handle sending verification codes and notifications via email.
 */
class DeliveryProvider {
    /**
     * Send email content.
     * @param {string} to - Email address to send to
     * @param {string} subjectOrCode - Either a verification code or an email subject
     * @param {string} text - Plain-text body (optional)
     * @param {string} html - HTML body (optional)
     * @returns {Promise<void>}
     */
    async sendEmail(to, subjectOrCode, text, html) {
        throw new Error("sendEmail() must be implemented by subclass");
    }
}

module.exports = DeliveryProvider;
