import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { getTopic, sendTopicMessage } from "../api.ts";
import Avatar from "../components/Avatar/Avatar.tsx";
import type { Topic, TopicMessage } from "../types.ts";
import "./TopicDetailPage.css";

interface CommentNode {
  message: TopicMessage;
  children: CommentNode[];
}

function timeAgo(dateStr: string, t: (key: string, fallback: string, opts?: Record<string, unknown>) => string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return t("time.justNow", "just now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("time.minutesAgo", "{{m}}m ago", { m: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hoursAgo", "{{h}}h ago", { h: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("time.daysAgo", "{{d}}d ago", { d: days });
  return new Date(dateStr).toLocaleDateString();
}

function buildTree(messages: TopicMessage[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const m of messages) {
    map.set(m.id, { message: m, children: [] });
  }
  for (const m of messages) {
    const node = map.get(m.id)!;
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

interface CommentProps {
  node: CommentNode;
  onReply: (m: TopicMessage) => void;
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string;
}

function Comment({ node, onReply, t }: CommentProps) {
  const m = node.message;
  return (
    <div className="topic-comment">
      <Avatar username={m.sender.username} avatar={m.sender.avatar} size={36} />
      <div className="topic-comment-body">
              <div className="topic-comment-meta">
                <span className="topic-comment-name">
                  {m.sender.name || m.sender.username}
                </span>
                <span className="topic-comment-time">{timeAgo(m.createdAt, t)}</span>
              </div>
              <div className="topic-comment-text-row">
                <span className="topic-comment-text">{m.content}</span>
                <button className="topic-comment-reply-btn" onClick={() => onReply(m)} title={t("topics.reply", "Reply")}>+</button>
              </div>
        {node.children.length > 0 && (
          <div className="topic-comment-replies">
            {node.children.map((child) => (
              <Comment key={child.message.id} node={child} onReply={onReply} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TopicDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  const tree = useMemo(() => buildTree(topic?.messages || []), [topic?.messages]);
  const totalCount = topic?.messages?.length ?? 0;

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

  function handleReply(m: TopicMessage) {
    setReplyTo(m.sender.name || m.sender.username);
    setReplyToId(m.id);
    setText("");
    inputRef.current?.focus();
  }

  function cancelReply() {
    setReplyTo(null);
    setReplyToId(null);
    setText("");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const msg = await sendTopicMessage(topic!.id, content, replyToId || undefined);
      setTopic((prev) => prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev);
      setText("");
      setReplyTo(null);
      setReplyToId(null);
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
      <div className="topic-comments">
        <div className="topic-comments-count">
          {t("topics.repliesCount", "{{count}} replies", { count: totalCount })}
        </div>
        {totalCount === 0 && (
          <div className="topic-detail-empty">
            <p>{t("topics.noMessages", "No messages yet. Be the first to reply!")}</p>
          </div>
        )}
        {tree.map((node) => (
          <Comment key={node.message.id} node={node} onReply={handleReply} t={t} />
        ))}
        <div ref={msgEndRef} />
      </div>
      <form className="topic-reply-form" onSubmit={handleSend}>
        <Avatar username={user.username} avatar={user.avatar} size={32} />
        <div className="topic-reply-input-wrap">
          {replyTo && (
            <span className="topic-reply-to">
              Replying to <strong>{replyTo}</strong>
              <button type="button" className="topic-reply-cancel" onClick={cancelReply}>×</button>
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder={replyTo ? t("topics.replyTo", "Reply to {{name}}...", { name: replyTo }) : t("topics.replyPlaceholder", "Add a reply...")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" disabled={sending || !text.trim()}>
          {sending ? "..." : "↗"}
        </button>
      </form>
    </>
  );
}
