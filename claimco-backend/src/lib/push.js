const db = require("../db");
let messaging;

function getMessaging() {
  if (messaging) return messaging;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
  const { getMessaging: firebaseMessaging } = require("firebase-admin/messaging");
  if (!getApps().length) {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : applicationDefault();
    initializeApp({ credential });
  }
  messaging = firebaseMessaging();
  return messaging;
}

async function sendMessagePush({ recipientId, senderName, conversationId }) {
  const client = getMessaging();
  if (!client) return;
  const tokens = await db.prepare("SELECT token FROM device_tokens WHERE user_id = ?").all(recipientId);
  if (!tokens.length) return;
  const result = await client.sendEachForMulticast({
    tokens: tokens.map(row => row.token),
    notification: { title: "New message", body: `${senderName} sent you a message` },
    data: { conversationId: String(conversationId), path: `/chat/${conversationId}` },
  });
  for (const [index, response] of result.responses.entries()) {
    if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(response.error?.code)) {
      await db.prepare("DELETE FROM device_tokens WHERE token = ?").run(tokens[index].token);
    }
  }
}

module.exports = { sendMessagePush };
