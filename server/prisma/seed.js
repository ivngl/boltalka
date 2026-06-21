import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@test.com" },
    update: {},
    create: { username: "alice", email: "alice@test.com", password },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@test.com" },
    update: {},
    create: { username: "bob", email: "bob@test.com", password },
  });
  const charlie = await prisma.user.upsert({
    where: { email: "charlie@test.com" },
    update: {},
    create: { username: "charlie", email: "charlie@test.com", password },
  });

  const dm = await prisma.conversation.create({
    data: {
      type: "dm",
      participants: {
        create: [{ userId: alice.id }, { userId: bob.id }],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      { content: "Hey Bob!", senderId: alice.id, conversationId: dm.id },
      { content: "Hey Alice!", senderId: bob.id, conversationId: dm.id },
      { content: "How's it going?", senderId: alice.id, conversationId: dm.id },
    ],
  });

  console.log("Seeded: alice, bob, charlie (password: password123)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
