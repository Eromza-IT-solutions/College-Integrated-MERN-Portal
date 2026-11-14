import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SuperAdminDashboard from "./SuperAdminDashboard";

describe("SuperAdminDashboard", () => {
  it("renders KPIs, user management, and admin panels", () => {
    render(
      <MemoryRouter>
        <SuperAdminDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Super Admin Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Manage users")).toBeInTheDocument();
    expect(screen.getByText("Admin panels")).toBeInTheDocument();
    expect(screen.getByText("Iqra Shaikh")).toBeInTheDocument();
  });
});
