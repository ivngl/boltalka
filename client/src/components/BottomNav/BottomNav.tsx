import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import "./BottomNav.css";

export default function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isChats = location.pathname === "/" || location.pathname.startsWith("/conversation");

  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-tab ${isChats ? "active" : ""}`}
        onClick={() => navigate("/")}
      >
        <span className="bottom-nav-icon">💬</span>
        <span className="bottom-nav-label">{t("nav.chats", "Chats")}</span>
      </button>
      <button
        className={`bottom-nav-tab ${location.pathname === "/topics" ? "active" : ""}`}
        onClick={() => navigate("/topics")}
      >
        <span className="bottom-nav-icon">📋</span>
        <span className="bottom-nav-label">{t("nav.topics", "Topics")}</span>
      </button>
      <button
        className={`bottom-nav-tab ${location.pathname === "/societies" ? "active" : ""}`}
        onClick={() => navigate("/societies")}
      >
        <span className="bottom-nav-icon">👥</span>
        <span className="bottom-nav-label">{t("nav.societies", "Societies")}</span>
      </button>
    </nav>
  );
}
