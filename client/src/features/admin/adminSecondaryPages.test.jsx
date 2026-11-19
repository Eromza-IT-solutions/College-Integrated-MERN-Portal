import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AdmissionStatus from "./admission/AdmissionStatus";
import VerifyDocuments from "./admission/VerifyDocuments";
import ExamTimetables from "./examination/ExamTimetables";
import HallTickets from "./examination/HallTickets";
import SubjectsAndExamForms from "./examination/SubjectsAndExamForms";
import DepartmentsAndCourses from "./website/DepartmentsAndCourses";
import FacultyProfiles from "./website/FacultyProfiles";
import GalleryAndDocuments from "./website/GalleryAndDocuments";

afterEach(cleanup);

function renderPage(page) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("secondary admin pages", () => {
  it("renders website departments and courses", () => {
    renderPage(<DepartmentsAndCourses />);
    expect(
      screen.getByRole("heading", { name: "Departments & Courses" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Academic Overview")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
  });

  it("renders website faculty profiles", () => {
    renderPage(<FacultyProfiles />);
    expect(
      screen.getByRole("heading", { name: "Faculty Profiles" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Faculty Members")).toBeInTheDocument();
    expect(screen.getByText("Dr. Rahul Sharma")).toBeInTheDocument();
  });

  it("renders website gallery and documents", () => {
    renderPage(<GalleryAndDocuments />);
    expect(
      screen.getByRole("heading", { name: "Gallery & Documents" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("No Images Available")).toBeInTheDocument();
  });

  it("renders admission document verification", () => {
    renderPage(<VerifyDocuments />);
    expect(
      screen.getByRole("heading", { name: "Verify Student Documents" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Document Verification Overview"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
  });

  it("renders admission status board", () => {
    renderPage(<AdmissionStatus />);
    expect(
      screen.getByRole("heading", { name: "Admission Status Tracking" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Admission Overview")).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
  });

  it("renders examination subjects and exam forms", () => {
    renderPage(<SubjectsAndExamForms />);
    expect(
      screen.getByRole("heading", { name: "Subjects & Exam Forms" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Subject & exam form register"),
    ).toBeInTheDocument();
    expect(screen.getByText("Data Structures")).toBeInTheDocument();
  });

  it("renders examination timetables", () => {
    renderPage(<ExamTimetables />);
    expect(
      screen.getByRole("heading", { name: "Exam Timetables" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Examination Schedule")).toBeInTheDocument();
    expect(screen.getByText("Advanced Accounting")).toBeInTheDocument();
  });

  it("renders examination hall tickets", () => {
    renderPage(<HallTickets />);
    expect(
      screen.getByRole("heading", { name: "Hall Tickets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hall Ticket Register")).toBeInTheDocument();
    expect(screen.getByText("Fatima Khan")).toBeInTheDocument();
  });
});
