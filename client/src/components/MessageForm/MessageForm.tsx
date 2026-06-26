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
      <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title={t("chat.attach_file")}>📎</button>
      {selectedFile && (
        <button type="button" className="attach-btn clear-file" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} title={t("chat.remove_file")}>×</button>
      )}
      <button type="submit" disabled={sending}>{sending ? t("chat.sending") : t("chat.send")}</button>
    </form>
  );
}
