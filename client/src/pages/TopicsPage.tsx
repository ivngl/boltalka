import { useTranslation } from "react-i18next";
import "./TopicsPage.css";

export default function TopicsPage() {
  const { t } = useTranslation();

  return (
    <div className="topics-page">
      <div className="topics-header">
        <h2>{t("topics.title", "Topics")}</h2>
      </div>
      <div className="topics-empty">
        <span className="topics-empty-icon">💬</span>
        <p>{t("topics.empty", "No topics yet")}</p>
      </div>
    </div>
  );
}
