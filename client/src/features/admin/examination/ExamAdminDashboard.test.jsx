import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../services/adminApi", async () => {
  const { createAdminApiMock } = await import("../../../test/adminApiFixture");
  return createAdminApiMock();
});

import ExamAdminDashboard from "./ExamAdminDashboard";

describe("ExamAdminDashboard", () => {
  it("renders examination metrics, upcoming exams, and sessions", async () => {
    render(
      <MemoryRouter>
        <ExamAdminDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Examination Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Exam Sessions")).toBeInTheDocument();
    expect(screen.getByText(/Hall ticket issuance overview/)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming examinations/i)).toBeInTheDocument();
    expect(screen.getByText("Recent Activities")).toBeInTheDocument();
    expect(await screen.findByText(/Advanced Accounting/)).toBeInTheDocument();
  });
});
