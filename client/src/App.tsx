import { Routes, Route, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./contexts/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import BottomNav from "./components/BottomNav/BottomNav.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import ChatContent from "./pages/ChatContent.tsx";
import ConversationPage from "./pages/ConversationPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import ParticipantProfilePage from "./pages/ParticipantProfilePage.tsx";
import TopicsPage from "./pages/TopicsPage.tsx";
import TopicDetailPage from "./pages/TopicDetailPage.tsx";
import SocietiesPage from "./pages/SocietiesPage.tsx";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const { loading } = useAuth();
  const location = useLocation();
  const showBottomNav = ["/", "/topics", "/societies"].includes(location.pathname);

  if (loading) return <div className="loading">{t("app.loading")}</div>;

  return (
    <>
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
          <Route path="conversation/:id" element={<ConversationPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="user/:id" element={<ParticipantProfilePage />} />
          <Route path="topics" element={<TopicsPage />} />
          <Route path="topics/:id" element={<TopicDetailPage />} />
          <Route path="societies" element={<SocietiesPage />} />
        </Route>
      </Routes>
      {showBottomNav && <BottomNav />}
    </>
  );
}

export default App;
