import { useTranslation } from "react-i18next";
import Button from "../../ui/Button.tsx";
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
          <Button variant="ghost" size="sm" onClick={onCancel}>{t("common.cancel", "Cancel")}</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel || t("common.delete", "Delete")}</Button>
        </div>
      </div>
    </div>
  );
}
