import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.ts";
import Avatar from "../Avatar/Avatar.tsx";
import { useTheme } from "../../ThemeContext.tsx";
import { conversationName, otherParticipant } from "../helpers.ts";
import "./Sidebar.css";
import ConversationItem from "../ConversationItem/ConversationItem.tsx";
import NewChatModal from "../NewChatModal/NewChatModal.tsx";
import type { User, Conversation } from "../../types.ts";

interface SidebarProps {
  user: User;
  conversations: Conversation[];
  activeConv: Conversation | null;
  onlineUsers: Set<number>;
  users: User[];
  onLogout: () => void;
  onOpenProfile: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onStartDM: (userId: number) => void;
  onDeleteRequest: (convId: number) => void;
}

export default function Sidebar({
  user,
  conversations,
  activeConv,
  onlineUsers,
  users,
  onLogout,
  onOpenProfile,
  onSelectConversation,
  onStartDM,
  onDeleteRequest,
}: SidebarProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [chatSearch, setChatSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-left">
          <div onClick={onOpenProfile} className="header-avatar">
            <Avatar username={user.username} size={28} />
          </div>
        </div>
        <div className="sidebar-header-right">
          <button onClick={toggleTheme} className="sidebar-theme-btn" title="Toggle theme">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button onClick={() => i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru")} className="sidebar-lang-btn">
            {i18n.language === "ru" ? "EN" : "RU"}
          </button>
          <button onClick={onLogout} className="logout-btn">{t("chat.logout")}</button>
        </div>
      </div>
      <div className="sidebar-search">
        <input
          type="text"
          placeholder={t("chat.search")}
          value={chatSearch}
          onChange={(e) => setChatSearch(e.target.value)}
        />
        <button className="new-chat-btn" onClick={() => setNewChatOpen(true)}>+</button>
      </div>
      <div className="conv-list">
        {conversations
          .filter((c) => conversationName(c, user.id).toLowerCase().includes(chatSearch.toLowerCase()))
          .map((c) => {
            const name = conversationName(c, user.id);
            const other = otherParticipant(c, user.id);
            return (
              <ConversationItem
                key={c.id}
                conversation={c}
                name={name}
                isActive={activeConv?.id === c.id}
                online={onlineUsers.has(other?.id ?? 0)}
                onSelect={() => onSelectConversation(c)}
                onDeleteRequest={() => onDeleteRequest(c.id)}
              />
            );
          })}
      </div>
      {newChatOpen && (
        <NewChatModal
          users={users}
          onlineUsers={onlineUsers}
          currentUserId={user.id}
          onStartDM={onStartDM}
          onClose={() => setNewChatOpen(false)}
        />
      )}
    </aside>
  );
}
