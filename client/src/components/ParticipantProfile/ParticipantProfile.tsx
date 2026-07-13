import { useState } from "react";
import { useTranslation } from "react-i18next";
import { setParticipantAlias } from "../../api.ts";
import type { Participant } from "../../types.ts";
import Avatar from "../Avatar/Avatar.tsx";
import "../Profile/Profile.css";
import "./ParticipantProfile.css";

interface ParticipantProfileProps {
  participant: Participant;
  conversationId?: number;
  onAliasChanged?: (conversationId: number, userId: number, alias: string | null) => void;
}

export default function ParticipantProfile({ participant, conversationId, onAliasChanged }: ParticipantProfileProps) {
  const { t } = useTranslation();
  const { user, alias, joinedAt } = participant;
  const [editing, setEditing] = useState(false);
  const [aliasValue, setAliasValue] = useState(alias || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!conversationId) return;
    const val = aliasValue.trim();
    setSaving(true);
    try {
      await setParticipantAlias(conversationId, user.id, val || null);
      onAliasChanged?.(conversationId, user.id, val || null);
      setEditing(false);
    } catch {
      // ignore
    }
    setSaving(false);
  }

  return (
    <div className="profile-page">
      <div className="profile-avatar">
        <Avatar username={user.username} avatar={user.avatar} size={80} />
      </div>
      <div className="profile-info">
        {editing ? (
          <div className="profile-info-row">
            <span className="profile-info-label">{t("chat.set_alias")}</span>
            <div className="alias-edit-row">
              <input
                className="conv-alias-input"
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                placeholder={t("chat.alias_placeholder")}
                autoFocus
              />
              <button className="alias-save-btn" onClick={handleSave} disabled={saving}>{t("profile.save")}</button>
              <button className="alias-cancel-btn" onClick={() => { setEditing(false); setAliasValue(alias || ""); }}>{t("chat.cancel")}</button>
            </div>
          </div>
        ) : (
          <div className="profile-info-row">
            <span className="profile-info-label">{t("chat.alias_placeholder")}</span>
            <span className="profile-info-value alias-value" onClick={() => { setAliasValue(alias || ""); setEditing(true); }}>
              {alias || <span className="alias-placeholder">{t("chat.set_alias")}</span>}
            </span>
          </div>
        )}
        {user.name && (
          <div className="profile-info-row">
            <span className="profile-info-label">{t("profile.name")}</span>
            <span className="profile-info-value">{user.name}</span>
          </div>
        )}
        <div className="profile-info-row">
          <span className="profile-info-label">{t("profile.username")}</span>
          <span className="profile-info-value">{user.username}</span>
        </div>

        {joinedAt && (
          <div className="profile-info-row">
            <span className="profile-info-label">{t("profile.member_since")}</span>
            <span className="profile-info-value">{new Date(joinedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
