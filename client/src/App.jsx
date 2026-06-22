import { useState, useEffect, useRef, useCallback } from "react";
import { connectSocket, disconnectSocket, getSocket } from "./socket.js";
import { setToken, register, login, getMe, getConversations, getMessages, createConversation, getUsers, uploadFile, deleteConversation } from "./api.js";
import Avatar from "./Avatar.jsx";
import Profile from "./Profile.jsx";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [chatSearch, setChatSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const [view, setView] = useState("auth");
  const msgEndRef = useRef(null);
  const activeConvRef = useRef(null);
  const conversationsRef = useRef([]);

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
  }, []);

  function initSocket(token) {
    const s = connectSocket(token);
    s.on("new_message", (msg) => {
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
        const conv = conversationsRef.current.find((c) => c.id === msg.conversationId);
        const inActive = activeConvRef.current?.id === msg.conversationId;
        if (!inActive || document.hidden) {
          const title = msg.sender?.username || "New message";
          const n = new Notification(title, { body: msg.content, icon: "/favicon.svg" });
          n.onclick = () => {
            window.focus();
            const found = conversationsRef.current.find((c) => c.id === msg.conversationId);
            if (found) selectConversation(found);
          };
        }
      }
    });
    s.on("presence", ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        online ? next.add(userId) : next.delete(userId);
        return next;
      });
    });
    s.on("typing", ({ userId, conversationId }) => {
      if (conversationId !== activeConv?.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    });
    s.on("stop_typing", ({ userId, conversationId }) => {
      if (conversationId !== activeConv?.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: false }));
    });
  }

  async function loadData() {
    const [convs, usrs] = await Promise.all([getConversations(), getUsers()]);
    setConversations(convs);
    setUsers(usrs);
    const s = getSocket();
    convs.forEach((c) => s?.emit("join_conversation", c.id));
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await register(fd.get("username"), fd.get("email"), fd.get("password"));
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    initSocket(data.token);
    loadData();
    requestNotif();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await login(fd.get("email"), fd.get("password"));
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

  async   function openProfile() {
    setView("profile");
    setActiveConv(null);
  }

  function handleUpdateUser(updated) {
    setUser((prev) => ({ ...prev, ...updated }));
  }

  function selectConversation(conv) {
    setView("chat");
    setActiveConv(conv);
    if (conv) {
      getMessages(conv.id).then(setMessages);
    }
  }

  async function startDM(otherUserId) {
    const conv = await createConversation("dm", [otherUserId]);
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });
    getSocket()?.emit("join_conversation", conv.id);
    selectConversation(conv);
    setView("chat");
  }

  async function handleDeleteConversation(convId) {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConv?.id === convId) {
        setActiveConv(null);
        setMessages([]);
        setView("chat");
      }
      getSocket()?.emit("leave_conversation", convId);
    } catch {}
  }

  async function handleSend(e) {
    e.preventDefault();
    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];
    const textInput = e.target.querySelector("input[type=text]");
    const content = textInput?.value.trim() || "";
    if (!content && !file) return;
    if (sending) return;
    setSending(true);
    if (textInput) textInput.value = "";
    let messageData = { conversationId: activeConv.id, content };
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
      } catch (err) {
        setSending(false);
        return;
      }
      fileInput.value = "";
    }
    getSocket()?.emit("send_message", messageData);
    setSending(false);
  }

  function conversationName(conv) {
    if (conv.type === "group" && conv.name) return conv.name;
    const other = conv.participants?.find((p) => p.user.id !== user?.id);
    return other?.user?.username || "Unknown";
  }

  function otherParticipant(conv) {
    return conv.participants?.find((p) => p.user.id !== user?.id)?.user;
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Boltalka</h1>
          {view === "auth" && (
            <div className="auth-tabs">
              <form onSubmit={handleLogin}>
                <h2>Login</h2>
                <input name="email" type="email" placeholder="Email" required />
                <input name="password" type="password" placeholder="Password" required />
                <button type="submit">Login</button>
              </form>
              <p className="switch" onClick={() => setView("register")}>No account? Register</p>
            </div>
          )}
          {view === "register" && (
            <div className="auth-tabs">
              <form onSubmit={handleRegister}>
                <h2>Register</h2>
                <input name="username" placeholder="Username" required />
                <input name="email" type="email" placeholder="Email" required />
                <input name="password" type="password" placeholder="Password" required />
                <button type="submit">Register</button>
              </form>
              <p className="switch" onClick={() => setView("auth")}>Already have an account? Login</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <div onClick={openProfile} className="header-avatar">
              <Avatar username={user.username} size={28} />
            </div>
          </div>
          <h2>Boltalka</h2>
          <div className="sidebar-header-right">
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search chats..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
          />
          <button className="new-chat-btn" onClick={() => setNewChatOpen(true)}>+</button>
        </div>
        <div className="conv-list">
          {conversations.filter((c) => conversationName(c).toLowerCase().includes(chatSearch.toLowerCase())).map((c) => (
            <div
              key={c.id}
              className={`conv-item ${activeConv?.id === c.id ? "active" : ""}`}
              onClick={() => selectConversation(c)}
            >
              <Avatar username={conversationName(c)} />
              <div className="conv-info">
                <div className="conv-name">{conversationName(c)}</div>
                <div className="conv-preview">
                  {c.messages?.[0]?.content?.slice(0, 30) || ""}
                </div>
              </div>
              <div className={`online-dot ${onlineUsers.has(otherParticipant(c)?.id) ? "online" : ""}`} />
              <button
                className="conv-delete"
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id); }}
                title="Delete chat"
              >×</button>
            </div>
          ))}
        </div>
        {newChatOpen && (
          <div className="new-chat-overlay" onClick={() => { setNewChatOpen(false); setNewChatSearch(""); }}>
            <div className="new-chat-popup" onClick={(e) => e.stopPropagation()}>
              <div className="new-chat-popup-header">
                <h3>New chat</h3>
                <button className="close-btn" onClick={() => { setNewChatOpen(false); setNewChatSearch(""); }}>×</button>
              </div>
              <input
                className="new-chat-popup-search"
                type="text"
                placeholder="Search by username..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                autoFocus
              />
              <div className="new-chat-popup-list">
                {users
                  .filter((u) => u.id !== user.id)
                  .filter((u) => u.username.toLowerCase().includes(newChatSearch.toLowerCase()))
                  .map((u) => (
                    <div key={u.id} className="user-item" onClick={() => { startDM(u.id); setNewChatOpen(false); setNewChatSearch(""); }}>
                      <Avatar username={u.username} size={28} />
                      <span>{u.username}</span>
                      <span className={`online-dot ${onlineUsers.has(u.id) ? "online" : ""}`} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </aside>
      <main className="chat-area">
        {view === "profile" ? (
          <Profile user={user} onUpdate={handleUpdateUser} onBack={() => setView("chat")} />
        ) : !activeConv ? (
          <div className="empty-state">Select a conversation</div>
        ) : (
          <>
            <div className="chat-header">
              <h3>{conversationName(activeConv)}</h3>
            </div>
            <div className="messages" ref={msgEndRef}>
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.senderId === user.id ? "mine" : ""}`}>
                  <div className="msg-sender">{m.sender?.username}</div>
                  {m.fileUrl && (
                    <div className="msg-file">
                      {m.fileType?.startsWith("image/") ? (
                        <img src={m.fileUrl} alt={m.fileName} className="msg-image" />
                      ) : m.fileType?.startsWith("video/") ? (
                        <video src={m.fileUrl} controls className="msg-video" />
                      ) : (
                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="msg-file-link" download={m.fileName}>
                          📄 {m.fileName}
                        </a>
                      )}
                    </div>
                  )}
                  {m.content && <div className="msg-content">{m.content}</div>}
                  <div className="msg-time">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
              {Object.entries(typingUsers).filter(([, v]) => v).length > 0 && (
                <div className="typing-indicator">Someone is typing...</div>
              )}
            </div>
            <form className="msg-form" onSubmit={handleSend}>
              <input type="text" placeholder="Type a message..." autoFocus />
              <input type="file" ref={fileInputRef} className="file-input" />
              <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
              <button type="submit" disabled={sending}>{sending ? "..." : "Send"}</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
