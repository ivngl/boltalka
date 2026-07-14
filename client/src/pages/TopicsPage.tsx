import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createTopic, getTopics } from "../api.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import type { Topic } from "../types.ts";
import TopicItem from "../components/TopicItem/TopicItem.tsx";
import "./TopicsPage.css";

export default function TopicsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const result = await getTopics(q);
      setTopics(Array.isArray(result) ? result : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    load(search || undefined);
  }, [load, search, user]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const topic = await createTopic(newTitle.trim(), newDesc.trim() || undefined);
    setTopics((prev) => [topic, ...prev]);
    setNewTitle("");
    setNewDesc("");
    setShowCreate(false);
  };

  return (
    <div className="topics-page">
      <div className="topics-header">
        <h2>{t("topics.title", "Topics")}</h2>
        <div className="topics-actions">
          <input
            type="text"
            className="topics-search"
            placeholder={t("topics.search", "Search topics...")}
            value={search}
            onChange={handleSearch}
          />
          <button className="topics-create-btn" onClick={() => setShowCreate(!showCreate)}>
            +
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="topics-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder={t("topics.titlePlaceholder", "Topic title")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder={t("topics.descPlaceholder", "Description (optional)")}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="topics-create-actions">
            <button type="button" onClick={() => setShowCreate(false)}>
              {t("common.cancel", "Cancel")}
            </button>
            <button type="submit" disabled={!newTitle.trim()}>
              {t("topics.create", "Create")}
            </button>
          </div>
        </form>
      )}

      <div className="topics-list">
        {loading ? (
          <div className="topics-empty">
            <p>{t("topics.loading", "Loading...")}</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="topics-empty">
            <span className="topics-empty-icon">💬</span>
            <p>{t("topics.empty", "No topics yet")}</p>
          </div>
        ) : (
          topics?.map((topic) => <TopicItem key={topic.id} topic={topic} onClick={(t) => navigate(`/topics/${t.id}`)} />)
        )}
      </div>
    </div>
  );
}
