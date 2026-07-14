-- AlterTable: Change foreign key delete rules from RESTRICT to CASCADE
-- Safe to run even if constraints already exist with correct rules

ALTER TABLE "ConversationParticipant" DROP CONSTRAINT IF EXISTS "ConversationParticipant_userId_fkey";
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT IF EXISTS "ConversationParticipant_conversationId_fkey";
ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS "PushSubscription_userId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_senderId_fkey";

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable (IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TopicMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TopicMessage_topicId_createdAt_idx" ON "TopicMessage"("topicId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Topic" ADD CONSTRAINT "Topic_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TopicMessage" ADD CONSTRAINT "TopicMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TopicMessage" ADD CONSTRAINT "TopicMessage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "TopicMessage" ADD CONSTRAINT "TopicMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TopicMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
