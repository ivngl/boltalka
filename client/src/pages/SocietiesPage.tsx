import { useTranslation } from "react-i18next";
import "./TopicsPage.css";

export default function SocietiesPage() {
  const { t } = useTranslation();

  return (
    <div className="topics-page">
      <div className="topics-header">
        <h2>{t("societies.title", "Societies")}</h2>
      </div>
      <div className="topics-empty">
        <span className="topics-empty-icon">👥</span>
        <p>{t("societies.empty", "No societies yet")}</p>
      </div>
    </div>
  );
}
