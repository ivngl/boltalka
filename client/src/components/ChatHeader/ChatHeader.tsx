import { useTranslation } from "react-i18next";
import i18n from "../../i18n.ts";
import Avatar from "../Avatar/Avatar.tsx";
import { useTheme } from "../../ThemeContext.tsx";
import type { CallState } from "../../useCall.ts";
import "./ChatHeader.css";

interface ChatHeaderProps {
  activeConvName: string;
  onBack: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  otherUserOnline?: boolean;
  callState?: CallState;
}

export default function ChatHeader({ activeConvName, onBack, onStartAudioCall, onStartVideoCall, otherUserOnline, callState }: ChatHeaderProps) {
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
