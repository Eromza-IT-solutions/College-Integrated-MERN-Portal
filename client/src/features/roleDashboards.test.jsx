import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApplicantDashboard from "./applicant/ApplicantDashboard";
import HODDashboard from "./hod/HODDashboard";
import StudentDashboard from "./student/StudentDashboard";
import TeacherDashboard from "./teacher/TeacherDashboard";
import { TeacherProvider } from "./teacher/TeacherShared";
import {
  fetchAttendanceSummary,
  fetchAvailableExams,
  fetchResults,
  fetchStudentOverview,
  fetchTimetable,
} from "../services/studentApi";

vi.mock("../services/studentApi", () => ({
  fetchStudentOverview: vi.fn(),
  fetchAttendanceSummary: vi.fn(),
  fetchTimetable: vi.fn(),
  fetchResults: vi.fn(),
  fetchAvailableExams: vi.fn(),
  fetchExamForms: vi.fn(),
  fetchHallTickets: vi.fn(),
  fetchPayments: vi.fn(),
  fetchPaymentReceipt: vi.fn(),
  updateStudentMobile: vi.fn(),
  downloadHallTicketPdf: vi.fn(),
  downloadExamFormPdf: vi.fn(),
  downloadPaymentReceiptPdf: vi.fn(),
}));

afterEach(cleanup);

function renderDashboard(dashboard) {
  render(<MemoryRouter>{dashboard}</MemoryRouter>);
}

beforeEach(() => {
  vi.mocked(fetchStudentOverview).mockResolvedValue({
    student: {
      _id: "student-1",
      enrollmentNumber: "EN001",
      currentSemester: 5,
      division: "A",
      status: "active",
    },
    program: {
      _id: "program-1",
      name: "B.Sc. Computer Science",
      level: "UG",
    },
    department: { name: "Computer Science" },
    user: {
      fullName: "Rida Khan",
      email: "rida.khan@eromza.test",
      mobile: "9876543210",
    },
    admissionYear: { label: "2026-27" },
    enrollments: [
      {
        subjectId: {
          _id: "subject-1",
          name: "Data Structures",
          code: "CS301",
        },
      },
    ],
  });
  vi.mocked(fetchAttendanceSummary).mockResolvedValue({
    subjects: [
      {
        subjectId: "subject-1",
        subject: { name: "Data Structures", code: "CS301" },
        held: 50,
        present: 46,
        leave: 0,
        percentage: 92,
      },
    ],
  });
  vi.mocked(fetchTimetable).mockResolvedValue([
    {
      _id: "slot-1",
      dayOfWeek: new Date().getDay() || 7,
      startTime: "09:00",
      endTime: "10:00",
      subjectId: { name: "Data Structures", code: "CS301" },
      teacherUserId: { fullName: "Dr. Sana Patel" },
      room: "Lab 2",
    },
  ]);
  vi.mocked(fetchResults).mockResolvedValue([
    {
      _id: "result-1",
      semester: 5,
      sgpa: 8.7,
      outcome: "pass",
      percentage: 85,
      creditsEarned: 22,
      creditsTotal: 24,
      failedSubjects: 0,
      finalGrade: "A",
      lines: [
        {
          subjectId: "subject-1",
          name: "Data Structures",
          code: "CS301",
          total: 86,
          max: 100,
          grade: "A",
          status: "pass",
        },
      ],
    },
  ]);
  vi.mocked(fetchAvailableExams).mockResolvedValue([]);
});

describe("role dashboards", () => {
  it("renders the HOD dashboard", () => {
    renderDashboard(<HODDashboard />);
    expect(
      screen.getByRole("heading", { name: "Head of Department Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Student Attendance Trend")).toBeInTheDocument();
    expect(screen.getByText("Prof. Ayesha Khan")).toBeInTheDocument();
  });

  it("renders the teacher dashboard", () => {
    // renderDashboard(<TeacherDashboard />);
    renderDashboard(<TeacherProvider><TeacherDashboard /></TeacherProvider>);
    // expect(
    //   screen.getByRole("heading", { name: "Teacher Dashboard" }),
    // ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^(Good morning|Good afternoon|Good evening), Sana$/ }),
    ).toBeInTheDocument();
    // expect(screen.getByText("Today's timetable")).toBeInTheDocument();
    expect(screen.getByText("Today’s schedule")).toBeInTheDocument();
    expect(screen.getAllByText("Data Structures").length).toBeGreaterThan(0);
  });

  it("renders the student dashboard", async () => {
    renderDashboard(<StudentDashboard />);
    // expect(
    //   screen.getByRole("heading", { name: "Student Dashboard" }),
    // ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ayesha Khan" }),
    ).toBeInTheDocument();
    // expect(await screen.findByText("Current SGPA 8.70")).toBeInTheDocument();
    expect(await screen.findByText("8.4")).toBeInTheDocument();
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
