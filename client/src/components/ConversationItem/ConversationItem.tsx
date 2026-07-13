import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { setParticipantAlias } from "../../api.ts";
import type { Conversation } from "../../types.ts";
import Avatar from "../Avatar/Avatar.tsx";
import MenuIcon from "../Icons/MenuIcon.tsx";
import "../shared.css";
import "./ConversationItem.css";

interface ConversationItemProps {
  onOpenProfile: () => void;
  conversation: Conversation;
  name: ReactNode;
  displayName: string;
  username?: string;
  currentUserId: number;
  isActive: boolean;
  online: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  onAliasChanged?: (conversationId: number, userId: number, alias: string | null) => void;
  onAvatarClick?: (participant: { user: { id: number; username: string; name?: string }; alias?: string; joinedAt?: string }) => void;
}

export default function ConversationItem({
  onOpenProfile,
  conversation,
  name,
  displayName: displayNameStr,
  username,
  currentUserId,
  isActive,
  online,
  onSelect,
  onDeleteRequest,
  onAliasChanged,
  onAvatarClick,
}: ConversationItemProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const originalAliasRef = useRef("");

  useEffect(() => {
    if (editingAlias && inputRef.current) inputRef.current.focus();
  }, [editingAlias]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const other = conversation.participants?.find((p) => p.user.id !== currentUserId);

  const handleSetAlias = () => {
    setMenuOpen(false);
    const val = other?.alias || other?.user.name || "";
    setAliasValue(val);
    originalAliasRef.current = val.trim();
    setEditingAlias(true);
  };

  const handleClearAlias = async () => {
    if (!other) return;
    setMenuOpen(false);
    try {
      await setParticipantAlias(conversation.id, other.user.id, null);
      onAliasChanged?.(conversation.id, other.user.id, null);
    } catch (err) {
      console.error("Failed to clear alias", err);
    }
  };

  const handleAliasSubmit = async () => {
    if (!other) return;
    const val = aliasValue.trim();
    if (val === originalAliasRef.current) {
      setEditingAlias(false);
      return;
    }
    try {
      await setParticipantAlias(conversation.id, other.user.id, val || null);
      onAliasChanged?.(conversation.id, other.user.id, val || null);
      setEditingAlias(false);
    } catch (err) {
      console.error("Failed to set alias", err);
    }
  };

  const handleAliasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAliasSubmit();
    else if (e.key === "Escape") {
      cancelRef.current = true;
      setEditingAlias(false);
    }
  };

  const handleAliasBlur = () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    handleAliasSubmit();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDeleteRequest();
  };

  return (
    <div
      className={`conv-item ${isActive ? "active" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".conv-menu-wrapper")) return;
        onSelect();
      }}
    >
      <div onClick={(e) => { e.stopPropagation(); onOpenProfile(); }} style={{ cursor: "pointer", display: "flex", flex: 1 }}>
        <Avatar username={displayNameStr} avatar={other?.user.avatar} online={online} />
                {editingAlias ? (
          <input
            ref={inputRef}
            className="conv-alias-input"
            value={aliasValue}
            onChange={(e) => setAliasValue(e.target.value)}
            onBlur={handleAliasBlur}
            onKeyDown={handleAliasKeyDown}
            placeholder={t("chat.alias_placeholder", "Nickname")}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="conv-name-row">
            <span className="conv-name">{name}</span>
            <span className="conv-username">{username}</span>
          </div>
        )}
      </div>


        <div className="conv-preview">
          <span>
            {conversation.messages?.[0]?.content?.slice(0, 30) || t("chat.no_messages", "Click to write a message")}
          </span>
        </div>

      <div className="conv-menu-wrapper">
        <button
          className="conv-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
        >
          <MenuIcon />
        </button>
        {menuOpen && (
          <div ref={menuRef} className="conv-menu-dropdown">
            {conversation.type === "dm" && other && (
              <button className="conv-menu-item" onClick={handleSetAlias}>
                {other.alias ? t("chat.edit_alias", "Edit nickname") : t("chat.set_alias", "Set nickname")}
              </button>
            )}
            {conversation.type === "dm" && other?.alias && (
              <button className="conv-menu-item" onClick={handleClearAlias}>
                {t("chat.clear_alias", "Clear nickname")}
              </button>
            )}
            <button className="conv-menu-item conv-menu-item-danger" onClick={handleDelete}>
              {t("chat.delete_chat")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
