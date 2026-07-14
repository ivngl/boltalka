import { Router } from "express";
import jwt from "jsonwebtoken";

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

export function topicRoutes(prisma) {
  const router = Router();
  const isSqlite = process.env.DATABASE_URL?.endsWith(".db");

  router.get("/", auth, async (req, res) => {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { title: { contains: search, ...(isSqlite ? {} : { mode: "insensitive" }) } },
            { description: { contains: search, ...(isSqlite ? {} : { mode: "insensitive" }) } },
          ],
        }
      : {};

    const topics = await prisma.topic.findMany({
      where,
      include: {
        creator: { select: { id: true, username: true, name: true, avatar: true } },
        _count: { select: { messages: true } },
        messages: {
          select: {
            sender: { select: { id: true, username: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(topics);
  });

  router.get("/:id", auth, async (req, res) => {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, username: true, name: true, avatar: true } },
        messages: {
          include: { sender: { select: { id: true, username: true, name: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!topic) return res.status(404).json({ error: "Topic not found" });
    res.json(topic);
  });

  router.post("/", auth, async (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const topic = await prisma.topic.create({
      data: {
        title,
        description: description || null,
        creatorId: req.userId,
      },
      include: {
        creator: { select: { id: true, username: true, name: true, avatar: true } },
        _count: { select: { messages: true } },
      },
    });

    res.status(201).json(topic);
  });

  router.post("/:id/messages", auth, async (req, res) => {
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const topic = await prisma.topic.findUnique({ where: { id: req.params.id } });
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    if (parentId) {
      const parent = await prisma.topicMessage.findUnique({ where: { id: parentId } });
      if (!parent || parent.topicId !== req.params.id) {
        return res.status(400).json({ error: "Invalid parent message" });
      }
    }

    const message = await prisma.topicMessage.create({
      data: {
        content,
        senderId: req.userId,
        topicId: req.params.id,
        parentId: parentId || null,
      },
      include: { sender: { select: { id: true, username: true, name: true, avatar: true } } },
    });

    await prisma.topic.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
  });

  router.put("/:topicId/messages/:messageId", auth, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const message = await prisma.topicMessage.findUnique({ where: { id: req.params.messageId } });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.senderId !== req.userId) return res.status(403).json({ error: "Not your message" });
    if (message.topicId !== req.params.topicId) return res.status(400).json({ error: "Topic mismatch" });

    const updated = await prisma.topicMessage.update({
      where: { id: req.params.messageId },
      data: { content },
      include: { sender: { select: { id: true, username: true, name: true, avatar: true } } },
    });

    res.json(updated);
  });

  router.delete("/:topicId/messages/:messageId", auth, async (req, res) => {
    const message = await prisma.topicMessage.findUnique({ where: { id: req.params.messageId } });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.senderId !== req.userId) return res.status(403).json({ error: "Not your message" });
    if (message.topicId !== req.params.topicId) return res.status(400).json({ error: "Topic mismatch" });

    await prisma.topicMessage.delete({ where: { id: req.params.messageId } });

    res.json({ success: true });
  });

  return router;
}
