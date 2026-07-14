import { useParams, useLocation, Navigate, useOutletContext } from "react-router-dom";
import ParticipantProfile from "../components/ParticipantProfile/ParticipantProfile.tsx";
import type { User, Conversation, Participant } from "../types.ts";

interface ChatContext {
  user: User;
  conversations: Conversation[];
  users: User[];
  handleAliasChanged: (conversationId: number, userId: number, alias: string | null) => void;
}

interface LocationState {
  conversationId?: number;
}

export default function ParticipantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { conversations, users, handleAliasChanged } = useOutletContext<ChatContext>();

  if (!id) return <Navigate to="/" replace />;

  const targetUser = users.find((u) => String(u.id) === id);
  if (!targetUser) return <Navigate to="/" replace />;

  const state = location.state as LocationState | null;
  const convId = state?.conversationId
    ?? conversations.find((c) => c.participants.some((p) => String(p.user.id) === id))?.id;

  const conv = convId ? conversations.find((c) => c.id === convId) : undefined;
  const existing = conv?.participants.find((p) => String(p.user.id) === id);

  const participant: Participant = {
    user: targetUser,
    joinedAt: existing?.joinedAt || new Date().toISOString(),
    alias: existing?.alias,
  };

  return (
    <ParticipantProfile
      participant={participant}
      conversationId={convId}
      onAliasChanged={handleAliasChanged}
    />
  );
}
