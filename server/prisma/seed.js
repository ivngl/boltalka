import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: "alice", email: "alice@example.com", password: "password123" },
    { username: "bob", email: "bob@example.com", password: "password123" },
    { username: "charlie", email: "charlie@example.com", password: "password123" },
  ];

  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      const hashed = await bcrypt.hash(u.password, 10);
      await prisma.user.create({ data: { username: u.username, email: u.email, password: hashed } });
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
