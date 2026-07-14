import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { getTopic, sendTopicMessage, editTopicMessage, deleteTopicMessage } from "../api.ts";
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
  activeReplyId: string | null;
  onReply: (m: TopicMessage) => void;
  onCancelReply: () => void;
  onSendReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  user: { id: string; username: string; avatar?: string };
  sending: boolean;
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string;
}

function Comment({ node, activeReplyId, onReply, onCancelReply, onSendReply, onEdit, onDelete, user, sending, t }: CommentProps) {
  const m = node.message;
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.content);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const isActive = activeReplyId === m.id;
  const isOwn = m.sender.id === user.id;

  useEffect(() => {
    if (isActive) inputRef.current?.focus();
  }, [isActive]);

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = replyText.trim();
    if (!content || sending) return;
    await onSendReply(m.id, content);
    setReplyText("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = editText.trim();
    if (!content || content === m.content) { setEditing(false); return; }
    await onEdit(m.id, content);
    setEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setEditText(m.content); setEditing(false); }
  }

  function handleDelete() {
    if (window.confirm(t("topics.confirmDelete", "Delete this comment?"))) {
      onDelete(m.id);
    }
  }

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
        {editing ? (
          <form className="topic-edit-form" onSubmit={handleEditSubmit}>
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
            />
            <div className="topic-edit-actions">
              <button type="submit" disabled={sending || !editText.trim()}>{t("topics.save", "Save")}</button>
              <button type="button" onClick={() => { setEditText(m.content); setEditing(false); }}>{t("topics.cancel", "Cancel")}</button>
            </div>
          </form>
        ) : (
          <div className="topic-comment-text-row">
            <span className="topic-comment-text">{m.content}</span>
            <div className="topic-comment-actions">
              <button className="topic-comment-reply-btn" onClick={() => onReply(m)} title={t("topics.reply", "Reply")}>+</button>
              {isOwn && (
                <>
                  <button className="topic-comment-edit-btn" onClick={() => setEditing(true)} title={t("topics.edit", "Edit")}>✎</button>
                  <button className="topic-comment-delete-btn" onClick={handleDelete} title={t("topics.delete", "Delete")}>🗑</button>
                </>
              )}
            </div>
          </div>
        )}
        {isActive && (
          <form className="topic-inline-reply" onSubmit={handleSubmit}>
            <Avatar username={user.username} avatar={user.avatar} size={24} />
            <input
              ref={inputRef}
              type="text"
              placeholder={t("topics.replyTo", "Reply to {{name}}...", { name: m.sender.name || m.sender.username })}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button type="submit" disabled={sending || !replyText.trim()}>
              ↗
            </button>
            <button type="button" className="topic-inline-reply-cancel" onClick={onCancelReply}>×</button>
          </form>
        )}
        {node.children.length > 0 && (
          <div className="topic-comment-replies">
            {node.children.map((child) => (
              <Comment key={child.message.id} node={child} activeReplyId={activeReplyId} onReply={onReply} onCancelReply={onCancelReply} onSendReply={onSendReply} onEdit={onEdit} onDelete={onDelete} user={user} sending={sending} t={t} />
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
  const [sending, setSending] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
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
    setActiveReplyId((prev) => prev === m.id ? null : m.id);
  }

  function cancelReply() {
    setActiveReplyId(null);
  }

  async function handleSendReply(parentId: string, content: string) {
    setSending(true);
    try {
      const msg = await sendTopicMessage(topic!.id, content, parentId);
      setTopic((prev) => prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev);
      setActiveReplyId(null);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  async function handleEdit(messageId: string, content: string) {
    try {
      const updated = await editTopicMessage(topic!.id, messageId, content);
      setTopic((prev) => prev ? {
        ...prev,
        messages: (prev.messages || []).map((m) => m.id === messageId ? updated : m),
      } : prev);
    } catch {
      // ignore
    }
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteTopicMessage(topic!.id, messageId);
      setTopic((prev) => prev ? {
        ...prev,
        messages: (prev.messages || []).filter((m) => m.id !== messageId),
      } : prev);
    } catch {
      // ignore
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
          <Comment key={node.message.id} node={node} activeReplyId={activeReplyId} onReply={handleReply} onCancelReply={cancelReply} onSendReply={handleSendReply} onEdit={handleEdit} onDelete={handleDelete} user={user} sending={sending} t={t} />
        ))}
        <div ref={msgEndRef} />
      </div>
    </>
  );
}
