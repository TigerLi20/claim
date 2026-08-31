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
const supportRoutes = require("./routes/support");
const http = require("http");
const { Server } = require("socket.io");
const registerChatSocket = require("./sockets/chat");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Copy .env.example to .env before starting the server.");
  process.exit(1);
}

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:3000").split(",").map((origin) => origin.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
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
app.use("/api/support", supportRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "File size is too large. The maximum uploaded image size is 600 KB after compression." });
  }
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3001;
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
registerChatSocket(io);

async function cleanupAbandonedPendingUsers() {
  const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
  const isoTime = cutoffTime.toISOString();
  const isPostgres = !!process.env.DATABASE_URL;

  const verificationCleanupSql = isPostgres
    ? "DELETE FROM verification_codes WHERE pending_user_id IN (SELECT id FROM users WHERE status = 'pending' AND created_at < $1::timestamptz)"
    : "DELETE FROM verification_codes WHERE pending_user_id IN (SELECT id FROM users WHERE status = 'pending' AND created_at < datetime(?, 'auto'))";

  const userCleanupSql = isPostgres
    ? "DELETE FROM users WHERE status = 'pending' AND created_at < $1::timestamptz"
    : "DELETE FROM users WHERE status = 'pending' AND created_at < datetime(?, 'auto')";

  // First delete verification codes for abandoned users (foreign key constraint)
  await db.prepare(verificationCleanupSql).run(isoTime);

  // Then delete the abandoned pending users
  const result = await db.prepare(userCleanupSql).run(isoTime);
  if (result.changes > 0) {
    console.log(`[Cleanup] Deleted ${result.changes} abandoned pending users`);
  }
}
const rateLimiter = require("./lib/rateLimiter");

Promise.resolve(db.ready).then(async () => {
  await taskRoutes.expireUnclaimableTasks();
  setInterval(() => taskRoutes.expireUnclaimableTasks().catch(console.error), 30000);
  await cleanupAbandonedPendingUsers();
  setInterval(() => cleanupAbandonedPendingUsers().catch(console.error), 10 * 60 * 1000);
  setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000);

  httpServer.listen(PORT, () => {
    console.log(`Claim backend listening on port ${PORT}`);
  });
}).catch(() => {
  process.exit(1);
});
