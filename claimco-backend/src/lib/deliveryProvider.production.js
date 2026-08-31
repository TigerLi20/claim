const { Resend } = require("resend");
const DeliveryProvider = require("./deliveryProvider");

/**
 * Production DeliveryProvider using Resend.
 *
 * Uses the RESEND_API_KEY and EMAIL_FROM environment variables.
 * The provider is only used when NODE_ENV === "production".
 */
class ProductionDeliveryProvider extends DeliveryProvider {
    constructor() {
        super();
        if (!process.env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured");
        }

        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendEmail(to, code) {
        const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

        try {
            console.log("Attempting to send email via Resend to:", to);
            const result = await this.resend.emails.send({
                from,
                to,
                subject: "Verify your Claim Co email",
                html: `
                    <h2>Verify Your Email</h2>
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 36px; font-weight: bold; letter-spacing: 2px;">${code}</h1>
                    <p>This code expires in 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
                text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            });

            return result;
        } catch (err) {
            console.error("[ProductionDeliveryProvider] Failed to send email:", err);
            throw err;
        }
    }
}

module.exports = ProductionDeliveryProvider;
