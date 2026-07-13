import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar.tsx";
import type { CallState } from "../../useCall.ts";
import type { Conversation, Participant } from "../../types.ts";
import { setParticipantAlias } from "../../api.ts";
import "./ChatHeader.css";
import PhoneIcon from "../Icons/PhoneIcon.tsx";
import VideoCamIcon from "../Icons/VideoCamIcon.tsx";

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
  onParticipantClick?: (participant: Participant) => void;
  profileTitle?: string;
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
  onParticipantClick,
  profileTitle,
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
        {profileTitle ? (
          <button className="back-btn-profile" onClick={onBack}>
            <span className="back-btn-icon">←</span>
          </button>
        ) : activeConvName && (
          <>
            <button className="back-btn-mobile" onClick={onBack}><span className="back-btn-icon">←</span></button>
            <div
              className="chat-header-user"
              onClick={() => { if (onParticipantClick && other) onParticipantClick(other); }}
              style={{ cursor:"pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Avatar username={activeConvName} avatar={other?.user.avatar} size={32} online={otherUserOnline} />
              {other ? (
                <>
                  <span className="chat-conv-name">{other.alias || other.user.name || other.user.username}</span>
                  <span className="chat-conv-username">{other.user.username}</span>
                </>
              ) : (
                <span className="chat-conv-name">{activeConvName}</span>
              )}
            </div>

          </>
        )}
      </div>
      <div className="chat-header-right">
        {activeConvName && otherUserOnline && !inCall && (
          <>
            <button onClick={onStartAudioCall} className="call-btn call-btn-audio" title={t("call.start_audio")}>
              <PhoneIcon />
            </button>
            <button onClick={onStartVideoCall} className="call-btn call-btn-video" title={t("call.start_video")}>
              <VideoCamIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
