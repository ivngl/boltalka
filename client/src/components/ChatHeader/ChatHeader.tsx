import { useTranslation } from "react-i18next";
import i18n from "../../i18n.ts";
import Avatar from "../Avatar/Avatar.tsx";
import { useTheme } from "../../ThemeContext.tsx";
import "./ChatHeader.css";

interface ChatHeaderProps {
  activeConvName: string;
  onBack: () => void;
}

export default function ChatHeader({ activeConvName, onBack }: ChatHeaderProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

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
