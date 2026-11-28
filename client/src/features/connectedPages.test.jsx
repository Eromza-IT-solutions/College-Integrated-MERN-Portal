import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

// The pages that were on demo data and are now connected to the server. The services are mocked, so these
// tests check that each page asks the server and shows what it sends back.
vi.mock("../services/catalogService", () => ({
  CATEGORIES: ["major"],
  LEVELS: ["Undergraduate"],
  listDepartments: vi.fn(async () => ({ rows: [{ _id: "d1", code: "CSC", name: "Computer Science from API", isActive: true }], meta: { total: 1 } })),
  listPrograms: vi.fn(async () => ({ rows: [], meta: { total: 0 } })),
  listSubjects: vi.fn(async () => ({ rows: [], meta: { total: 0 } })),
  createDepartment: vi.fn(), updateDepartment: vi.fn(), deactivateDepartment: vi.fn(),
  createProgram: vi.fn(), updateProgram: vi.fn(), deactivateProgram: vi.fn(),
  createSubject: vi.fn(), updateSubject: vi.fn(), deactivateSubject: vi.fn(),
}));
vi.mock("../services/reportsService", () => ({
  fetchReport: vi.fn(async (type) => ({
    title: "x",
    rows: type === "department"
      ? [{ department: "Commerce from API", code: "COM", programs: 3, activeStudents: 7, teachers: 2, attendanceEntries: 5, presentPercent: 80, marksApproved: 1, marksAwaitingApproval: 0 }]
      : [],
  })),
}));
vi.mock("../services/studentApi", () => ({
  fetchAttendanceRecords: vi.fn(async () => [
    { lectureDate: "2026-11-02", period: 1, startTime: "09:00", subject: { code: "ENG", name: "English from API" }, status: "present" },
    { lectureDate: "2026-11-03", period: 2, startTime: null, subject: { code: "MAT", name: "Maths" }, status: "leave" },
  ]),
}));
import AcademicData from "./admin/super/AcademicData";
import ReportsAnalytics from "./admin/super/ReportsAnalytics";
import StudentAttendance from "./student/Attendance";

afterEach(cleanup);
const show = (page) => render(<MemoryRouter>{page}</MemoryRouter>);

describe("connected pages", () => {
  it("Academic Data lists the departments the server sends", async () => {
    show(<AcademicData />);
    expect(await screen.findByText("Computer Science from API")).toBeInTheDocument();
  });

  it("Reports shows the rows of the department report from the server", async () => {
    show(<ReportsAnalytics />);
    expect(await screen.findByText("Commerce from API")).toBeInTheDocument();
  });

  it("Student attendance asks the server for the lectures and shows them", async () => {
    show(<StudentAttendance />);
    expect((await screen.findAllByText(/English from API/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Maths/)).not.toBeInTheDocument(); // a "leave" lecture counts neither way
  });
});
