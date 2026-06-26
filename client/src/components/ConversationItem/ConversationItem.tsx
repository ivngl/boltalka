import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar.tsx";
import type { Conversation } from "../../types.ts";
import "./ConversationItem.css";
import "../shared.css";

interface ConversationItemProps {
  conversation: Conversation;
  name: string;
  isActive: boolean;
  online: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
}

export default function ConversationItem({
  conversation,
  name,
  isActive,
  online,
  onSelect,
  onDeleteRequest,
}: ConversationItemProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`conv-item ${isActive ? "active" : ""}`}
      onClick={onSelect}
    >
      <Avatar username={name} />
      <div className="conv-info">
        <div className="conv-name">{name}</div>
        <div className="conv-preview">
          {conversation.messages?.[0]?.content?.slice(0, 30) || ""}
        </div>
      </div>
      <div className={`online-dot ${online ? "online" : ""}`} />
      <button
        className="conv-delete"
        onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
        title={t("chat.delete_chat")}
      >×</button>
    </div>
  );
}
