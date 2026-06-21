import { Router } from "express";
import jwt from "jsonwebtoken";

function auth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });
  try {
    req.userId = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET).userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function conversationRoutes(prisma) {
  const router = Router();

  router.get("/", auth, async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.userId } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(conversations);
  });

  router.get("/:id/messages", auth, async (req, res) => {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;
    const where = { conversationId: id };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    });
    res.json(messages.reverse());
  });

  router.post("/", auth, async (req, res) => {
    const { type, name, participantIds } = req.body;
    if (!participantIds?.length) {
      return res.status(400).json({ error: "Need at least one participant" });
    }
    const allIds = [...new Set([req.userId, ...participantIds])];
    if (type === "dm" && allIds.length === 2) {
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "dm",
          AND: [
            { participants: { some: { userId: allIds[0] } } },
            { participants: { some: { userId: allIds[1] } } },
          ],
        },
        include: {
          participants: {
            include: { user: { select: { id: true, username: true, avatar: true } } },
          },
        },
      });
      if (existing) return res.json(existing);
    }
    const conversation = await prisma.conversation.create({
      data: {
        type: type || "dm",
        name: name || null,
        ownerId: type === "group" ? req.userId : null,
        participants: {
          create: allIds.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });
    res.status(201).json(conversation);
  });

  router.get("/users", auth, async (req, res) => {
    const users = await prisma.user.findMany({
      where: { id: { not: req.userId } },
      select: { id: true, username: true, avatar: true },
    });
    res.json(users);
  });

  return router;
}
