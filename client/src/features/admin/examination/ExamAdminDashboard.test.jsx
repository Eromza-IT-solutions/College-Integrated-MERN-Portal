import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ExamAdminDashboard from "./ExamAdminDashboard";

describe("ExamAdminDashboard", () => {
  it("renders examination metrics, upcoming exams, and sessions", () => {
    render(
      <MemoryRouter>
        <ExamAdminDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Exam Admin Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    expect(screen.getByText("Hall ticket readiness")).toBeInTheDocument();
    expect(screen.getByText("Upcoming exams")).toBeInTheDocument();
    expect(screen.getByText("Exam sessions")).toBeInTheDocument();
    expect(screen.getByText("Advanced Accounting")).toBeInTheDocument();
  });
});
