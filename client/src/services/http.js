import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Auth endpoints answer 401 for ordinary reasons (wrong password, no session yet), not "session expired".
const isAuthEndpoint = (url = "") => url.includes("/auth/");

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      onUnauthorized?.();
    }

    const message =
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      "Something went wrong. Please try again.";

    return Promise.reject(new Error(message, { cause: error }));
  },
);

export default http;
