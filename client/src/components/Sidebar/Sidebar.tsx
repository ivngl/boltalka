import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.ts";
import Avatar from "../Avatar/Avatar.tsx";
import { useTheme } from "../../ThemeContext.tsx";
import { conversationName, otherParticipant } from "../helpers.tsx";
import "./Sidebar.css";
import ConversationItem from "../ConversationItem/ConversationItem.tsx";
import { SettingsIcon } from "../Icons/index.ts";
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
  onAliasChanged?: (conversationId: number, userId: number, alias: string | null) => void;
  onParticipantClick?: (participant: { user: { id: number; username: string; name?: string }; alias?: string; joinedAt?: string }, conversationId?: number) => void;
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
  onAliasChanged,
  onParticipantClick,
}: SidebarProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [chatSearch, setChatSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-left">
          <div onClick={onOpenProfile} className="header-avatar">
            <Avatar username={user.username} avatar={user.avatar} size={28} />
          </div>
          <div className="header-user-info">
            <span className="header-display-name">{user.name || user.username}</span>
            <span className="header-username">{user.username}</span>
          </div>
        </div>
        <div className="sidebar-header-right">
          <div className="menu-wrapper">
            <button onClick={() => setMenuOpen((p) => !p)} className="menu-btn" title="Menu">
              <SettingsIcon />
            </button>
            {menuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="menu-dropdown">
                  <button onClick={() => { toggleTheme(); setMenuOpen(false); }} className="menu-item">
                    <span className="menu-icon">{theme === "light" ? "🌙" : "☀️"}</span> {theme === "light" ? t("menu.dark_mode") : t("menu.light_mode")}
                  </button>
                  <button onClick={() => { i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru"); setMenuOpen(false); }} className="menu-item">
                    <span className="lang-icon">{i18n.language === "ru" ? "EN" : "RU"}</span> {i18n.language === "ru" ? "English" : "Русский"}
                  </button>
                  <div className="menu-divider" />
                  <button onClick={() => { onLogout(); setMenuOpen(false); }} className="menu-item menu-item-logout">
                    <span className="menu-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.89-2-2-2z" /></svg></span> {t("chat.logout")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="sidebar-search">
        <input
          type="text"
          placeholder={t("chat.search")}
          value={chatSearch}
          onChange={(e) => setChatSearch(e.target.value)}
        />
        <button className="new-chat-btn" onClick={() => setNewChatOpen(true)}><span className="new-chat-icon">+</span></button>
      </div>
      <div className="conv-list">
        {conversations
          .filter((c) => conversationName(c, user.id).toLowerCase().includes(chatSearch.toLowerCase()))
          .map((c) => {
            const textName = conversationName(c, user.id);
            const other = otherParticipant(c, user.id);
            const displayNameNode = other ? (other.alias || other.name ) : textName;
            return (
              <ConversationItem
                key={c.id}
                conversation={c}
                name={displayNameNode}
                displayName={textName}
                username={other?.username}
                currentUserId={user.id}
                isActive={activeConv?.id === c.id}
                online={onlineUsers.has(other?.id ?? 0)}
                onSelect={() => onSelectConversation(c)}
                onDeleteRequest={() => onDeleteRequest(c.id)}
                onAliasChanged={onAliasChanged}
                onOpenProfile={() => { if (other && onParticipantClick) onParticipantClick({ user: other, alias: other.alias }, c.id); }}
                onAvatarClick={onParticipantClick}
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
