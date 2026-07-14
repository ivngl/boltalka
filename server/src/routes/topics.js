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
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const topic = await prisma.topic.findUnique({ where: { id: req.params.id } });
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const message = await prisma.topicMessage.create({
      data: {
        content,
        senderId: req.userId,
        topicId: req.params.id,
      },
      include: { sender: { select: { id: true, username: true, name: true, avatar: true } } },
    });

    await prisma.topic.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
  });

  return router;
}
