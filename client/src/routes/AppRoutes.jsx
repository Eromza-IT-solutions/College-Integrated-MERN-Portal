import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PlaceholderPage from "../components/common/PlaceholderPage";
import Loader from "../components/ui/Loader";
import { getRoleHome, ROLES } from "../config/roles";
import { navigationByRole } from "../config/navigation";
import { NotFoundPage, UnauthorizedPage } from "../features/system/StatusPages";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

const HomePage = lazy(() => import("../features/public-website/HomePage"));
const LoginRoute = lazy(() => import("./LoginRoute"));
const SuperAdminDashboard = lazy(
  () => import("../features/admin/super/SuperAdminDashboard"),
);
const Users = lazy(() => import("../features/admin/super/Users"));
const AdminPanels = lazy(() => import("../features/admin/super/AdminPanels"));
const Reports = lazy(() => import("../features/admin/super/Reports"));
const AuditLogs = lazy(() => import("../features/admin/super/AuditLogs"));
const Settings = lazy(() => import("../features/admin/super/Settings"));
const WebsiteAdminDashboard = lazy(
  () => import("../features/admin/website/WebsiteAdminDashboard"),
);
const AdmissionAdminDashboard = lazy(
  () => import("../features/admin/admission/AdmissionAdminDashboard"),
);
const ExamAdminDashboard = lazy(
  () => import("../features/admin/examination/ExamAdminDashboard"),
);
const ManageContent = lazy(
  () => import("../features/admin/website/ManageContent"),
);
const DepartmentsAndCourses = lazy(
  () => import("../features/admin/website/DepartmentsAndCourses"),
);
const FacultyProfiles = lazy(
  () => import("../features/admin/website/FacultyProfiles"),
);
const GalleryAndDocuments = lazy(
  () => import("../features/admin/website/GalleryAndDocuments"),
);
const NoticesAndAnnouncements = lazy(
  () => import("../features/admin/website/NoticesAndAnnouncements"),
);
const Applications = lazy(
  () => import("../features/admin/admission/Applications"),
);
const VerifyDocuments = lazy(
  () => import("../features/admin/admission/VerifyDocuments"),
);
const AdmissionStatus = lazy(
  () => import("../features/admin/admission/AdmissionStatus"),
);
const FeesAndPayments = lazy(
  () => import("../features/admin/admission/FeesAndPayments"),
);
const ExamSessions = lazy(
  () => import("../features/admin/examination/ExamSessions"),
);
const SubjectsAndExamForms = lazy(
  () => import("../features/admin/examination/SubjectsAndExamForms"),
);
const ExamTimetables = lazy(
  () => import("../features/admin/examination/ExamTimetables"),
);
const MarksAndResults = lazy(
  () => import("../features/admin/examination/MarksAndResults"),
);
const HallTickets = lazy(
  () => import("../features/admin/examination/HallTickets"),
);
const HODDashboard = lazy(() => import("../features/hod/HODDashboard"));
const DepartmentInfo = lazy(
  () => import("../features/hod/DepartmentInfo"),
);
const ManageTeachers = lazy(
  () => import("../features/hod/ManageTeachers"),
);
const ManageStudents = lazy(
  () => import("../features/hod/ManageStudents"),
);
const DepartmentAttendance = lazy(
  () => import("../features/hod/Attendance"),
);
const DepartmentReports = lazy(
  () => import("../features/hod/DepartmentReports"),
);
const TeacherDashboard = lazy(
  () => import("../features/teacher/TeacherDashboard"),
);
const TeacherClasses = lazy(
  () => import("../features/teacher/MyClasses"),
);
const TeacherAttendance = lazy(
  () => import("../features/teacher/Attendance"),
);
const TeacherMarks = lazy(() => import("../features/teacher/Marks"));
const TeacherTimetable = lazy(
  () => import("../features/teacher/Timetable"),
);
const TeacherUpdates = lazy(
  () => import("../features/teacher/Updates"),
);
const StudentDashboard = lazy(
  () => import("../features/student/StudentDashboard"),
);
const StudentProfile = lazy(() => import("../features/student/Profile"));
const StudentAttendance = lazy(
  () => import("../features/student/Attendance"),
);
const StudentExaminations = lazy(
  () => import("../features/student/Examinations"),
);
const StudentTimetable = lazy(
  () => import("../features/student/Timetable"),
);
const StudentHallTickets = lazy(
  () => import("../features/student/HallTickets"),
);
const StudentResults = lazy(() => import("../features/student/Results"));
const StudentFees = lazy(() => import("../features/student/Fees"));
const StudentNotices = lazy(() => import("../features/student/Notices"));
const ApplicantDashboard = lazy(
  () => import("../features/applicant/ApplicantDashboard"),
);
const ApplicantApplication = lazy(
  () => import("../features/applicant/MyApplication"),
);
const ApplicantDocuments = lazy(
  () => import("../features/applicant/Documents"),
);
const ApplicantStatus = lazy(
  () => import("../features/applicant/ApplicationStatus"),
);
const ApplicantPayments = lazy(
  () => import("../features/applicant/Payments"),
);
const ApplicantNotifications = lazy(
  () => import("../features/applicant/Notifications"),
);
const ApplicantProfile = lazy(
  () => import("../features/applicant/Profile"),
);

const ROLE_PAGES = {
  superAdmin: {
    users: Users,
    "admin-panels": AdminPanels,
    reports: Reports,
    "audit-logs": AuditLogs,
    settings: Settings,
  },
  websiteAdmin: {
    content: ManageContent,
    departments: DepartmentsAndCourses,
    faculty: FacultyProfiles,
    gallery: GalleryAndDocuments,
    notices: NoticesAndAnnouncements,
  },
  admissionAdmin: {
    applications: Applications,
    documents: VerifyDocuments,
    status: AdmissionStatus,
    fees: FeesAndPayments,
  },
  examAdmin: {
    sessions: ExamSessions,
    subjects: SubjectsAndExamForms,
    timetables: ExamTimetables,
    marks: MarksAndResults,
    "hall-tickets": HallTickets,
  },
  hod: {
    department: DepartmentInfo,
    teachers: ManageTeachers,
    students: ManageStudents,
    attendance: DepartmentAttendance,
    reports: DepartmentReports,
  },
  teacher: {
    classes: TeacherClasses,
    attendance: TeacherAttendance,
    marks: TeacherMarks,
    timetable: TeacherTimetable,
    updates: TeacherUpdates,
  },
  student: {
    profile: StudentProfile,
    attendance: StudentAttendance,
    examinations: StudentExaminations,
    timetable: StudentTimetable,
    "hall-tickets": StudentHallTickets,
    results: StudentResults,
    fees: StudentFees,
    notices: StudentNotices,
  },
  applicant: {
    application: ApplicantApplication,
    documents: ApplicantDocuments,
    status: ApplicantStatus,
    payments: ApplicantPayments,
    notifications: ApplicantNotifications,
    profile: ApplicantProfile,
  },
};

const ROLE_ROUTES = [
  { role: "superAdmin", path: "/super-admin", dashboard: SuperAdminDashboard },
  {
    role: "websiteAdmin",
    path: "/website-admin",
    dashboard: WebsiteAdminDashboard,
  },
  {
    role: "admissionAdmin",
    path: "/admission-admin",
    dashboard: AdmissionAdminDashboard,
  },
  {
    role: "examAdmin",
    path: "/exam-admin",
    dashboard: ExamAdminDashboard,
  },
  { role: "hod", path: "/hod", dashboard: HODDashboard },
  { role: "teacher", path: "/teacher", dashboard: TeacherDashboard },
  { role: "student", path: "/student", dashboard: StudentDashboard },
  { role: "applicant", path: "/applicant", dashboard: ApplicantDashboard },
];

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(user.role)} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-eromza-bg">
          <Loader label="Loading workspace..." />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/app" element={<RoleRedirect />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {ROLE_ROUTES.map(({ role, path, dashboard: Dashboard }) => {
          const navItems = navigationByRole[role] ?? [];
          const rolePages = ROLE_PAGES[role] ?? {};
          const dashboardPath = `${path}/dashboard`;

          return (
            <Route
              key={role}
              path={path}
              element={
                <ProtectedRoute allowedRoles={[role]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  Dashboard ? (
                    <Dashboard />
                  ) : (
                    <PlaceholderPage
                      title="Dashboard"
                      roleLabel={ROLES[role].label}
                      description="This role dashboard is wired into the shared layout and ready for the next implementation stage."
                    />
                  )
                }
              />

              {navItems
                .filter((item) => item.to !== dashboardPath)
                .map((item) => {
                  const relativePath = item.to.replace(`${path}/`, "");
                  const Page = rolePages[relativePath];

                  return (
                    <Route
                      key={item.to}
                      path={relativePath}
                      element={
                        Page ? (
                          <Page />
                        ) : (
                          <PlaceholderPage
                            title={item.label}
                            roleLabel={ROLES[role].label}
                          />
                        )
                      }
                    />
                  );
                })}
            </Route>
          );
        })}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
