import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./MessageForm.css";

interface MessageFormProps {
  sending: boolean;
  onSend: (text: string, file: File | null) => void;
}

export default function MessageForm({ sending, onSend }: MessageFormProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const textInput = e.currentTarget.querySelector<HTMLInputElement>("input[type=text]");
    const text = textInput?.value.trim() || "";
    if (!text && !selectedFile) return;
    if (textInput) textInput.value = "";
    onSend(text, selectedFile);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form className="msg-form" onSubmit={handleSubmit}>
      <input type="text" placeholder={selectedFile ? `📎 ${selectedFile.name}` : t("chat.message_placeholder")} autoFocus />
      <input type="file" ref={fileInputRef} className="file-input" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
      <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title={t("chat.attach_file")}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
        </svg>
      </button>
      {selectedFile && (
        <button type="button" className="attach-btn clear-file" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} title={t("chat.remove_file")}>×</button>
      )}
      <button type="submit" disabled={sending}>{sending ? t("chat.sending") : t("chat.send")}</button>
    </form>
  );
}
