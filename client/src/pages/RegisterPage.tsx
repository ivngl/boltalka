import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext.tsx";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { user, handleRegister } = useAuth();

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>{t("app.title")}</h1>
        <div className="auth-tabs">
          <form onSubmit={handleRegister}>
            <h2>{t("auth.register.title")}</h2>
            <input name="username" placeholder={t("auth.register.username")} required autoFocus />
            <input name="name" placeholder={t("auth.register.name")} />
            <input name="password" type="password" placeholder={t("auth.register.password")} required />
            <button type="submit">{t("auth.register.submit")}</button>
          </form>
          <p className="switch">
            <Link to="/login">{t("auth.register.switch")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
