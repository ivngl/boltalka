import type { Conversation } from "../types.ts";

export function conversationName(conv: Conversation, currentUserId: number): string {
  if (conv.type === "group" && conv.name) return conv.name;
  const other = conv.participants?.find((p) => p.user.id !== currentUserId);
  return other?.user?.username || "Unknown";
}

export function otherParticipant(conv: Conversation, currentUserId: number) {
  return conv.participants?.find((p) => p.user.id !== currentUserId)?.user;
}
