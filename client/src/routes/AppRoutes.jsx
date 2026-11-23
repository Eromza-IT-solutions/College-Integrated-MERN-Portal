import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PlaceholderPage from "../components/common/PlaceholderPage";
import Loader from "../components/ui/Loader";
import { getRoleHome, ROLES } from "../config/roles";
import { navigationByRole } from "../config/navigation";
import { NotFoundPage, UnauthorizedPage } from "../features/system/StatusPages";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../layouts/AppLayout";
import SuperAdminLayout from "../features/admin/super/SuperAdminLayout";
import WebsiteAdminLayout from "../features/admin/website/WebsiteAdminLayout";
import AdmissionAdminLayout from "../features/admin/admission/AdmissionAdminLayout";
import StudentLayout from "../features/student/StudentLayout";
import ProtectedRoute from "./ProtectedRoute";
import TeacherLayout from "../features/teacher/TeacherLayout";
import { TeacherProvider } from "../features/teacher/TeacherShared";

// Roles that have their own original layout (sidebar + topbar).
// Any role not listed here falls back to the shared AppLayout.
const ROLE_LAYOUTS = {
  superAdmin: SuperAdminLayout,
  websiteAdmin: WebsiteAdminLayout,
  admissionAdmin: AdmissionAdminLayout,
  student: StudentLayout,
 teacher: TeacherRouteLayout,
};

const HomePage = lazy(() => import("../features/public-website/HomePage"));
const AboutPage = lazy(
  () => import("../features/public-website/pages/About")
);
const ExaminationPage = lazy(
  () => import("../features/public-website/pages/Examination")
);
const ProspectusPage = lazy(
  () => import("../features/public-website/pages/Prospectus")
);
const StudentInstructionsPage = lazy(
  () => import("../features/admissions/StudentRegisterFlow")
);
const ArtsDepartmentsPage = lazy(
  () => import("../features/public-website/pages/ArtsDepartments")
);

const CommerceDepartmentsPage = lazy(
  () => import("../features/public-website/pages/CommerceDepartments")
);

const ScienceDepartmentsPage = lazy(
  () => import("../features/public-website/pages/ScienceDepartments")
);

const LoginRoute = lazy(() => import("./LoginRoute"));
const ForgotPassword = lazy(() => import("../features/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../features/auth/ResetPassword"));
const StudentRegistration = lazy(
  () => import("../features/admissions/StudentRegistration"),
);
const StudentRegisterFlow = lazy(
  () => import("../features/admissions/StudentRegisterFlow"),
);
const TeacherLogin = lazy(() => import("../features/auth/TeacherLogin"));
const TeacherRegistration = lazy(
  () => import("../features/auth/TeacherRegistration"),
);
const SuperAdminDashboard = lazy(
  () => import("../features/admin/super/SuperAdmin_dashboard"),
);
const Users = lazy(() => import("../features/admin/super/ManageUsers"));
const AdminPanels = lazy(
  () => import("../features/admin/super/ManageAdminPanels"),
);
const Reports = lazy(() => import("../features/admin/super/ReportsAnalytics"));
const AuditLogs = lazy(() => import("../features/admin/super/AuditLogs"));
const Settings = lazy(() => import("../features/admin/super/SystemSettings"));
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
  () => import("../features/admin/admission/ManageApplications"),
);
const VerifyDocuments = lazy(
  () => import("../features/admin/admission/VerifyDocuments"),
);
const AdmissionStatus = lazy(
  () => import("../features/admin/admission/AdmissionStatus"),
);
const FeesAndPayments = lazy(
  () => import("../features/admin/admission/FeesPayments"),
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
  () => import("../features/teacher/AttendanceReport"),
);

const TeacherInternalMarks = lazy(
  () => import("../features/teacher/InternalMarks")
);
const TeacherTimetable = lazy(
  () => import("../features/teacher/Timetable"),
);
const TeacherUpdates = lazy(
  () => import("../features/teacher/Updates"),
);
const TeacherDefaulters = lazy(
  () => import("../features/teacher/DefaulterList")
);
const TeacherExamDuty = lazy(
  () => import("../features/teacher/ExamDuty")
);
const TeacherExamResults = lazy(
  () => import("../features/teacher/ExamResults")
);
const TeacherAssignments = lazy(
  () => import("../features/teacher/Assignments")
);
const TeacherApplyLeave = lazy(
  () => import("../features/teacher/ApplyLeave")
);
const TeacherLeaveStatus = lazy(
  () => import("../features/teacher/LeaveStatus")
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

const NAACPage = lazy(
  () => import("../features/public-website/pages/NAACPage")
);

const NIRFPage = lazy(
  () => import("../features/public-website/pages/NIRFPage")
);

const ContactPage = lazy(
  () => import("../features/public-website/pages/ContactPage")
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
  "attendance/report": TeacherAttendance,
  "attendance/defaulters": TeacherDefaulters,
  timetable: TeacherTimetable,
  "examinations/internal-marks": TeacherInternalMarks,
  "examinations/duty": TeacherExamDuty,
  "examinations/results": TeacherExamResults,
  "material/assignments": TeacherAssignments,
  "leave/apply": TeacherApplyLeave,
  "leave/status": TeacherLeaveStatus,
  notices: TeacherUpdates,
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
function TeacherRouteLayout() {
  const { user } = useAuth();

  return (
    <TeacherProvider teacher={user}>
      <TeacherLayout teacher={user} />
    </TeacherProvider>
  );
}
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
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
        <Route path="/about" element={<AboutPage />} />
        <Route path="/examination" element={<ExaminationPage />} />
        <Route path="/prospectus" element={<ProspectusPage />} />
        <Route
  path="/student-instructions"
  element={<StudentInstructionsPage />}
/>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/student-register" element={<StudentRegisterFlow />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/teacher-register" element={<TeacherRegistration />} />
        <Route path="/app" element={<RoleRedirect />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/departments/arts" element={<ArtsDepartmentsPage />} />
<Route path="/departments/commerce" element={<CommerceDepartmentsPage />} />
<Route path="/departments/science" element={<ScienceDepartmentsPage />} />
<Route path="/iqac/naac" element={<NAACPage />} />
<Route path="/iqac/nirf" element={<NIRFPage />} />
<Route path="/contact" element={<ContactPage />} />

        {ROLE_ROUTES.map(({ role, path, dashboard: Dashboard }) => {
          const navItems = navigationByRole[role] ?? [];
          const rolePages = ROLE_PAGES[role] ?? {};
          const dashboardPath = `${path}/dashboard`;
          const Layout = ROLE_LAYOUTS[role] ?? AppLayout;

          return (
            <Route
              key={role}
              path={path}
              element={
                <ProtectedRoute allowedRoles={[role]}>
                  <Layout />
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
