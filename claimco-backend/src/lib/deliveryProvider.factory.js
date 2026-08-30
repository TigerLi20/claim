const SandboxDeliveryProvider = require("./deliveryProvider.sandbox");
const ProductionDeliveryProvider = require("./deliveryProvider.production");

/**
 * Factory function that returns the appropriate DeliveryProvider.
 * Selection is based on NODE_ENV environment variable.
 */
function createDeliveryProvider() {
    const nodeEnv = process.env.NODE_ENV || "development";

    if (nodeEnv === "production") {
        return new ProductionDeliveryProvider();
    } else {
        // development, test, staging, etc. — use sandbox
        return new SandboxDeliveryProvider();
    }
}

// Export singleton instance
const deliveryProvider = createDeliveryProvider();

module.exports = deliveryProvider;
