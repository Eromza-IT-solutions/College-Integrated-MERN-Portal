import { useState } from "react";
import { AuthContext } from "./AuthContext";
import { createDemoUser, loginWithDemoAccount } from "../services/authService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    const nextUser = await loginWithDemoAccount(credentials);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role) => {
    setUser(createDemoUser(role));
  };

  const value = {
    user,
    login,
    logout,
    switchRole,
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
