import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import * as authService from "../services/authService";
import { setUnauthorizedHandler } from "../services/http";

const EMPTY_SESSION = { user: null, permissions: [] };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(EMPTY_SESSION);
  const [loading, setLoading] = useState(true);

  // On page load / refresh, ask the server whether the cookie session is still valid.
  useEffect(() => {
    let active = true;
    authService
      .fetchCurrentSession()
      .then((current) => {
        if (active && current) setSession(current);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from the API (idle timeout, disabled account, password reset) signs the user out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => setSession(EMPTY_SESSION));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const next = await authService.login(credentials);
    setSession(next);
    return next.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Even if the request fails, drop the local state; the server session expires on its own.
    }
    setSession(EMPTY_SESSION);
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      permissions: session.permissions,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(session.user),
    }),
    [session, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
