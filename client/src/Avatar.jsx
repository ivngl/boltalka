const colors = [
  "#1f6feb", "#3fb950", "#d29922", "#f78166", "#db6d28",
  "#a371f7", "#6e7681", "#79c0ff", "#56d364", "#e3b341",
];

function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

import { useTranslation } from "react-i18next";

export default function Avatar({ username, size = 36 }) {
  const { t } = useTranslation();
  const letter = username?.charAt(0).toUpperCase() || t("avatar.fallback");
  const bg = hashColor(username || "");

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: size * 0.45,
        color: "#fff",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {letter}
    </div>
  );
}
