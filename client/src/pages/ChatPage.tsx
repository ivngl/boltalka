import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { connectSocket, disconnectSocket, getSocket } from "../socket.ts";
import { setToken, getConversations, getMessages, createConversation, getUsers, uploadFile, deleteConversation, getVapidPublicKey, subscribePushServer } from "../api.ts";
import { registerSW, subscribePush, unsubscribePush } from "../push.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import Sidebar from "../components/Sidebar/Sidebar.tsx";
import ChatHeader from "../components/ChatHeader/ChatHeader.tsx";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal/ConfirmDeleteModal.tsx";
import IncomingCallModal from "../components/IncomingCallModal/IncomingCallModal.tsx";
import CallOverlay from "../components/CallOverlay/CallOverlay.tsx";
import { conversationName, otherParticipant } from "../components/helpers.tsx";
import { useCall } from "../useCall.ts";
import type { User, Message, Conversation, Participant } from "../types.ts";

export default function ChatPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: convIdFromUrl, id: userIdFromUrl } = useParams<{ id: string }>();
  const location = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [sending, setSending] = useState(false);
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<number | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<number | null>(null);

  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  const isProfileView = location.pathname === "/profile";
  const isConversationView = !!location.pathname.match(/^\/conversation\//);
  const isUserView = !!location.pathname.match(/^\/user\//);

  const activeConv = useMemo(() => {
    if (!convIdFromUrl || !isConversationView) return null;
    return conversations.find((c) => String(c.id) === convIdFromUrl) ?? null;
  }, [convIdFromUrl, isConversationView, conversations]);

  const profileParticipant = useMemo(() => {
    if (!userIdFromUrl || !isUserView) return null;
    const targetUser = users.find((u) => String(u.id) === userIdFromUrl);
    if (!targetUser) return null;
    const conv = conversations.find((c) =>
      c.participants.some((p) => String(p.user.id) === userIdFromUrl)
    );
    const existing = conv?.participants.find((p) => String(p.user.id) === userIdFromUrl);
    return {
      user: targetUser,
      joinedAt: existing?.joinedAt || new Date().toISOString(),
      alias: existing?.alias,
    } as Participant;
  }, [userIdFromUrl, isUserView, users, conversations]);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const {
    callState, callType, localStream, remoteStream, callDuration,
    isAudioMuted, isVideoEnabled, incomingCall,
    startCall, acceptCall, rejectCall, endCall,
    toggleAudio, toggleVideo, setIncomingCall, attachSocket,
  } = useCall(String(user?.id));

  function initSocket(token: string) {
    const s = connectSocket(token);
    attachSocket(s);
    s.on("new_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((c) => c.id === msg.conversationId);
        if (idx !== -1) {
          const c = { ...copy[idx], messages: [{ ...msg, sender: msg.sender }] };
          copy.splice(idx, 1);
          copy.unshift(c);
        }
        return copy;
      });
      if (msg.senderId !== user?.id && "Notification" in window && Notification.permission === "granted") {
        const inActive = activeConvRef.current?.id === msg.conversationId;
        if (!inActive || document.hidden) {
          const title = msg.sender?.username || t("chat.new_message");
          const n = new Notification(title, { body: msg.content, icon: "/favicon.svg" });
          n.onclick = () => {
            window.focus();
            const found = conversationsRef.current.find((c) => c.id === msg.conversationId);
            if (found) navigate(`/conversation/${found.id}`);
          };
        }
      }
    });
    s.on("presence", ({ userId, online }: { userId: number; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) { next.add(userId); } else { next.delete(userId); }
        return next;
      });
    });
    s.on("typing", ({ userId, conversationId }: { userId: number; conversationId: number }) => {
      if (conversationId !== activeConv?.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    });
    s.on("stop_typing", ({ userId, conversationId }: { userId: number; conversationId: number }) => {
      if (conversationId !== activeConv?.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: false }));
    });
    s.on("participant_updated", ({ conversationId, participant }: { conversationId: number; participant: { user: { id: number }; alias?: string } }) => {
      const updateParticipants = (prev: Conversation[]) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            participants: c.participants.map((p) =>
              p.user.id === participant.user.id ? { ...p, alias: participant.alias } : p
            ),
          };
        });
      setConversations(updateParticipants);
    });
    s.on("message_deleted", ({ messageId }: { messageId: number }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
    s.on("incoming_call", ({ callerId, conversationId, callType: incomingCallType }: { callerId: number; conversationId: number; callType: string }) => {
      setIncomingCall({ callerId: String(callerId), conversationId: String(conversationId), callType: incomingCallType === "audio" ? "audio" : "video" });
    });
  }

  async function loadData() {
    const [convs, usrs] = await Promise.all([getConversations(), getUsers()]);
    setConversations(convs);
    setUsers(usrs);
    const s = getSocket();
    convs.forEach((c: Conversation) => s?.emit("join_conversation", c.id));
  }

  async function setupPush() {
    const swReg = await registerSW();
    if (!swReg) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const publicKey = await getVapidPublicKey();
    if (!publicKey) return;
    const sub = await subscribePush(swReg, publicKey);
    if (sub) await subscribePushServer({ endpoint: sub.endpoint, p256dh: sub.toJSON().keys?.p256dh ?? "", auth: sub.toJSON().keys?.auth ?? "" });
  }

  function requestNotif() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setToken(token);
    initSocket(token);
    loadData();
    requestNotif();
    setupPush();
    return () => { disconnectSocket(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeConv) {
      getMessages(activeConv.id).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [activeConv]);

  async function handleLogout() {
    const swReg = await navigator.serviceWorker?.getRegistration();
    if (swReg) await unsubscribePush(swReg);
    disconnectSocket();
    setConversations([]);
    setMessages([]);
    logout();
    navigate("/login", { replace: true });
  }

  async function startDM(otherUserId: number) {
    const conv = await createConversation("dm", [otherUserId]);
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });
    getSocket()?.emit("join_conversation", conv.id);
    navigate(`/conversation/${conv.id}`);
  }

  async function handleDeleteConversation(convId: number) {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConv?.id === convId) {
        navigate("/");
      }
      getSocket()?.emit("leave_conversation", convId);
    } catch { /* ignore */ }
  }

  async function handleSend(text: string, file: File | null) {
    if (!activeConv) return;
    if (!text && !file) return;
    if (sending) return;
    setSending(true);
    let messageData: {
      conversationId: number;
      content: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    } = { conversationId: activeConv.id, content: text };
    if (file) {
      try {
        const uploaded = await uploadFile(file);
        messageData = {
          ...messageData,
          fileUrl: uploaded.url,
          fileName: uploaded.name,
          fileType: uploaded.type,
          fileSize: uploaded.size,
        };
      } catch {
        setSending(false);
        return;
      }
    }
    getSocket()?.emit("send_message", messageData);
    setSending(false);
  }

  function handleDeleteMessage(messageId: number) {
    setConfirmDeleteMsgId(messageId);
  }

  function handleConfirmDeleteMessage(messageId: number) {
    if (!activeConv) return;
    getSocket()?.emit("delete_message", { messageId, conversationId: activeConv.id }, (res: { success: boolean; error?: string }) => {
      if (!res.success) console.error("Delete failed:", res.error);
    });
    setConfirmDeleteMsgId(null);
  }

  const handleAliasChanged = useCallback((conversationId: number, userId: number, alias: string | null) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          participants: c.participants.map((p) =>
            p.user.id === userId ? { ...p, alias: alias ?? undefined } : p
          ),
        };
      })
    );
  }, []);

  const activeConvName = user && activeConv ? conversationName(activeConv, user.id) : "";
  const senderAliases = useMemo(() => {
    if (!activeConv || !user) return {};
    const map: Record<number, string> = {};
    for (const p of activeConv.participants) {
      if (p.user.id !== user.id && p.alias) map[p.user.id] = p.alias;
    }
    return map;
  }, [activeConv, user]);

  const otherUser = user && activeConv ? otherParticipant(activeConv, user.id) : null;
  const otherUserOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const onStartAudioCall = useCallback(() => {
    if (otherUser && activeConv) {
      startCall(String(otherUser.id), String(activeConv.id), "audio");
    }
  }, [otherUser, activeConv, startCall]);

  const onStartVideoCall = useCallback(() => {
    if (otherUser && activeConv) {
      startCall(String(otherUser.id), String(activeConv.id), "video");
    }
  }, [otherUser, activeConv, startCall]);

  if (!user) return null;

  const profileTitle = isProfileView
    ? user.username
    : profileParticipant
      ? (profileParticipant.alias || profileParticipant.user.name || profileParticipant.user.username)
      : undefined;

  const handleBack = isProfileView
    ? () => navigate("/")
    : isUserView
      ? () => navigate(-1)
      : () => navigate("/");

  return (
    <div className={`app ${activeConv || isProfileView || profileParticipant ? "show-chat" : "show-sidebar"}`}>
      <Sidebar
        user={user}
        conversations={conversations}
        activeConv={activeConv}
        onlineUsers={onlineUsers}
        users={users}
        onLogout={handleLogout}
        onOpenProfile={() => navigate("/profile")}
        onSelectConversation={(conv) => navigate(`/conversation/${conv.id}`)}
        onStartDM={startDM}
        onDeleteRequest={(convId) => setConfirmDeleteConvId(convId)}
        onAliasChanged={handleAliasChanged}
        onParticipantClick={(p, convId) => {
          navigate(`/user/${p.user.id}`, { state: { conversationId: convId } });
        }}
      />
      <main className="chat-area">
        <ChatHeader
          activeConvName={activeConvName}
          activeConv={activeConv}
          currentUserId={user?.id}
          onBack={handleBack}
          onStartAudioCall={onStartAudioCall}
          onStartVideoCall={onStartVideoCall}
          otherUserOnline={otherUserOnline}
          callState={callState}
          onAliasChanged={handleAliasChanged}
          onParticipantClick={(p) => {
            navigate(`/user/${p.user.id}`, { state: { conversationId: activeConv?.id } });
          }}
          profileTitle={profileTitle}
        />
        <Outlet context={{
          user,
          activeConv,
          messages,
          typingUsers,
          senderAliases,
          users,
          onlineUsers,
          conversations,
          profileParticipant,
          handleDeleteMessage,
          handleSend,
          sending,
          handleAliasChanged,
        }} />
      </main>
      {confirmDeleteConvId && (
        <ConfirmDeleteModal
          convId={confirmDeleteConvId}
          onConfirm={(convId) => { handleDeleteConversation(convId); setConfirmDeleteConvId(null); }}
          onCancel={() => setConfirmDeleteConvId(null)}
        />
      )}
      {confirmDeleteMsgId && (
        <div className="confirm-overlay" onClick={() => setConfirmDeleteMsgId(null)}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-popup-header">
              <h3>{t("chat.delete_message")}</h3>
              <button className="close-btn" onClick={() => setConfirmDeleteMsgId(null)}>×</button>
            </div>
            <div className="confirm-popup-body">
              <p>{t("chat.confirm_delete_body")}</p>
            </div>
            <div className="confirm-popup-buttons">
              <button className="confirm-cancel" onClick={() => setConfirmDeleteMsgId(null)}>{t("chat.cancel")}</button>
              <button className="confirm-delete" onClick={() => handleConfirmDeleteMessage(confirmDeleteMsgId)}>{t("chat.delete")}</button>
            </div>
          </div>
        </div>
      )}
      {incomingCall && (
        <IncomingCallModal
          callerName={users.find((u) => String(u.id) === incomingCall.callerId)?.username || "Unknown"}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      <CallOverlay
        callState={callState}
        callType={callType}
        localStream={localStream}
        remoteStream={remoteStream}
        peerName={activeConvName}
        callDuration={callDuration}
        isAudioMuted={isAudioMuted}
        isVideoEnabled={isVideoEnabled}
        onEndCall={endCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
      />
    </div>
  );
}
