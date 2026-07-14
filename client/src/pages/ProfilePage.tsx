import { useNavigate } from "react-router-dom";
import Profile from "../components/Profile/Profile.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <Profile user={user} onUpdate={updateUser} onLogout={handleLogout} />
  );
}
