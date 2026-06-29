import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { connectSocket, disconnectSocket, getSocket } from "./socket.ts";
import { setToken, register, login, getMe, getConversations, getMessages, createConversation, getUsers, uploadFile, deleteConversation } from "./api.ts";
import Profile from "./components/Profile/Profile.tsx";
import AuthScreen from "./components/AuthScreen/AuthScreen.tsx";
import Sidebar from "./components/Sidebar/Sidebar.tsx";
import ChatHeader from "./components/ChatHeader/ChatHeader.tsx";
import MessageList from "./components/MessageList/MessageList.tsx";
import MessageForm from "./components/MessageForm/MessageForm.tsx";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal/ConfirmDeleteModal.tsx";
import { conversationName } from "./components/helpers.ts";
import type { User, Message, Conversation, ViewState } from "./types.ts";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const [sending, setSending] = useState(false);
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<number | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<number | null>(null);

  const [view, setView] = useState<ViewState>("auth");
  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    setToken(token);
    getMe().then((u) => {
      setUser(u);
      initSocket(token);
      loadData();
    }).catch(() => {
      localStorage.removeItem("token");
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initSocket(token: string) {
    const s = connectSocket(token);
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
            if (found) selectConversation(found);
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
    s.on("message_deleted", ({ messageId }: { messageId: number }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  }

  async function loadData() {
    const [convs, usrs] = await Promise.all([getConversations(), getUsers()]);
    setConversations(convs);
    setUsers(usrs);
    const s = getSocket();
    convs.forEach((c: Conversation) => s?.emit("join_conversation", c.id));
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await register(fd.get("username") as string, fd.get("email") as string, fd.get("password") as string);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    initSocket(data.token);
    loadData();
    requestNotif();
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await login(fd.get("email") as string, fd.get("password") as string);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    initSocket(data.token);
    loadData();
    requestNotif();
  }

  function requestNotif() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function logout() {
    localStorage.removeItem("token");
    disconnectSocket();
    setUser(null);
    setConversations([]);
    setActiveConv(null);
    setMessages([]);
    setView("auth");
  }

  function handleUpdateUser(updated: User) {
    setUser((prev) => ({ ...prev, ...updated }));
  }

  function selectConversation(conv: Conversation) {
    setView("chat");
    setActiveConv(conv);
    if (conv) {
      getMessages(conv.id).then(setMessages);
    }
  }

  async function startDM(otherUserId: number) {
    const conv = await createConversation("dm", [otherUserId]);
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });
    getSocket()?.emit("join_conversation", conv.id);
    selectConversation(conv);
    setView("chat");
  }

  async function handleDeleteConversation(convId: number) {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConv?.id === convId) {
        setActiveConv(null);
        setMessages([]);
        setView("chat");
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
    getSocket()?.emit("delete_message", { messageId, conversationId: activeConv.id }, (res) => {
      if (!res.success) console.error("Delete failed:", res.error);
    });
    setConfirmDeleteMsgId(null);
  }

  function chatBack() {
    setActiveConv(null);
    setMessages([]);
  }

  function openProfileFromSidebar() {
    setView("profile");
    setActiveConv(null);
  }

  if (loading) return <div className="loading">{t("app.loading")}</div>;

  if (!user) {
    return (
      <AuthScreen
        view={view as "auth" | "register"}
        onLogin={handleLogin}
        onRegister={handleRegister}
        setView={setView}
      />
    );
  }

  const activeConvName = activeConv ? conversationName(activeConv, user.id) : "";

  return (
    <div className={`app ${activeConv || view === "profile" ? "show-chat" : "show-sidebar"}`}>
      <Sidebar
        user={user}
        conversations={conversations}
        activeConv={activeConv}
        onlineUsers={onlineUsers}
        users={users}
        onLogout={logout}
        onOpenProfile={openProfileFromSidebar}
        onSelectConversation={selectConversation}
        onStartDM={startDM}
        onDeleteRequest={(convId) => setConfirmDeleteConvId(convId)}
      />
      <main className="chat-area">
        <ChatHeader
          activeConvName={activeConvName}
          onBack={chatBack}
        />
        {view === "profile" ? (
          <Profile user={user} onUpdate={handleUpdateUser} onBack={() => setView("chat")} />
        ) : !activeConv ? (
          <div className="empty-state">{t("chat.empty")}</div>
        ) : (
          <>
            <MessageList
              messages={messages}
              currentUserId={user.id}
              typingUsers={typingUsers}
              onDeleteMessage={handleDeleteMessage}
            />
            <MessageForm
              sending={sending}
              onSend={handleSend}
            />
          </>
        )}
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
    </div>
  );
}

export default App;
