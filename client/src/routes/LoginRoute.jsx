import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "../features/auth/Login";
import { getRoleHome } from "../config/roles";
import { useAuth } from "../hooks/useAuth";

export default function LoginRoute() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const handleLogin = async (credentials) => {
    const nextUser = await login(credentials);
    navigate(from ?? getRoleHome(nextUser.role), { replace: true });
  };

  if (user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <Login onLogin={handleLogin} />;
}
