import type { Message } from "../../types.ts";
import "./MessageBubble.css";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <div key={message.id} className={`msg ${isMine ? "mine" : ""}`}>
      {!isMine && <div className="msg-sender">{message.sender?.username}</div>}
      {message.fileUrl && (
        <div className="msg-file">
          {message.fileType?.startsWith("image/") ? (
            <img src={message.fileUrl} alt={message.fileName ?? ""} className="msg-image" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : message.fileType?.startsWith("video/") ? (
            <video src={message.fileUrl} controls className="msg-video" />
          ) : (
            <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="msg-file-link" download={message.fileName}>
              📄 {message.fileName}
            </a>
          )}
        </div>
      )}
      {message.content && <div className="msg-content">{message.content}</div>}
      <div className="msg-time">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
