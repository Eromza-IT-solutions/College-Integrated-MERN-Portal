import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/adminApi", async () => {
  const { createAdminApiMock } = await import("../../test/adminApiFixture");
  return createAdminApiMock();
});

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

  it("renders examination subjects and exam forms", async () => {
    renderPage(<SubjectsAndExamForms />);
    expect(
      screen.getByRole("heading", { name: "Subjects & Exam Forms" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Subject & exam form register"),
    ).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByText(/Data Structures/)).toBeInTheDocument(),
      { timeout: 2000 },
    );
    fireEvent.click(await screen.findByTitle("View exam form"));
    expect(await screen.findByText("2 papers")).toBeInTheDocument();
  });

  it("renders examination timetables", async () => {
    renderPage(<ExamTimetables />);
    expect(
      screen.getByRole("heading", { name: "Exam Timetables" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Examination Schedule")).toBeInTheDocument();
    expect(await screen.findByText(/Advanced Accounting/)).toBeInTheDocument();
  });

  it("renders examination hall tickets", async () => {
    renderPage(<HallTickets />);
    expect(
      screen.getByRole("heading", { name: "Hall Tickets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hall Ticket Register")).toBeInTheDocument();
    expect(await screen.findByText("Fatima Khan")).toBeInTheDocument();
    expect(screen.getByText("S-001")).toBeInTheDocument();
  });
});
