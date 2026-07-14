import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { getTopic, sendTopicMessage } from "../api.ts";
import { displayName } from "../components/helpers.tsx";
import type { Topic, TopicMessage } from "../types.ts";
import "../components/MessageBubble/MessageBubble.css";
import "./TopicDetailPage.css";

export default function TopicDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTopic(id);
      setTopic(data);
    } catch {
      setTopic(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topic?.messages]);

  if (!id) return <Navigate to="/topics" replace />;
  if (!user) return null;
  if (loading) {
    return (
      <div className="topic-detail-empty">
        <p>{t("topics.loading", "Loading...")}</p>
      </div>
    );
  }
  if (!topic) {
    return (
      <div className="topic-detail-empty">
        <p>{t("topics.notFound", "Topic not found")}</p>
      </div>
    );
  }

  const messages: TopicMessage[] = topic.messages || [];

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const msg = await sendTopicMessage(topic!.id, content);
      setTopic((prev) => prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev);
      setText("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="topic-detail-header">
        <button className="back-btn" onClick={() => navigate("/topics")}>
          <span className="back-btn-icon">←</span>
        </button>
        <div className="topic-detail-header-info">
          <h3 className="topic-detail-title">{topic.title}</h3>
          {topic.description && (
            <p className="topic-detail-desc">{topic.description}</p>
          )}
        </div>
      </div>
      <div className="topic-messages">
        {messages.length === 0 && (
          <div className="topic-detail-empty">
            <p>{t("topics.noMessages", "No messages yet. Be the first to reply!")}</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.sender.id === user.id ? "mine" : ""}`}>
            {m.sender.id !== user.id && (
              <div className="msg-sender">{displayName(m.sender)}</div>
            )}
            {m.content && <div className="msg-content">{m.content}</div>}
            <div className="msg-time">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        <div ref={msgEndRef} />
      </div>
      <form className="msg-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={t("topics.replyPlaceholder", "Reply...")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={sending || !text.trim()}>
          {sending ? t("chat.sending") : t("chat.send")}
        </button>
      </form>
    </>
  );
}
