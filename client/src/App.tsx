import { Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./contexts/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import ChatContent from "./pages/ChatContent.tsx";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const { loading } = useAuth();

  if (loading) return <div className="loading">{t("app.loading")}</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<ChatContent />} />
      </Route>
    </Routes>
  );
}

export default App;
