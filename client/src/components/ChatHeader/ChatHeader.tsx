import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar.tsx";
import type { CallState } from "../../useCall.ts";
import type { Conversation, Participant } from "../../types.ts";
import { setParticipantAlias } from "../../api.ts";
import "./ChatHeader.css";

interface ChatHeaderProps {
  activeConvName: string;
  activeConv?: Conversation | null;
  currentUserId?: number;
  onBack: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  otherUserOnline?: boolean;
  callState?: CallState;
  onAliasChanged?: (conversationId: number, userId: number, alias: string | null) => void;
}

export default function ChatHeader({
  activeConvName,
  activeConv,
  currentUserId,
  onBack,
  onStartAudioCall,
  onStartVideoCall,
  otherUserOnline,
  callState,
  onAliasChanged,
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const inCall = callState !== "idle" && callState !== undefined;
  const [editing, setEditing] = useState(false);
  const [aliasValue, setAliasValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const other: Participant | undefined = activeConv && currentUserId
    ? activeConv.participants.find((p) => p.user.id !== currentUserId)
    : undefined;

  const isDM = activeConv?.type === "dm" && other && other.user.id !== currentUserId;

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleClick = () => {
    if (!isDM || !other) return;
    setAliasValue(other.alias || "");
    setEditing(true);
  };

  const handleSubmit = async () => {
    if (!activeConv || !other) return;
    const val = aliasValue.trim();
    try {
      await setParticipantAlias(activeConv.id, other.user.id, val || null);
      onAliasChanged?.(activeConv.id, other.user.id, val || null);
      setEditing(false);
    } catch (err) {
      console.error("Failed to set alias", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    else if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        {activeConvName && (
          <>
            <button className="back-btn-mobile" onClick={onBack}><span className="back-btn-icon">←</span></button>
            <Avatar username={activeConvName} size={32} online={otherUserOnline} />
            {editing ? (
              <input
                ref={inputRef}
                className="chat-alias-input"
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.alias_placeholder", "Nickname")}
              />
            ) : (
              <span
                className={`chat-conv-name ${isDM ? "chat-conv-name-editable" : ""}`}
                onClick={handleClick}
                title={isDM ? t("chat.set_alias", "Set nickname") : undefined}
              >
                {activeConvName}
              </span>
            )}
          </>
        )}
      </div>
      <div className="chat-header-right">
        {activeConvName && otherUserOnline && !inCall && (
          <>
            <button onClick={onStartAudioCall} className="call-btn call-btn-audio" title={t("call.start_audio")}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </button>
            <button onClick={onStartVideoCall} className="call-btn call-btn-video" title={t("call.start_video")}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </button>
          </>
        )}
        </div>
    </div>
  );
}
