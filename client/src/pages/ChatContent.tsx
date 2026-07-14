import { useTranslation } from "react-i18next";

export default function ChatContent() {
  const { t } = useTranslation();
  return <div className="empty-state">{t("chat.empty")}</div>;
}
