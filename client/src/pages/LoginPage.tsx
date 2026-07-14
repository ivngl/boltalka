import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext.tsx";
import "../components/AuthScreen/AuthScreen.css";

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, handleLogin } = useAuth();

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>{t("app.title")}</h1>
        <div className="auth-tabs">
          <form onSubmit={handleLogin}>
            <h2>{t("auth.login.title")}</h2>
            <input name="username" placeholder={t("auth.register.username")} required autoFocus />
            <input name="password" type="password" placeholder={t("auth.login.password")} required />
            <button type="submit">{t("auth.login.submit")}</button>
          </form>
          <p className="switch">
            <Link to="/register">{t("auth.login.switch")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
