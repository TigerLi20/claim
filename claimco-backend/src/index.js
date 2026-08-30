require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const serviceRoutes = require("./routes/services");
const userRoutes = require("./routes/users");
const notificationRoutes = require("./routes/notifications");
const reviewRoutes = require("./routes/reviews");
const conversationRoutes = require("./routes/conversations");
const http = require("http");
const { Server } = require("socket.io");
const registerChatSocket = require("./sockets/chat");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Copy .env.example to .env before starting the server.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/payments", paymentRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/services", serviceRoutes);
app.use("/users", userRoutes);
app.use("/notifications", notificationRoutes);
app.use("/reviews", reviewRoutes);
app.use("/conversations", conversationRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "File size is too large. The maximum profile picture size is 2 MB." });
  }
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: true } });
registerChatSocket(io);

// Cleanup jobs
taskRoutes.expireUnclaimableTasks();
setInterval(() => taskRoutes.expireUnclaimableTasks(), 30000);

// Clean up abandoned pending users every 10 minutes
function cleanupAbandonedPendingUsers() {
  const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
  const isoTime = cutoffTime.toISOString();

  // First delete verification codes for abandoned users (foreign key constraint)
  db.prepare(
    "DELETE FROM verification_codes WHERE pending_user_id IN (SELECT id FROM users WHERE status = 'pending' AND created_at < datetime(?, 'auto'))"
  ).run(isoTime);

  // Then delete the abandoned pending users
  const result = db.prepare(
    "DELETE FROM users WHERE status = 'pending' AND created_at < datetime(?, 'auto')"
  ).run(isoTime);
  if (result.changes > 0) {
    console.log(`[Cleanup] Deleted ${result.changes} abandoned pending users`);
  }
}
cleanupAbandonedPendingUsers();
setInterval(cleanupAbandonedPendingUsers, 10 * 60 * 1000);

// Clean up rate limiter entries every hour
const rateLimiter = require("./lib/rateLimiter");
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Claim backend listening on http://localhost:${PORT}`);
});
