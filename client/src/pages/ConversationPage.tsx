import { useOutletContext, useParams, Navigate } from "react-router-dom";
import MessageList from "../components/MessageList/MessageList.tsx";
import MessageForm from "../components/MessageForm/MessageForm.tsx";
import type { User, Message } from "../types.ts";

interface ChatContext {
  user: User;
  messages: Message[];
  typingUsers: Record<number, boolean>;
  senderAliases: Record<number, string>;
  handleDeleteMessage: (messageId: number) => void;
  handleSend: (text: string, file: File | null) => Promise<void>;
  sending: boolean;
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, messages, typingUsers, senderAliases, handleDeleteMessage, handleSend, sending } = useOutletContext<ChatContext>();

  if (!id) return <Navigate to="/" replace />;
  if (!user) return null;

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
