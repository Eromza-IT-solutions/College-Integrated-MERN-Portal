import http from "./http";

// The API returns `fullName`; the UI uses `name`. Passwords/tokens are never kept in the browser:
// the session lives in an HttpOnly cookie.
function normalizeSession(data) {
  const user = data.user;
  return {
    user: {
      ...user,
      name: user.fullName ?? user.name ?? "User",
      department: user.department ?? null,
      status: user.status ?? "active",
    },
    permissions: data.permissions ?? [],
  };
}

export async function login({ identifier, password }) {
  const { data } = await http.post("/auth/login", { identifier, password });
  return normalizeSession(data.data);
}

// Returns the current session, or null when nobody is signed in (401).
export async function fetchCurrentSession() {
  try {
    const { data } = await http.get("/auth/me");
    return normalizeSession(data.data);
  } catch (err) {
    if (err.cause?.response?.status === 401) return null;
    throw err;
  }
}

export async function logout() {
  await http.post("/auth/logout");
}

export async function forgotPassword(email) {
  const { data } = await http.post("/auth/forgot-password", { email });
  return data.data.message;
}

export async function resetPassword({ token, password }) {
  const { data } = await http.post("/auth/reset-password", { token, password });
  return data.data.message;
}
