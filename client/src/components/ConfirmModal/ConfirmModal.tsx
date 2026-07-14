import { useTranslation } from "react-i18next";
import "../ConfirmDeleteModal/ConfirmDeleteModal.css";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-popup-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="confirm-popup-body">
          <p>{message}</p>
        </div>
        <div className="confirm-popup-buttons">
          <button className="confirm-cancel" onClick={onCancel}>{t("common.cancel", "Cancel")}</button>
          <button className="confirm-delete" onClick={onConfirm}>{confirmLabel || t("common.delete", "Delete")}</button>
        </div>
      </div>
    </div>
  );
}
