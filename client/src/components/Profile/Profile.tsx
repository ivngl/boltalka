import type { AxiosError } from "axios";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteProfile, updateProfile, uploadFile } from "../../api.ts";
import type { User } from "../../types.ts";
import Avatar from "../Avatar/Avatar.tsx";
import Button from "../../ui/Button.tsx";
import "./Profile.css";

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

export default function Profile({ user, onUpdate, onLogout }: ProfileProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(user.username);
  const [name, setName] = useState(user.name || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const result = await uploadFile(file);
      setAvatar(result.url);
    } catch {
      setError(t("profile.avatar_upload_failed", "Failed to upload avatar"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onDeleteProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await deleteProfile(user.id);
      onLogout();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>;
      setError(axiosErr.response?.data?.error || t("profile.delete_failed", "Failed to delete profile"));
    }
  }
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (username !== user.username) body.username = username;
      if (name !== (user.name || "")) body.name = name;
      if (avatar !== (user.avatar || "")) body.avatar = avatar;
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
      <div className="profile-avatar" onClick={() => fileInputRef.current?.click()}>
        <Avatar username={user.username} avatar={avatar} size={80} />
        <div className="avatar-overlay">{t("profile.change_photo", "Change photo")}</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
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
        <Button type="submit" variant="primary" fullWidth disabled={saving}>
          {saving ? t("profile.saving") : t("profile.save")}
        </Button>
      </form>

      <form className="profile-form" onSubmit={onDeleteProfile}>
        <Button type="submit" variant="danger" fullWidth>{t("profile.delete_profile", "Delete Profile")}</Button>
      </form>
    </div>
  );
}
