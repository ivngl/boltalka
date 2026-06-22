import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import cors from "cors";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authRoutes } from "./routes/auth.js";
import { conversationRoutes } from "./routes/conversations.js";

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use(cors());
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

app.post("/upload", auth, upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file provided" });
  res.json({
    url: `/uploads/${file.filename}`,
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

app.use("/auth", authRoutes(prisma));
app.use("/conversations", conversationRoutes(prisma));

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const io = new Server(httpServer, { cors: { origin: "*" } });

if (pubClient && subClient) {
  try {
    io.adapter(createAdapter(pubClient, subClient));
  } catch {}
}

const userSockets = new Map();

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
  io.emit("presence", { userId, online: true });

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
    io.to(`conversation:${conversationId}`).emit("messages_read", {
      conversationId, userId,
    });
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
