import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AdmissionAdminDashboard from "./AdmissionAdminDashboard";

describe("AdmissionAdminDashboard", () => {
  it("renders admission metrics, applications, and program demand", () => {
    render(
      <MemoryRouter>
        <AdmissionAdminDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Welcome to Admission Dashboard!",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
    expect(screen.getByText("Application Overview")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Admission Fee Management")).toBeInTheDocument();
  });
});
