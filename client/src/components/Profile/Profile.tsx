import { useState } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar.tsx";
import { updateProfile } from "../../api.ts";
import type { User } from "../../types.ts";
import type { AxiosError } from "axios";
import "./Profile.css";

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export default function Profile({ user, onUpdate }: ProfileProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(user.username);
  const [name, setName] = useState(user.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (username !== user.username) body.username = username;
      if (name !== (user.name || "")) body.name = name;
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      if (!Object.keys(body).length) {
        setSaving(false);
        return;
      }
      const updated = await updateProfile(body);
      onUpdate(updated);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setError(axiosErr.response?.data?.error || t("profile.update_failed"));
    }
    setSaving(false);
  }

  return (
    <div className="profile-page">
      <div className="profile-avatar">
        <Avatar username={user.username} size={80} />
      </div>
      <form className="profile-form" onSubmit={handleSave}>
        <label>
          {t("profile.username")}
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          {t("profile.name")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("profile.name_placeholder")} />
        </label>
        {user.createdAt && (
          <label>
            {t("profile.member_since")}
            <input value={new Date(user.createdAt).toLocaleDateString()} disabled />
          </label>
        )}
        <hr />
        <label>
          {t("profile.current_password")}
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("profile.password_placeholder")}
          />
        </label>
        <label>
          {t("profile.new_password")}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("profile.password_placeholder")}
          />
        </label>
        {error && <div className="profile-error">{error}</div>}
        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </form>
    </div>
  );
}
