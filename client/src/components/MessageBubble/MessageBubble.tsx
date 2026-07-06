import { useTranslation } from "react-i18next";
import type { Message } from "../../types.ts";
import "./MessageBubble.css";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  onDelete: (messageId: number) => void;
}

export default function MessageBubble({ message, isMine, onDelete }: MessageBubbleProps) {
  const { t } = useTranslation();
  const secureUrl = message.fileUrl?.replace(/^http:\/\//i, "https://");

  if (message.deletedAt) {
    return (
      <div className={`msg deleted ${isMine ? "mine" : ""}`}>
        <div className="msg-deleted-label">{t("chat.message_deleted")}</div>
        <div className="msg-time">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    );
  }

  return (
    <div className={`msg ${isMine ? "mine" : ""}`}>
      {!isMine && <div className="msg-sender">{message.sender?.username}</div>}
      {message.fileUrl && (
        <div className="msg-file">
          {message.fileType?.startsWith("image/") ? (
            <img src={secureUrl} alt={message.fileName ?? ""} className="msg-image" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : message.fileType?.startsWith("video/") ? (
            <video src={secureUrl} controls className="msg-video" />
          ) : (
            <a href={secureUrl} target="_blank" rel="noopener noreferrer" className="msg-file-link" download={message.fileName}>
              📄 {message.fileName}
            </a>
          )}
        </div>
      )}
      {message.content && <div className="msg-content">{message.content}</div>}
      <div className="msg-time">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      {isMine && (
        <button className="msg-delete-btn" onClick={() => onDelete(message.id)} title={t("chat.delete_message")}>
          ×
        </button>
      )}
    </div>
  );
}
