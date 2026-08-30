const nodemailer = require("nodemailer");
const DeliveryProvider = require("./deliveryProvider");
const TEST_IDENTIFIERS = require("./testIdentifiers");

/**
 * Sandbox DeliveryProvider for non-production use.
 * 
 * Uses Ethereal Email (free fake SMTP) for realistic email testing.
 * In test mode, uses hardcoded test identifiers to bypass email sending.
 * 
 * Ethereal requires no API keys or setup — nodemailer creates credentials on first call.
 */
class SandboxDeliveryProvider extends DeliveryProvider {
    constructor() {
        super();
        this.transporter = null;
        this.initPromise = null;
    }

    /**
     * Initialize Ethereal transporter (lazy-loaded on first use)
     */
    async init() {
        if (this.transporter) {
            return; // Already initialized
        }

        if (this.initPromise) {
            return this.initPromise; // Wait for in-flight initialization
        }

        this.initPromise = (async () => {
            try {
                // Create Ethereal test account (free, no registration needed)
                const testAccount = await nodemailer.createTestAccount();

                this.transporter = nodemailer.createTransport({
                    host: testAccount.smtp.host,
                    port: testAccount.smtp.port,
                    secure: testAccount.smtp.secure,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });

                console.log("[DeliveryProvider] Initialized Ethereal test account for sandbox email");
            } catch (err) {
                console.error("[DeliveryProvider] Failed to initialize Ethereal:", err.message);
                console.warn("[DeliveryProvider] Falling back to console-only mode");
                this.transporter = null; // Mark as unavailable
            }
        })();

        await this.initPromise;
    }

    /**
     * Send verification code via email (Ethereal or console fallback)
     */
    async sendEmail(to, code) {
        const normalizedEmail = to.toLowerCase();

        // Check if this is a test identifier (non-production only)
        if (process.env.NODE_ENV !== "production" && TEST_IDENTIFIERS[normalizedEmail]) {
            console.log(`[DeliveryProvider] Test identifier detected: ${normalizedEmail}`);
            console.log(`  Code: ${code} (hardcoded, no email sent)`);
            return;
        }

        // Initialize transporter if not already done
        await this.init();

        // If Ethereal failed to initialize, fall back to console logging
        if (!this.transporter) {
            console.log(`[DeliveryProvider] Email (console fallback): ${normalizedEmail}`);
            console.log(`  Code: ${code}`);
            console.warn("[DeliveryProvider] Use test identifiers for automated E2E tests");
            return;
        }

        // Send via Ethereal
        try {
            const info = await this.transporter.sendMail({
                from: '"Claim Co" <noreply@claimco.test>',
                to: normalizedEmail,
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

            // Ethereal provides a preview URL for inspection
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`[DeliveryProvider] Email sent to ${normalizedEmail}`);
            if (previewUrl) {
                console.log(`  Preview: ${previewUrl}`);
            }
        } catch (err) {
            console.error(`[DeliveryProvider] Failed to send email to ${normalizedEmail}:`, err.message);
            throw err;
        }
    }
}

module.exports = SandboxDeliveryProvider;
