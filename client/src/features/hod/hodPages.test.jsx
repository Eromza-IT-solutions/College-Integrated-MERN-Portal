import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Attendance from "./Attendance";
import DepartmentInfo from "./DepartmentInfo";
import DepartmentReports from "./DepartmentReports";
import ManageStudents from "./ManageStudents";
import ManageTeachers from "./ManageTeachers";

afterEach(cleanup);

function renderPage(page) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("HOD pages", () => {
  it("renders department information", () => {
    renderPage(<DepartmentInfo />);
    expect(
      screen.getByRole("heading", { name: "Department Info" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Department of Computer Science"),
    ).toBeInTheDocument();
    expect(screen.getByText("Programmes offered")).toBeInTheDocument();
  });

  it("renders teacher management", () => {
    renderPage(<ManageTeachers />);
    expect(
      screen.getByRole("heading", { name: "Manage Teachers" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dr. Sneha Patil")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add teacher/i }),
    ).toBeInTheDocument();
  });

  it("renders student management", () => {
    renderPage(<ManageStudents />);
    expect(
      screen.getByRole("heading", { name: "Manage Students" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fatima Khan")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add student/i }),
    ).toBeInTheDocument();
  });

  it("renders department attendance", () => {
    renderPage(<Attendance />);
    expect(
      screen.getByRole("heading", { name: "Attendance" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Class attendance")).toBeInTheDocument();
    expect(screen.getByText("B.Sc. CS · Semester V")).toBeInTheDocument();
  });

  it("renders department reports", () => {
    renderPage(<DepartmentReports />);
    expect(
      screen.getByRole("heading", { name: "Department Reports" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monthly attendance summary")).toBeInTheDocument();
    expect(screen.getByText("Reports available")).toBeInTheDocument();
  });
});
