import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import ManageAdminPanels from "./super/ManageAdminPanels";
import AuditLogs from "./super/AuditLogs";
import ReportsAnalytics from "./super/ReportsAnalytics";
import SystemSettings from "./super/SystemSettings";
import ManageUsers from "./super/ManageUsers";

afterEach(cleanup);

function renderPage(page) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("super admin secondary pages", () => {
  it("renders user management", async () => {
    renderPage(<ManageUsers />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(await screen.findByText("Iqra Shaikh")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add user/i }),
    ).toBeInTheDocument();
  });

  it("renders admin panels", () => {
    renderPage(<ManageAdminPanels />);
    expect(screen.getByText("Total panels")).toBeInTheDocument();
    expect(screen.getByText("College Admin")).toBeInTheDocument();
    expect(screen.getByText("Create new panel")).toBeInTheDocument();
  });

  it("renders reports and analytics", () => {
    renderPage(<ReportsAnalytics />);
    // expect(
    //   screen.getByRole("heading", { name: "User Growth" }),
    // ).toBeInTheDocument();
    // expect(
    //   screen.getByRole("heading", { name: "Reports & Analytics" }),
    // ).toBeInTheDocument();
    // ReportsAnalytics now renders the active report's own heading instead of a page title.
    expect(
      screen.getByRole("heading", { name: "Department report" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Live numbers from the college database")).toBeInTheDocument();
    // expect(screen.getByText(/Report Types/)).toBeInTheDocument();
    // expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Departments" })).toBeInTheDocument();
  });

  it("renders audit logs", () => {
    renderPage(<AuditLogs />);
    expect(
      screen.getByRole("heading", { name: "Activity Log" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Events")).toBeInTheDocument();
  });

  it("renders system settings", () => {
    renderPage(<SystemSettings />);
    expect(screen.getByText("College Name")).toBeInTheDocument();
    expect(screen.getByText("Default Role")).toBeInTheDocument();
    expect(screen.getByText("Academic Year")).toBeInTheDocument();
  });
});
