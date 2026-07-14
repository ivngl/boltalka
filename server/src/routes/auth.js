import bcrypt from "bcryptjs";
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

export function authRoutes(prisma) {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: "Username taken" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, name: name || null },
      select: { id: true, username: true, name: true, avatar: true },
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ user, token });
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      user: { id: user.id, username: user.username, name: user.name, avatar: user.avatar },
      token,
    });
  });

  router.get("/me", auth, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, name: true, avatar: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  router.put("/profile", auth, async (req, res) => {
    const { username, name, avatar, currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const update = {};
    if (username !== undefined) {
      const taken = await prisma.user.findFirst({
        where: { username, id: { not: req.userId } },
      });
      if (taken) return res.status(409).json({ error: "Username taken" });
      update.username = username;
    }
    if (name !== undefined) {
      update.name = name || null;
    }
    if (avatar !== undefined) {
      update.avatar = avatar || null;
    }
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password required" });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: "Wrong password" });
      update.password = await bcrypt.hash(newPassword, 10);
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: update,
      select: { id: true, username: true, name: true, avatar: true },
    });
    res.json(updated);
  });

  router.delete("/profile/:id", auth, async (req, res) => {
    const { id } = req.params;

    if (req.userId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const profile = await prisma.user.findUnique({ where: { id } });
      if (!profile) return res.status(404).json({ error: "Profile not found" });

      await prisma.$transaction([
        prisma.topicMessage.deleteMany({ where: { senderId: id } }),
        prisma.topic.deleteMany({ where: { creatorId: id } }),
        prisma.message.deleteMany({ where: { senderId: id } }),
        prisma.conversationParticipant.deleteMany({ where: { userId: id } }),
        prisma.pushSubscription.deleteMany({ where: { userId: id } }),
        prisma.conversation.deleteMany({ where: { ownerId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Delete profile error:", err);
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  return router;
}
