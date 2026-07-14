import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MessageList from "../components/MessageList/MessageList.tsx";
import MessageForm from "../components/MessageForm/MessageForm.tsx";
import type { User, Message, Conversation } from "../types.ts";

interface ChatContext {
  user: User;
  activeConv: Conversation | null;
  messages: Message[];
  typingUsers: Record<number, boolean>;
  senderAliases: Record<number, string>;
  handleDeleteMessage: (messageId: number) => void;
  handleSend: (text: string, file: File | null) => Promise<void>;
  sending: boolean;
}

export default function ChatContent() {
  const { t } = useTranslation();
  const { user, activeConv, messages, typingUsers, senderAliases, handleDeleteMessage, handleSend, sending } = useOutletContext<ChatContext>();

  if (!activeConv) {
    return <div className="empty-state">{t("chat.empty")}</div>;
  }

  return (
    <>
      <MessageList
        messages={messages}
        currentUserId={user.id}
        typingUsers={typingUsers}
        senderAliases={senderAliases}
        onDeleteMessage={handleDeleteMessage}
      />
      <MessageForm
        sending={sending}
        onSend={handleSend}
      />
    </>
  );
}
