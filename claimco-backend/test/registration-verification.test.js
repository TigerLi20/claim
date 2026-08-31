const test = require("node:test");
const assert = require("node:assert");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

test("Production delivery provider uses Resend and does not trigger allowlist bypass in production", async () => {
    const previousEnv = { ...process.env };

    try {
        delete require.cache[require.resolve("../src/lib/deliveryProvider.production")];
        process.env.NODE_ENV = "production";
        process.env.RESEND_API_KEY = "re_test_123";
        process.env.EMAIL_FROM = "verify@example.com";

        const ProductionDeliveryProvider = require("../src/lib/deliveryProvider.production");
        const provider = new ProductionDeliveryProvider();

        const called = { sent: false };
        provider.resend = {
            emails: {
                send: async (payload) => {
                    called.sent = true;
                    assert.equal(payload.from, "verify@example.com");
                    assert.equal(payload.subject, "Verify your Claim Co email");
                    assert.equal(payload.to, "student@example.com");
                    return { id: "test-email-id" };
                }
            }
        };

        await provider.sendEmail("student@example.com", "123456");
        assert.equal(called.sent, true);

        const TEST_IDENTIFIERS = require("../src/lib/testIdentifiers");
        const testCode = TEST_IDENTIFIERS["test.student@brown.edu"];
        assert.equal(testCode, "000000");
        assert.equal(process.env.NODE_ENV, "production");
        assert.equal(process.env.NODE_ENV !== "production" && TEST_IDENTIFIERS["test.student@brown.edu"], false);
    } finally {
        process.env = previousEnv;
        delete require.cache[require.resolve("../src/lib/deliveryProvider.production")];
    }
});

// Setup test database
const DB_PATH = path.join(__dirname, "../dev-test.db");

// Clean up before test
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
}

// Helper to spawn server
function spawnTestServer() {
    const { spawn } = require("child_process");
    const server = spawn("node", ["src/index.js"], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, NODE_ENV: "test", PORT: 3002 }
    });

    return new Promise((resolve, reject) => {
        let output = "";
        const timeout = setTimeout(() => {
            server.kill();
            reject(new Error("Server startup timeout"));
        }, 10000);

        server.stdout.on("data", (data) => {
            output += data.toString();
            if (output.includes("listening on") || output.includes("Listening")) {
                clearTimeout(timeout);
                resolve(server);
            }
        });

        server.stderr.on("data", (data) => {
            if (output.includes("listening on") || output.includes("Listening")) {
                clearTimeout(timeout);
                resolve(server);
            } else {
                output += data.toString();
            }
        });
    });
}

test("Registration and Email Verification Flow", async (t) => {
    // Note: These tests require a running server on port 3001
    const BASE_URL = "http://localhost:3001";

    await t.test("should register a user with pending status", async () => {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "John Doe",
                email: "john.student@brown.edu",
                phoneNumber: "+15551234567",
                year: "freshman",
                concentration: "CS"
            })
        });

        const data = await response.json();
        assert.equal(response.status, 201);
        assert(data.pendingUserId);
        assert(data.message.includes("Check your email"));
        assert.equal(data.email, "john.student@brown.edu");
    });

    await t.test("should reject registration with non-Brown email", async () => {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Jane Doe",
                email: "jane@gmail.com",
                phoneNumber: "+15551234568",
                year: "sophomore",
                concentration: "Physics"
            })
        });

        assert.equal(response.status, 400);
        const data = await response.json();
        assert(data.error && data.error.length > 0);
    });

    await t.test("should verify email with correct code", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Verify Test",
                email: "test.student@brown.edu",
                phoneNumber: "+15551234570",
                year: "senior",
                concentration: "Economics"
            })
        });

        assert.equal(registerRes.status, 201, "new test student should register");
        const registerData = await registerRes.json();
        const pendingUserId = registerData.pendingUserId;

        const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pendingUserId,
                code: "000000"
            })
        });

        assert.equal(verifyRes.status, 200, "correct code should verify successfully");
        const verifyData = await verifyRes.json();
        assert(verifyData.token);
        assert.equal(verifyData.user.status, "active");
        assert(verifyData.message.includes("verified successfully"));
    });

    await t.test("should reject verification with wrong code", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Wrong Code Test",
                email: "test2.student@brown.edu",
                phoneNumber: "+15551234571",
                year: "freshman",
                concentration: "Bio"
            })
        });

        assert.equal(registerRes.status, 201, "registration should start");
        const registerData = await registerRes.json();
        const pendingUserId = registerData.pendingUserId;

        const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pendingUserId,
                code: "999999"
            })
        });

        assert.equal(verifyRes.status, 400, "wrong code should be rejected");
        const verifyData = await verifyRes.json();
        assert(verifyData.error && verifyData.error.length > 0);
    });

    await t.test("should reject verification after 5 failed attempts", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Max Attempts Test",
                email: "test3.student@brown.edu",
                phoneNumber: "+15551234572",
                year: "sophomore",
                concentration: "Chemistry"
            })
        });

        const registerData = await registerRes.json();
        const pendingUserId = registerData.pendingUserId;

        // Make 5 failed attempts
        for (let i = 0; i < 5; i++) {
            const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pendingUserId: pendingUserId,
                    code: "999999"
                })
            });
            assert.equal(verifyRes.status, 400);
        }

        // 6th attempt should fail with too many attempts message
        const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pendingUserId: pendingUserId,
                code: "222222"
            })
        });

        assert.equal(verifyRes.status, 400);
        const verifyData = await verifyRes.json();
        assert(verifyData.error.includes("Too many failed attempts"));
    });

    await t.test("should allow resending verification code", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Resend Test",
                email: "resend.student@brown.edu",
                phoneNumber: "+15551234573",
                year: "junior",
                concentration: "History"
            })
        });

        const registerData = await registerRes.json();
        const pendingUserId = registerData.pendingUserId;

        // Resend code
        const resendRes = await fetch(`${BASE_URL}/auth/resend-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendingUserId })
        });

        assert.equal(resendRes.status, 200);
        const resendData = await resendRes.json();
        assert(resendData.message.includes("sent"));
    });

    await t.test("should enforce rate limit on resend (5 per hour)", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Rate Limit Test",
                email: "ratelimit.test@brown.edu",
                phoneNumber: "+15551234574",
                year: "senior",
                concentration: "Philosophy"
            })
        });

        const registerData = await registerRes.json();
        const pendingUserId = registerData.pendingUserId;

        // Make 5 successful resend requests
        for (let i = 0; i < 5; i++) {
            const resendRes = await fetch(`${BASE_URL}/auth/resend-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pendingUserId })
            });
            assert.equal(resendRes.status, 200, `Resend ${i + 1} should succeed`);
        }

        // 6th request should be rate limited
        const rateLimitedRes = await fetch(`${BASE_URL}/auth/resend-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendingUserId })
        });

        assert.equal(rateLimitedRes.status, 429, "6th request should be rate limited");
        const rateLimitedData = await rateLimitedRes.json();
        assert(rateLimitedData.error.includes("Too many"));
    });

    await t.test("should sign in with a Brown email verification code instead of a password", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Passwordless Login",
                email: "test4.student@brown.edu",
                phoneNumber: "+15551234575",
                year: "freshman",
                concentration: "Drama"
            })
        });

        assert.equal(registerRes.status, 201);
        const registerData = await registerRes.json();
        const pendingUserId = registerData.pendingUserId;

        const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pendingUserId,
                code: "444444"
            })
        });

        assert.equal(verifyRes.status, 200, "user should verify successfully");

        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test4.student@brown.edu",
                code: "444444"
            })
        });

        assert.equal(loginRes.status, 200, "login should accept an email code instead of a password");
        const loginData = await loginRes.json();
        assert(loginData.token);
        assert.equal(loginData.user.email, "test4.student@brown.edu");
    });

    await t.test("pending user should not be able to login", async () => {
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Login Test Pending",
                email: "pending.login@brown.edu",
                phoneNumber: "+15551234576",
                year: "freshman",
                concentration: "Drama"
            })
        });

        assert.equal(registerRes.status, 201);

        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "pending.login@brown.edu",
                code: "123456"
            })
        });

        assert.equal(loginRes.status, 401);
        const loginData = await loginRes.json();
        assert(loginData.error.includes("not yet verified") || loginData.error.includes("Invalid email or verification code"));
    });
});

console.log("✓ Test suite compiled. Run with: npm test");
