import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
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

const allowedOrigins = process.env.CLIENT_URL?.split(",") || [];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
}));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes(prisma));
app.use("/conversations", conversationRoutes(prisma));

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins.includes("*") ? "*" : allowedOrigins },
});

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

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
          content: data.content,
          senderId: userId,
          conversationId: data.conversationId,
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
