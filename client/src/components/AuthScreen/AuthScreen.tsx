import { useTranslation } from "react-i18next";
import "./AuthScreen.css";

interface AuthScreenProps {
  view: "auth" | "register";
  onLogin: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onRegister: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setView: (view: "auth" | "register") => void;
}

export default function AuthScreen({ view, onLogin, onRegister, setView }: AuthScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>{t("app.title")}</h1>
        {view === "auth" && (
          <div className="auth-tabs">
            <form onSubmit={onLogin}>
              <h2>{t("auth.login.title")}</h2>
              <input name="username" placeholder={t("auth.register.username")} required autoFocus />
              <input name="password" type="password" placeholder={t("auth.login.password")} required />
              <button type="submit">{t("auth.login.submit")}</button>
            </form>
            <p className="switch" onClick={() => setView("register")}>{t("auth.login.switch")}</p>
          </div>
        )}
        {view === "register" && (
          <div className="auth-tabs">
            <form onSubmit={onRegister}>
              <h2>{t("auth.register.title")}</h2>
              <input name="username" placeholder={t("auth.register.username")} required autoFocus />
              <input name="name" placeholder={t("auth.register.name")} />
              <input name="password" type="password" placeholder={t("auth.register.password")} required />
              <button type="submit">{t("auth.register.submit")}</button>
            </form>
            <p className="switch" onClick={() => setView("auth")}>{t("auth.register.switch")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
