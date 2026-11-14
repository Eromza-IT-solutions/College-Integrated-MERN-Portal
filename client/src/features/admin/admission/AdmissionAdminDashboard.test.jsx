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
      screen.getByRole("heading", { name: "Admission Admin Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Applications")).toBeInTheDocument();
    expect(screen.getByText("Admission funnel")).toBeInTheDocument();
    expect(screen.getByText("Recent applications")).toBeInTheDocument();
    expect(screen.getByText("Program demand")).toBeInTheDocument();
    expect(screen.getByText("Rida Khan")).toBeInTheDocument();
  });
});
