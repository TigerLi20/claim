const db = require("../db");
const deliveryProvider = require("./deliveryProvider.factory");
const { shouldSendAwayEmail } = require("./presence");

async function getUserEmail(userId) {
  if (!userId) return null;
  const user = await db.prepare("SELECT email FROM users WHERE id = ?").get(userId);
  return user?.email || null;
}

function isEmailAllowed(type) {
  if (!type) return false;
  const allowed = new Set([
    "task_application",
    "task_confirmed",
    "task_confirmation_sent",
    "task_declined",
    "review_request",
    "service_purchase",
    "service_confirmed",
    "service_confirmation_sent",
    "service_declined",
    "message",
  ]);
  return allowed.has(type);
}

async function sendMaybe(userId, options = {}) {
  const { type, subject, text, html, force = false } = options;
  if (!userId) return false;
  if (!force && !isEmailAllowed(type)) return false;

  try {
    const email = await getUserEmail(userId);
    if (!email) return false;

    if (!force && !shouldSendAwayEmail(userId)) {
      return false;
    }

    await deliveryProvider.sendEmail(email, subject, text, html);
    return true;
  } catch (error) {
    console.error("[notificationEmail] Failed to send email:", error);
    return false;
  }
}

async function sendDirectMessageEmail({ recipientId, senderId, messageText, conversationId }) {
  if (!recipientId || !senderId || !messageText) return false;
  const sender = await db.prepare("SELECT name FROM users WHERE id = ?").get(senderId);
  const senderName = sender?.name || "Someone";
  const preview = String(messageText).trim().slice(0, 180);

  return sendMaybe(recipientId, {
    type: "message",
    subject: `New message from ${senderName} on Claim`,
    text: `${senderName} sent you a message: ${preview}${preview.length >= 180 ? "..." : ""}\n\nOpen the app to reply.`,
    html: `
      <h2>New message from ${senderName}</h2>
      <p>${senderName} sent you a message:</p>
      <blockquote>${preview}${preview.length >= 180 ? "..." : ""}</blockquote>
      <p><a href="${process.env.APP_URL || "http://localhost:5173"}/messages/${conversationId}">Open the conversation</a></p>
    `,
    force: false,
  });
}

module.exports = {
  sendMaybe,
  sendDirectMessageEmail,
};
