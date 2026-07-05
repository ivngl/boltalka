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

export function conversationRoutes(prisma, io) {
  const router = Router();

  /**
   * @openapi
   * /conversations:
   *   get:
   *     tags: [Conversations]
   *     summary: List all conversations for the current user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of conversations
   *       401:
   *         description: Unauthorized
   */
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
          where: { deletedAt: null },
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

  /**
   * @openapi
   * /conversations/users:
   *   get:
   *     tags: [Conversations]
   *     summary: List all other users
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of users
   *       401:
   *         description: Unauthorized
   */
  router.get("/users", auth, async (req, res) => {
    const users = await prisma.user.findMany({
      where: { id: { not: req.userId } },
      select: { id: true, username: true, avatar: true },
    });
    res.json(users);
  });

  /**
   * @openapi
   * /conversations/{id}:
   *   get:
   *     tags: [Conversations]
   *     summary: Get a single conversation
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Conversation details
   *       403:
   *         description: Not a participant
   *       404:
   *         description: Not found
   */
  router.get("/:id", auth, async (req, res) => {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, username: true } } },
        },
      },
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    const isParticipant = conversation.participants.some((p) => p.userId === req.userId);
    if (!isParticipant) return res.status(403).json({ error: "Not a participant" });
    res.json(conversation);
  });

  /**
   * @openapi
   * /conversations/{id}/messages:
   *   get:
   *     tags: [Conversations]
   *     summary: Get messages for a conversation
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Conversation ID
   *       - in: query
   *         name: before
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Cursor for pagination (ISO date)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Number of messages to fetch
   *     responses:
   *       200:
   *         description: List of messages
   *       401:
   *         description: Unauthorized
   */
  router.get("/:id/messages", auth, async (req, res) => {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;
    const where = { conversationId: id, deletedAt: null };
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

  /**
   * @openapi
   * /conversations/{id}/messages:
   *   post:
   *     tags: [Conversations]
   *     summary: Send a message via REST
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content:
   *                 type: string
   *               fileUrl:
   *                 type: string
   *               fileName:
   *                 type: string
   *               fileType:
   *                 type: string
   *               fileSize:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Message sent
   *       403:
   *         description: Not a participant
   */
  router.post("/:id/messages", auth, async (req, res) => {
    const { id } = req.params;
    const { content, fileUrl, fileName, fileType, fileSize } = req.body;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId: req.userId, conversationId: id } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const message = await prisma.message.create({
      data: {
        content: content || "",
        senderId: req.userId,
        conversationId: id,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize ? Number(fileSize) : null,
      },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    if (io) io.to(id).emit("new_message", message);
    res.status(201).json(message);
  });

  /**
   * @openapi
   * /conversations:
   *   post:
   *     tags: [Conversations]
   *     summary: Create a new conversation
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [participantIds]
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [dm, group]
   *               name:
   *                 type: string
   *               participantIds:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Conversation created
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   */
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

  /**
   * @openapi
   * /conversations/{id}:
   *   delete:
   *     tags: [Conversations]
   *     summary: Leave or delete a conversation
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Conversation ID
   *     responses:
   *       200:
   *         description: Left conversation
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Conversation not found
   */
  router.delete("/:id", auth, async (req, res) => {
    const { id } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId: req.userId, conversationId: id } },
    });
    if (!participant) return res.status(404).json({ error: "Conversation not found" });

    await prisma.conversationParticipant.delete({
      where: { userId_conversationId: { userId: req.userId, conversationId: id } },
    });

    const remaining = await prisma.conversationParticipant.count({
      where: { conversationId: id },
    });

    if (remaining === 0) {
      await prisma.message.deleteMany({ where: { conversationId: id } });
      await prisma.conversation.delete({ where: { id } });
    }

    res.json({ success: true });
  });

  return router;
}
