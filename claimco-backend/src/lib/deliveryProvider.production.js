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

    async sendEmail(to, subjectOrCode, text, html) {
        const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
        const isVerificationCode = typeof subjectOrCode === "string" && /^\d{6}$/.test(subjectOrCode.trim());
        const subject = isVerificationCode ? "Verify your Claim email" : (subjectOrCode || "Claim update");

        const finalHtml = isVerificationCode
            ? `
                <h2>Verify Your Email</h2>
                <p>Your verification code is:</p>
                <h1 style="font-size: 36px; font-weight: bold; letter-spacing: 2px;">${subjectOrCode}</h1>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
            : (html || `<p>${text || "You have a new update on Claim."}</p>`);

        const finalText = isVerificationCode
            ? `Your verification code is: ${subjectOrCode}\n\nThis code expires in 10 minutes.`
            : (text || "You have a new update on Claim.");

        try {
            console.log("Attempting to send the email via Resend to:", to);
            const result = await this.resend.emails.send({
                from,
                to,
                subject,
                html: finalHtml,
                text: finalText,
            });

            return result;
        } catch (err) {
            console.error("[ProductionDeliveryProvider] Failed to send email:", err);
            throw err;
        }
    }
}

module.exports = ProductionDeliveryProvider;
