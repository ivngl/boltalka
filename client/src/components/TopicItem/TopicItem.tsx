import { useTranslation } from "react-i18next";
import type { Topic } from "../../types.ts";
import "./TopicItem.css";

interface Props {
  topic: Topic;
}

export default function TopicItem({ topic }: Props) {
  const { t } = useTranslation();
  const count = topic._count?.messages ?? 0;

  return (
    <div className="topic-item">
      <div className="topic-item-avatar">
        {topic.creator.avatar ? (
          <img src={topic.creator.avatar} alt="" />
        ) : (
          <span>{topic.creator.username[0].toUpperCase()}</span>
        )}
      </div>
      <div className="topic-item-info">
        <div className="topic-item-top">
          <span className="topic-item-title">{topic.title}</span>
          <span className="topic-item-count">
            {t("topics.replies", "{{count}} replies", { count })}
          </span>
        </div>
        {topic.description && (
          <p className="topic-item-desc">{topic.description}</p>
        )}
        <span className="topic-item-by">
          {topic.creator.name || topic.creator.username}
        </span>
      </div>
    </div>
  );
}
