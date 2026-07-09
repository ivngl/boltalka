import { Router } from "express";
import jwt from "jsonwebtoken";
import { getVapidPublicKey } from "../push.js";

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

export function pushRoutes(prisma) {
  const router = Router();

  router.get("/vapid-public-key", (req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  router.post("/subscribe", auth, async (req, res) => {
    const { endpoint, p256dh, auth: authKey } = req.body;
    if (!endpoint || !p256dh || !authKey) {
      return res.status(400).json({ error: "Missing subscription fields" });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth: authKey, userId: req.userId },
      create: { endpoint, p256dh, auth: authKey, userId: req.userId },
    });
    res.json({ success: true });
  });

  router.delete("/subscribe", auth, async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId } });
    res.json({ success: true });
  });

  return router;
}
