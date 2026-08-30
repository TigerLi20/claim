const DeliveryProvider = require("./deliveryProvider");

/**
 * Production DeliveryProvider.
 * 
 * Currently stubbed. To implement:
 * - Integrate with SendGrid, AWS SES, or Postmark
 * - Use environment variables for credentials (SENDGRID_API_KEY, etc.)
 * - Implement proper error handling and retries
 */
class ProductionDeliveryProvider extends DeliveryProvider {
    async sendEmail(to, code) {
        // TODO: Implement real email sending via SendGrid/SES/Postmark
        throw new Error("ProductionDeliveryProvider not yet implemented");
    }
}

module.exports = ProductionDeliveryProvider;
