const jwt = require("jsonwebtoken");
const db = require("../db");
const { canAccessConversation } = require("../lib/conversations");
const { sendDirectMessageEmail } = require("../lib/notificationEmail");
const { markUserActive, markUserInactive, shouldSendAwayEmail } = require("../lib/presence");
const { sendMessagePush } = require("../lib/push");
const { createAutoReply } = require("../lib/autoReply");

module.exports = function registerChatSocket(io) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("unauthorized"));
        try {
            socket.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
            const user = await db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active'").get(socket.userId);
            if (!user) return next(new Error("unauthorized"));
            next();
        } catch (error) {
            next(new Error("unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        socket.userId = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET).sub;
        void markUserActive(socket.userId);

        socket.on("presence_heartbeat", async () => {
            await markUserActive(socket.userId);
        });

        socket.on("disconnect", async () => {
            await markUserInactive(socket.userId);
        });

        socket.on("join_conversation", async (conversationId) => {
            if (await canAccessConversation(conversationId, socket.userId)) socket.join(`conversation:${conversationId}`);
        });

        socket.on("leave_conversation", (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        socket.on("send_message", async ({ conversationId, body } = {}, acknowledge) => {
            const text = typeof body === "string" ? body.trim() : "";
            if (!text || text.length > 1000) return acknowledge?.({ error: "Message must be between 1 and 1000 characters" });
            if (!await canAccessConversation(conversationId, socket.userId)) return acknowledge?.({ error: "Conversation not found" });
            const result = await db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)").run(conversationId, socket.userId, text);
            const message = {
                id: result.lastInsertRowid,
                conversationId,
                senderId: socket.userId,
                body: text,
                createdAt: new Date().toISOString(),
            };
            acknowledge?.({ message });
            socket.to(`conversation:${conversationId}`).emit("new_message", message);

            try {
                const autoReply = await createAutoReply(conversationId, socket.userId);
                if (autoReply) {
                    socket.emit("new_message", autoReply);
                    socket.to(`conversation:${conversationId}`).emit("new_message", autoReply);
                }
            } catch (error) {
                console.error("Automatic reply failed:", error);
            }

            const conversation = await db.prepare("SELECT user_a_id, user_b_id FROM conversations WHERE id = ?").get(conversationId);
            if (conversation) {
                const recipientId = conversation.user_a_id === socket.userId ? conversation.user_b_id : conversation.user_a_id;
                if (recipientId) {
                    await sendDirectMessageEmail({
                        recipientId,
                        senderId: socket.userId,
                        messageText: text,
                        conversationId,
                    });
                    if (shouldSendAwayEmail(recipientId)) {
                        const sender = await db.prepare("SELECT name FROM users WHERE id = ?").get(socket.userId);
                        sendMessagePush({ recipientId, senderName: sender?.name || "Someone", conversationId }).catch(error => console.error("Push delivery failed:", error));
                    }
                }
            }
        });
    });
};
