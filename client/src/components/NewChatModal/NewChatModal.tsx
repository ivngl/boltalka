import { useState } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar.tsx";
import type { User } from "../../types.ts";
import "./NewChatModal.css";
import "../shared.css";

interface NewChatModalProps {
  users: User[];
  onlineUsers: Set<number>;
  currentUserId: number;
  onStartDM: (userId: number) => void;
  onClose: () => void;
}

export default function NewChatModal({ users, onlineUsers, currentUserId, onStartDM, onClose }: NewChatModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  return (
    <div className="new-chat-overlay" onClick={onClose}>
      <div className="new-chat-popup" onClick={(e) => e.stopPropagation()}>
        <div className="new-chat-popup-header">
          <h3>{t("chat.new_chat")}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <input
          className="new-chat-popup-search"
          type="text"
          placeholder={t("chat.search_users")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="new-chat-popup-list">
          {users
            .filter((u) => u.id !== currentUserId)
            .filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || (u.name && u.name.toLowerCase().includes(search.toLowerCase())))
            .map((u) => (
              <div key={u.id} className="user-item" onClick={() => { onStartDM(u.id); onClose(); }}>
                <Avatar username={u.username} size={28} online={onlineUsers.has(u.id)} />
                <div className="user-item-info">
                  <span className="user-item-name">{u.name || u.username}</span>
                  {u.name && <span className="user-item-username">{u.username}</span>}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
