import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import SuperAdmin_Topbar from "./SuperAdmin_Topbar";

afterEach(cleanup);

function renderTopbar(path, logout = vi.fn()) {
  const auth = {
    user: { id: "u1", name: "Test Admin", email: "admin@college.test", role: "superAdmin" },
    permissions: [],
    loading: false,
    login: vi.fn(),
    logout,
    isAuthenticated: true,
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="*" element={<SuperAdmin_Topbar />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { logout };
}

const cases = [
  ["/super-admin/dashboard", "Super Admin Dashboard"],
  ["/super-admin/users", "Manage Users"],
  ["/super-admin/admin-panels", "Manage Admin Panels"],
  ["/super-admin/settings", "System Settings"],
  ["/super-admin/reports", "Reports & Analytics"],
  ["/super-admin/audit-logs", "Audit Logs"],
];

describe("SuperAdmin_Topbar title follows the current page", () => {
  it.each(cases)("%s shows %s", (path, title) => {
    renderTopbar(path);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
  });
});

describe("SuperAdmin_Topbar notification bell", () => {
  it("opens the notifications panel and marks all as read", () => {
    renderTopbar("/super-admin/dashboard");

    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).toHaveTextContent("2");
    fireEvent.click(bell);
    expect(screen.getByText("2 unread updates")).toBeInTheDocument();
    expect(screen.getByText("New admission application received")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
    expect(screen.getByText("0 unread updates")).toBeInTheDocument();
    expect(bell).not.toHaveTextContent(/\d/);
  });
});

describe("SuperAdmin_Topbar profile dropdown", () => {
  it("opens to show the current role and signs out", async () => {
    const { logout } = renderTopbar("/super-admin/dashboard", vi.fn().mockResolvedValue());

    const pill = screen.getByRole("button", { name: "Open profile menu" });
    expect(pill).toHaveTextContent("SA");
    expect(pill).toHaveTextContent("Super Admin");
    fireEvent.click(pill);
    expect(screen.getByText("Current role")).toBeInTheDocument();
    expect(screen.getByText("admin@college.test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
