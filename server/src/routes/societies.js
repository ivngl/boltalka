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

export function societyRoutes(prisma) {
  const router = Router();
  const isSqlite = process.env.DATABASE_URL?.endsWith(".db");

  router.get("/", auth, async (req, res) => {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, ...(isSqlite ? {} : { mode: "insensitive" }) } },
            { description: { contains: search, ...(isSqlite ? {} : { mode: "insensitive" }) } },
          ],
        }
      : {};

    const societies = await prisma.society.findMany({
      where,
      include: {
        creator: { select: { id: true, username: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(societies);
  });

  router.post("/", auth, async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const society = await prisma.society.create({
      data: {
        name,
        description: description || null,
        creatorId: req.userId,
      },
      include: {
        creator: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    res.status(201).json(society);
  });

  router.delete("/:id", auth, async (req, res) => {
    const society = await prisma.society.findUnique({ where: { id: req.params.id } });
    if (!society) return res.status(404).json({ error: "Society not found" });
    if (society.creatorId !== req.userId) return res.status(403).json({ error: "Not your society" });

    await prisma.society.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  });

  return router;
}
