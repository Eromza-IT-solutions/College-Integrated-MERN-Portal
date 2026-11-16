import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AdminPanels from "./super/AdminPanels";
import AuditLogs from "./super/AuditLogs";
import Reports from "./super/Reports";
import Settings from "./super/Settings";
import Users from "./super/Users";

afterEach(cleanup);

function renderPage(page) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("super admin secondary pages", () => {
  it("renders user management", () => {
    renderPage(<Users />);
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Iqra Shaikh")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add user/i }),
    ).toBeInTheDocument();
  });

  it("renders admin panels", () => {
    renderPage(<AdminPanels />);
    expect(
      screen.getByRole("heading", { name: "Admin Panels" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "College Website Admin" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Access overview")).toBeInTheDocument();
  });

  it("renders reports and analytics", () => {
    renderPage(<Reports />);
    expect(
      screen.getByRole("heading", { name: "Reports & Analytics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monthly admission summary")).toBeInTheDocument();
    expect(screen.getByText("Accounts by role")).toBeInTheDocument();
  });

  it("renders audit logs", () => {
    renderPage(<AuditLogs />);
    expect(
      screen.getByRole("heading", { name: "Audit Logs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Updated Settings")).toBeInTheDocument();
    expect(screen.getByText("Total Events")).toBeInTheDocument();
  });

  it("renders system settings", () => {
    renderPage(<Settings />);
    expect(
      screen.getByRole("heading", { name: "System Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Institution profile")).toBeInTheDocument();
    expect(screen.getByText("Notification preferences")).toBeInTheDocument();
  });
});
