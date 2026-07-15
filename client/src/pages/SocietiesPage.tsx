import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createSociety, getSocieties, deleteSociety } from "../api.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import type { Society } from "../types.ts";
import SocietyItem from "../components/SocietyItem/SocietyItem.tsx";
import ConfirmModal from "../components/ConfirmModal/ConfirmModal.tsx";
import "./TopicsPage.css";

export default function SocietiesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Society | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const result = await getSocieties(q);
      setSocieties(Array.isArray(result) ? result : []);
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
    if (!newName.trim()) return;
    const society = await createSociety(newName.trim(), newDesc.trim() || undefined);
    setSocieties((prev) => [society, ...prev]);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  };

  async function handleDeleteSociety() {
    if (!deleteTarget) return;
    try {
      await deleteSociety(deleteTarget.id);
      setSocieties((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } catch {
      // ignore
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="topics-page">
      <div className="topics-header">
        <h2>{t("societies.title", "Societies")}</h2>
        <div className="topics-actions">
          <input
            type="text"
            className="topics-search"
            placeholder={t("societies.search", "Search societies...")}
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
            placeholder={t("societies.namePlaceholder", "Society name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            placeholder={t("societies.descPlaceholder", "Description (optional)")}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="topics-create-actions">
            <button type="button" onClick={() => setShowCreate(false)}>
              {t("common.cancel", "Cancel")}
            </button>
            <button type="submit" disabled={!newName.trim()}>
              {t("societies.create", "Create")}
            </button>
          </div>
        </form>
      )}

      <div className="topics-list">
        {loading ? (
          <div className="topics-empty">
            <p>{t("societies.loading", "Loading...")}</p>
          </div>
        ) : societies.length === 0 ? (
          <div className="topics-empty">
            <span className="topics-empty-icon">👥</span>
            <p>{t("societies.empty", "No societies yet")}</p>
          </div>
        ) : (
          societies.map((society) => (
            <SocietyItem
              key={society.id}
              society={society}
              currentUserId={user?.id}
              onDelete={(s) => setDeleteTarget(s)}
            />
          ))
        )}
      </div>
      {deleteTarget && (
        <ConfirmModal
          title={t("societies.deleteSociety", "Delete society")}
          message={t("societies.confirmDeleteSociety", "Delete this society?")}
          onConfirm={handleDeleteSociety}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

