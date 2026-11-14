import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import AppLayout from "./AppLayout";

const user = {
  id: "demo-superAdmin",
  name: "Iqra Shaikh",
  email: "superadmin@eromza.test",
  role: "superAdmin",
  department: null,
  status: "active",
};

const authValue = {
  user,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
  isAuthenticated: true,
};

describe("AppLayout", () => {
  it("renders the shared shell and role navigation", () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/super-admin/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Audit Logs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open profile menu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });
});
