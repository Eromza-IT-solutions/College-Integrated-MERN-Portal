import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import ApplicantDashboard from "./applicant/ApplicantDashboard";
import HODDashboard from "./hod/HODDashboard";
import StudentDashboard from "./student/StudentDashboard";
import TeacherDashboard from "./teacher/TeacherDashboard";

afterEach(cleanup);

function renderDashboard(dashboard) {
  render(<MemoryRouter>{dashboard}</MemoryRouter>);
}

describe("role dashboards", () => {
  it("renders the HOD dashboard", () => {
    renderDashboard(<HODDashboard />);
    expect(
      screen.getByRole("heading", { name: "HOD Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Department health")).toBeInTheDocument();
    expect(screen.getByText("Prof. Ayesha Khan")).toBeInTheDocument();
  });

  it("renders the teacher dashboard", () => {
    renderDashboard(<TeacherDashboard />);
    expect(
      screen.getByRole("heading", { name: "Teacher Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Today's timetable")).toBeInTheDocument();
    expect(screen.getAllByText("Data Structures").length).toBeGreaterThan(0);
  });

  it("renders the student dashboard", () => {
    renderDashboard(<StudentDashboard />);
    expect(
      screen.getByRole("heading", { name: "Student Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current GPA 8.7")).toBeInTheDocument();
    expect(screen.getAllByText("Data Structures").length).toBeGreaterThan(0);
  });

  it("renders the applicant dashboard", () => {
    renderDashboard(<ApplicantDashboard />);
    expect(
      screen.getByRole("heading", { name: "Applicant Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Application summary")).toBeInTheDocument();
    expect(screen.getByText("APP-2026-0486")).toBeInTheDocument();
  });
});
