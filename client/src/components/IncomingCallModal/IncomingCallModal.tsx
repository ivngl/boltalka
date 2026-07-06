import { useTranslation } from "react-i18next";
import "./IncomingCallModal.css";

interface IncomingCallModalProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerName,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const { t } = useTranslation();

  return (
    <div className="incoming-call-overlay" onClick={onReject}>
      <div
        className="incoming-call-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="incoming-call-avatar">
          {callerName.charAt(0).toUpperCase()}
        </div>
        <div className="incoming-call-name">{callerName}</div>
        <div className="incoming-call-label">{t("call.incoming_call")}</div>
        <div className="incoming-call-actions">
          <button
            className="incoming-call-btn incoming-call-decline"
            onClick={onReject}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.71c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
          <button
            className="incoming-call-btn incoming-call-accept"
            onClick={onAccept}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.71c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>
        <div className="incoming-call-actions-label">
          <span>{t("call.decline")}</span>
          <span>{t("call.accept")}</span>
        </div>
      </div>
    </div>
  );
}
