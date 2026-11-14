import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import AppRoutes from "./AppRoutes";

afterEach(cleanup);

function authValue(role) {
  return {
    user: {
      id: `demo-${role}`,
      name: "Test User",
      email: `${role}@eromza.test`,
      role,
      department: null,
      status: "active",
    },
    login: vi.fn(),
    logout: vi.fn(),
    switchRole: vi.fn(),
    isAuthenticated: true,
  };
}

function renderRoute(role, path) {
  render(
    <AuthContext.Provider value={authValue(role)}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

async function expectPageHeading(name) {
  const main = await screen.findByRole("main");
  expect(await within(main).findByRole("heading", { name })).toBeInTheDocument();
}

describe("admin role routes", () => {
  it("renders website content management route", async () => {
    renderRoute("websiteAdmin", "/website-admin/content");
    await expectPageHeading("Manage Content");
  });

  it("renders admission applications route", async () => {
    renderRoute("admissionAdmin", "/admission-admin/applications");
    await expectPageHeading("Applications");
  });

  it("renders examination marks route", async () => {
    renderRoute("examAdmin", "/exam-admin/marks");
    await expectPageHeading("Marks & Results");
  });

  it("renders website departments route", async () => {
    renderRoute("websiteAdmin", "/website-admin/departments");
    await expectPageHeading("Departments & Courses");
  });

  it("renders website faculty route", async () => {
    renderRoute("websiteAdmin", "/website-admin/faculty");
    await expectPageHeading("Faculty Profiles");
  });

  it("renders website gallery route", async () => {
    renderRoute("websiteAdmin", "/website-admin/gallery");
    await expectPageHeading("Gallery & Documents");
  });

  it("renders admission document verification route", async () => {
    renderRoute("admissionAdmin", "/admission-admin/documents");
    await expectPageHeading("Verify Documents");
  });

  it("renders admission status route", async () => {
    renderRoute("admissionAdmin", "/admission-admin/status");
    await expectPageHeading("Admission Status");
  });

  it("renders examination subjects route", async () => {
    renderRoute("examAdmin", "/exam-admin/subjects");
    await expectPageHeading("Subjects & Exam Forms");
  });

  it("renders examination timetables route", async () => {
    renderRoute("examAdmin", "/exam-admin/timetables");
    await expectPageHeading("Exam Timetables");
  });

  it("renders examination hall tickets route", async () => {
    renderRoute("examAdmin", "/exam-admin/hall-tickets");
    await expectPageHeading("Hall Tickets");
  });
});

describe("super admin secondary routes", () => {
  it("renders the users route", async () => {
    renderRoute("superAdmin", "/super-admin/users");
    await expectPageHeading("Users");
  });

  it("renders the admin panels route", async () => {
    renderRoute("superAdmin", "/super-admin/admin-panels");
    await expectPageHeading("Admin Panels");
  });

  it("renders the reports route", async () => {
    renderRoute("superAdmin", "/super-admin/reports");
    await expectPageHeading("Reports & Analytics");
  });

  it("renders the audit logs route", async () => {
    renderRoute("superAdmin", "/super-admin/audit-logs");
    await expectPageHeading("Audit Logs");
  });

  it("renders the system settings route", async () => {
    renderRoute("superAdmin", "/super-admin/settings");
    await expectPageHeading("System Settings");
  });
});

describe("HOD routes", () => {
  it("renders the department info route", async () => {
    renderRoute("hod", "/hod/department");
    await expectPageHeading("Department Info");
  });

  it("renders the manage teachers route", async () => {
    renderRoute("hod", "/hod/teachers");
    await expectPageHeading("Manage Teachers");
  });

  it("renders the manage students route", async () => {
    renderRoute("hod", "/hod/students");
    await expectPageHeading("Manage Students");
  });

  it("renders the attendance route", async () => {
    renderRoute("hod", "/hod/attendance");
    await expectPageHeading("Attendance");
  });

  it("renders the department reports route", async () => {
    renderRoute("hod", "/hod/reports");
    await expectPageHeading("Department Reports");
  });
});

const roleSecondaryRoutes = [
  ["teacher", "/teacher/classes", "My Classes"],
  ["teacher", "/teacher/attendance", "Attendance"],
  ["teacher", "/teacher/marks", "Marks"],
  ["teacher", "/teacher/timetable", "Timetable"],
  ["teacher", "/teacher/updates", "Updates"],
  ["student", "/student/profile", "Profile"],
  ["student", "/student/attendance", "Attendance"],
  ["student", "/student/examinations", "Examinations"],
  ["student", "/student/timetable", "Timetable"],
  ["student", "/student/hall-tickets", "Hall Tickets"],
  ["student", "/student/results", "Results"],
  ["student", "/student/fees", "Fees"],
  ["student", "/student/notices", "Notices"],
  ["applicant", "/applicant/application", "My Application"],
  ["applicant", "/applicant/documents", "Documents"],
  ["applicant", "/applicant/status", "Application Status"],
  ["applicant", "/applicant/payments", "Payments"],
  ["applicant", "/applicant/notifications", "Notifications"],
  ["applicant", "/applicant/profile", "Profile"],
];

describe("teacher, student, and applicant secondary routes", () => {
  it.each(roleSecondaryRoutes)(
    "renders %s route %s",
    async (role, path, heading) => {
      renderRoute(role, path);
      await expectPageHeading(heading);
    },
  );
});

describe("role dashboard routes", () => {
  it("renders the HOD dashboard route", async () => {
    renderRoute("hod", "/hod/dashboard");
    await expectPageHeading("HOD Dashboard");
  });

  it("renders the teacher dashboard route", async () => {
    renderRoute("teacher", "/teacher/dashboard");
    await expectPageHeading("Teacher Dashboard");
  });

  it("renders the student dashboard route", async () => {
    renderRoute("student", "/student/dashboard");
    await expectPageHeading("Student Dashboard");
  });

  it("renders the applicant dashboard route", async () => {
    renderRoute("applicant", "/applicant/dashboard");
    await expectPageHeading("Applicant Dashboard");
  });
});
