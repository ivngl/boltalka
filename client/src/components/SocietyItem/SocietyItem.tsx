import { useTranslation } from "react-i18next";
import type { Society } from "../../types.ts";
import "./SocietyItem.css";

interface Props {
  society: Society;
  currentUserId?: string;
  onClick?: (society: Society) => void;
  onDelete?: (society: Society) => void;
}

export default function SocietyItem({ society, currentUserId, onClick, onDelete }: Props) {
  const { t } = useTranslation();
  const isOwn = currentUserId === society.creator.id;

  return (
    <div className="society-item" onClick={() => onClick?.(society)}>
      <div className="society-item-avatar">
        {society.creator.avatar ? (
          <img src={society.creator.avatar} alt="" />
        ) : (
          <span>{society.creator.username[0].toUpperCase()}</span>
        )}
      </div>
      <div className="society-item-info">
        <div className="society-item-top">
          <span className="society-item-title">{society.name}</span>
        </div>
        {society.description && (
          <p className="society-item-desc">{society.description}</p>
        )}
        <span className="society-item-by">
          {society.creator.name || society.creator.username}
        </span>
      </div>
      {isOwn && onDelete && (
        <button
          className="society-item-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(society); }}
          title={t("societies.deleteSociety", "Delete society")}
        >🗑</button>
      )}
    </div>
  );
}
