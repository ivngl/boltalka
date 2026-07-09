import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import multer from "multer";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import cors from "cors";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authRoutes } from "./routes/auth.js";
import { conversationRoutes } from "./routes/conversations.js";
import { pushRoutes } from "./routes/push.js";
import { initPush, sendNotification } from "./push.js";

const prisma = new PrismaClient();
const app = express();
app.set("trust proxy", 2);
const httpServer = createServer(app);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get("/health", (req, res) => res.json({ ok: true }));

const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Boltalka API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [
    path.join(__dirname, "routes/*.js"),
    path.join(__dirname, "index.js"),
  ],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.get("/api/openapi.json", (req, res) => res.json(specs));

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  try {
    req.userId = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET).userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.use("/uploads", express.static(uploadsDir));

/**
 * @openapi
 * /upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 */
app.post("/upload", auth, upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file provided" });
  res.json({
    url: `${process.env.URL_PROTOCOL || "https"}://${req.get("host")}/uploads/${file.filename}`,
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
  });
});

let pubClient, subClient;
try {
  if (process.env.REDIS_URL) {
    pubClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });
    subClient = pubClient.duplicate();
    pubClient.on("error", () => {});
    pubClient.on("close", () => {});
    subClient.on("error", () => {});
    subClient.on("close", () => {});
  }
} catch {
  console.log("Redis unavailable — running without adapter");
}

process.on("unhandledRejection", () => {});

const io = new Server(httpServer, { cors: { origin: allowedOrigins } });

if (pubClient && subClient) {
  try {
    io.adapter(createAdapter(pubClient, subClient));
  } catch {}
}

const userSockets = new Map();
initPush();

app.use("/auth", authRoutes(prisma));
app.use("/conversations", conversationRoutes(prisma, io));
app.use("/api/push", pushRoutes(prisma));

/**
 * @openapi
 * /api/turn-config:
 *   get:
 *     tags: [Calls]
 *     summary: Get TURN server credentials for WebRTC
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TURN config object (null if not configured)
 */
app.get("/api/turn-config", auth, (req, res) => {
  const secret = process.env.TURN_SECRET;
  if (!secret) return res.json(null);
  const expiry = Math.floor(Date.now() / 1000) + 86400;
  const username = `${expiry}:${req.userId}`;
  const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");
  res.json({
    url: process.env.TURN_URL || `turn:${req.hostname}:3478`,
    username,
    credential,
  });
});

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  userSockets.set(userId, socket.id);
  socket.join(`user:${userId}`);
  for (const [onlineUserId] of userSockets) {
    if (onlineUserId !== userId) {
      socket.emit("presence", { userId: onlineUserId, online: true });
    }
  }
  socket.broadcast.emit("presence", { userId, online: true });

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on("send_message", async (data, ack) => {
    try {
      const message = await prisma.message.create({
        data: {
          content: data.content || "",
          senderId: userId,
          conversationId: data.conversationId,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          fileSize: data.fileSize ? Number(data.fileSize) : null,
        },
        include: { sender: { select: { id: true, username: true, avatar: true } } },
      });
      io.to(data.conversationId).emit("new_message", message);

      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: data.conversationId, userId: { not: userId } },
        include: { user: { select: { pushSubscriptions: true } } },
      });

      for (const p of participants) {
        if (userSockets.has(p.userId)) continue;
        for (const sub of p.user.pushSubscriptions) {
          const result = await sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            { title: message.sender?.username || "Boltalka", body: message.content || (data.fileName ? `Sent a file: ${data.fileName}` : ""), url: "/" },
          );
          if (result.expired) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        }
      }

      if (ack) ack({ success: true, message });
    } catch (err) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  socket.on("typing", ({ conversationId }) => {
    socket.to(conversationId).emit("typing", { userId, conversationId });
  });

  socket.on("stop_typing", ({ conversationId }) => {
    socket.to(conversationId).emit("stop_typing", { userId, conversationId });
  });

  socket.on("mark_read", async ({ conversationId }) => {
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, status: "sent" },
      data: { status: "read" },
    });
    io.to(conversationId).emit("messages_read", {
      conversationId, userId,
    });
  });

  socket.on("delete_message", async ({ messageId, conversationId }, ack) => {
    try {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return ack?.({ success: false, error: "Message not found" });
      if (message.senderId !== userId) return ack?.({ success: false, error: "Not your message" });
      if (message.conversationId !== conversationId) return ack?.({ success: false, error: "Conversation mismatch" });

      await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
      });

      io.to(conversationId).emit("message_deleted", { messageId, conversationId });
      if (ack) ack({ success: true });
    } catch (err) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  socket.on("call_user", ({ calleeId, conversationId, callType }) => {
    const calleeSocketId = userSockets.get(calleeId);
    if (!calleeSocketId) {
      socket.emit("call_failed", { reason: "User offline" });
      return;
    }
    io.to(`user:${calleeId}`).emit("incoming_call", {
      callerId: userId,
      conversationId,
      callType: callType || "video",
    });
  });

  socket.on("accept_call", ({ callerId }) => {
    io.to(`user:${callerId}`).emit("call_accepted", {
      calleeId: userId,
    });
  });

  socket.on("reject_call", ({ callerId }) => {
    io.to(`user:${callerId}`).emit("call_rejected", {
      calleeId: userId,
    });
  });

  socket.on("offer", ({ targetId, sdp }) => {
    console.log("[offer] from:", userId, "to:", targetId);
    io.to(`user:${targetId}`).emit("offer", { sdp, from: userId });
  });

  socket.on("answer", ({ targetId, sdp }) => {
    console.log("[answer] from:", userId, "to:", targetId);
    io.to(`user:${targetId}`).emit("answer", { sdp, from: userId });
  });

  socket.on("ice_candidate", ({ targetId, candidate }) => {
    io.to(`user:${targetId}`).emit("ice_candidate", { candidate, from: userId });
  });

  socket.on("end_call", ({ targetId }) => {
    io.to(`user:${targetId}`).emit("call_ended", { userId });
  });

  socket.on("toggle_audio", ({ targetId, muted }) => {
    io.to(`user:${targetId}`).emit("user_audio_toggled", { userId, muted });
  });

  socket.on("toggle_video", ({ targetId, enabled }) => {
    io.to(`user:${targetId}`).emit("user_video_toggled", { userId, enabled });
  });

  socket.on("disconnect", () => {
    userSockets.delete(userId);
    io.emit("presence", { userId, online: false });
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
