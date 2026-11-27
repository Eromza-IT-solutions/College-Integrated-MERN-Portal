import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import Attendance from "./Attendance";
import DepartmentInfo from "./DepartmentInfo";
import DepartmentReports from "./DepartmentReports";
import ManageStudents from "./ManageStudents";
import ManageTeachers from "./ManageTeachers";
import MarksApproval from "./MarksApproval";

afterEach(cleanup);

function renderPage(page) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("HOD pages", () => {
  it("renders department information", () => {
    renderPage(<DepartmentInfo />);
    expect(document.body).toBeInTheDocument();
  });

  it("renders teacher management", () => {
    renderPage(<ManageTeachers />);
    expect(
      screen.getByRole("button", { name: /add teacher/i }),
    ).toBeInTheDocument();
  });

  it("renders student management", () => {
    renderPage(<ManageStudents />);
    expect(
      screen.getByRole("button", { name: /add student/i }),
    ).toBeInTheDocument();
  });

  it("renders department attendance", () => {
    renderPage(<Attendance />);
    expect(screen.getByText("Student Attendance")).toBeInTheDocument();
  });

  it("renders department reports", () => {
    renderPage(<DepartmentReports />);
    expect(
      screen.getByText(
        "Organize, review and publish department reports.",
      ),
    ).toBeInTheDocument();
  });

  it("renders marks approval", () => {
    renderPage(<MarksApproval />);
    expect(document.body).toBeInTheDocument();
  });
});