import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar.tsx";
import type { Participant } from "../../types.ts";
import "../Profile/Profile.css";
import "./ParticipantProfile.css";

interface ParticipantProfileProps {
  participant: Participant;
}

export default function ParticipantProfile({ participant }: ParticipantProfileProps) {
  const { t } = useTranslation();
  const { user, alias, joinedAt } = participant;

  return (
    <div className="profile-page">
      <div className="profile-avatar">
        <Avatar username={user.username} avatar={user.avatar} size={80} />
      </div>
      <div className="profile-info">
        <div className="profile-info-row">
          <span className="profile-info-label">{t("profile.username")}</span>
          <span className="profile-info-value">{user.username}</span>
        </div>
        {user.name && (
          <div className="profile-info-row">
            <span className="profile-info-label">{t("profile.name")}</span>
            <span className="profile-info-value">{user.name}</span>
          </div>
        )}
        {alias && (
          <div className="profile-info-row">
            <span className="profile-info-label">{t("chat.set_alias")}</span>
            <span className="profile-info-value">{alias}</span>
          </div>
        )}
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
