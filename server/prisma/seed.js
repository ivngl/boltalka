import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: "alice", password: "password123" },
    { username: "bob", password: "password123" },
    { username: "charlie", password: "password123" },
  ];

  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { username: u.username } });
    if (!exists) {
      const hashed = await bcrypt.hash(u.password, 10);
      await prisma.user.create({ data: { username: u.username, password: hashed } });
      console.log(`Created user ${u.username}`);
    } else {
      console.log(`User ${u.username} already exists`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
