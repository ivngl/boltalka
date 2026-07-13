import type { ReactNode } from "react";
import type { Conversation } from "../types.ts";

export function displayName(user: { username: string; name?: string }, alias?: string): ReactNode {
  if (alias) return alias;
  if (!user.name) return user.username;
  return (
    <>
      {user.name}{" "}
      <span className="display-username">{user.username}</span>
    </>
  );
}

export function displayNameText(user: { username: string; name?: string }, alias?: string): string {
  if (alias) return alias;
  return user.name ? `${user.name} ${user.username}` : user.username;
}

export function conversationName(conv: Conversation, currentUserId: number): string {
  if (conv.type === "group" && conv.name) return conv.name;
  const other = conv.participants?.find((p) => p.user.id !== currentUserId);
  return other?.user ? displayNameText(other.user, other.alias) : "Unknown";
}

export function otherParticipant(conv: Conversation, currentUserId: number) {
  const p = conv.participants?.find((p) => p.user.id !== currentUserId);
  return p ? { ...p.user, alias: p.alias } : undefined;
}
