import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MessageBubble from "../MessageBubble/MessageBubble.tsx";
import type { Message } from "../../types.ts";
import "./MessageList.css";

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  typingUsers: Record<number, boolean>;
}

export default function MessageList({ messages, currentUserId, typingUsers }: MessageListProps) {
  const { t } = useTranslation();
  const msgEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="messages">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} isMine={m.senderId === currentUserId} />
      ))}
      {Object.entries(typingUsers).filter(([, v]) => v).length > 0 && (
        <div className="typing-indicator">{t("chat.typing")}</div>
      )}
      <div ref={msgEndRef} />
    </div>
  );
}
