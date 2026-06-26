import { useTranslation } from "react-i18next";
import "./ConfirmDeleteModal.css";
import "../shared.css";

interface ConfirmDeleteModalProps {
  convId: number;
  onConfirm: (convId: number) => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ convId, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const { t } = useTranslation();

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-popup-header">
          <h3>{t("chat.confirm_delete_title")}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="confirm-popup-body">
          <p>{t("chat.confirm_delete_body")}</p>
        </div>
        <div className="confirm-popup-buttons">
          <button className="confirm-cancel" onClick={onCancel}>{t("chat.cancel")}</button>
          <button className="confirm-delete" onClick={() => { onConfirm(convId); }}>{t("chat.delete")}</button>
        </div>
      </div>
    </div>
  );
}
