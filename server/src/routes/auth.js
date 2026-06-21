import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export function authRoutes(prisma) {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return res.status(409).json({ error: "Username or email taken" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
      select: { id: true, username: true, email: true, avatar: true },
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ user, token });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
      token,
    });
  });

  router.get("/me", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No token" });
    try {
      const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, email: true, avatar: true, createdAt: true },
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  return router;
}
