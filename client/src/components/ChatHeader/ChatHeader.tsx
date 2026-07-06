import { useTranslation } from "react-i18next";
import i18n from "../../i18n.ts";
import Avatar from "../Avatar/Avatar.tsx";
import { useTheme } from "../../ThemeContext.tsx";
import type { CallState } from "../../useCall.ts";
import "./ChatHeader.css";

interface ChatHeaderProps {
  activeConvName: string;
  onBack: () => void;
  onStartCall?: () => void;
  otherUserOnline?: boolean;
  callState?: CallState;
}

export default function ChatHeader({ activeConvName, onBack, onStartCall, otherUserOnline, callState }: ChatHeaderProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const inCall = callState !== "idle" && callState !== undefined;

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        {activeConvName && (
          <>
            <button className="back-btn-mobile" onClick={onBack}>←</button>
            <Avatar username={activeConvName} size={32} />
            <span className="chat-conv-name">{activeConvName}</span>
          </>
        )}
      </div>
      <div className="chat-header-center">
        <span className="chat-brand">{t("app.title")}</span>
      </div>
      <div className="chat-header-right">
        {activeConvName && otherUserOnline && onStartCall && !inCall && (
          <button onClick={onStartCall} className="call-btn" title={t("call.start_video")}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </button>
        )}
        <button onClick={toggleTheme} className="theme-btn" title="Toggle theme">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button onClick={() => i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru")} className="lang-btn">
          {i18n.language === "ru" ? "EN" : "RU"}
        </button>
      </div>
    </div>
  );
}
