
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./features/public-website/HomePage";
import Login from "./features/auth/Login";

// Super Admin
import SuperAdminLayout from "./features/admin/super/SuperAdminLayout";
import SuperAdminDashboard from "./features/admin/super/SuperAdmin_dashboard";
import ManageUsers from "./features/admin/super/ManageUsers";
import ManageAdminPanels from "./features/admin/super/ManageAdminPanels";
import SystemSettings from "./features/admin/super/SystemSettings";
import ReportsAnalytics from "./features/admin/super/ReportsAnalytics";
import AuditLogs from "./features/admin/super/AuditLogs";
import StudentRegistration from "./features/admissions/StudentRegistration";
import TeacherLogin from "./features/auth/TeacherLogin";
import TeacherRegistration from "./features/auth/TeacherRegistration";

// College Website Admin
import WebsiteAdminLayout from "./features/admin/website/WebsiteAdminLayout";
import WebsiteAdminDashboard from "./features/admin/website/WebsiteAdminDashboard";
import ManageContent from "./features/admin/website/ManageContent";
import DepartmentsAndCourses from "./features/admin/website/DepartmentsAndCourses";
import FacultyProfiles from "./features/admin/website/FacultyProfiles";
import GalleryAndDocuments from "./features/admin/website/GalleryAndDocuments";
import NoticesAndAnnouncements from "./features/admin/website/NoticesAndAnnouncements";

// Admission Admin
import AdmissionAdminDashboard from "./features/admin/admission/AdmissionAdminDashboard";
import AdmissionAdminLayout from "./features/admin/admission/AdmissionAdminLayout";
import ManageApplications from "./features/admin/admission/ManageApplications";
import VerifyDocuments from "./features/admin/admission/VerifyDocuments";
import AdmissionStatus from "./features/admin/admission/AdmissionStatus";
import FeesPayments from "./features/admin/admission/FeesPayments";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student-register" element={<StudentRegistration />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/teacher-register" element={<TeacherRegistration />} />
        {/* Super Admin Layout */}
        <Route path="/" element={<SuperAdminLayout />}>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="admin-panels" element={<ManageAdminPanels />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="reports" element={<ReportsAnalytics />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>

        {/* College Website Admin Routes */}
        <Route path="/website-admin" element={<WebsiteAdminLayout />}>
          <Route path="dashboard" element={<WebsiteAdminDashboard />} />
          <Route path="content" element={<ManageContent />} />
          <Route path="departments" element={<DepartmentsAndCourses />} />
          <Route path="faculty" element={<FacultyProfiles />} />
          <Route path="gallery" element={<GalleryAndDocuments />} />
          <Route path="notices" element={<NoticesAndAnnouncements />} />
        </Route>

        {/* Admission Admin Routes */}
        <Route path="/admission-admin" element={<AdmissionAdminLayout />}>
  <Route path="dashboard" element={<AdmissionAdminDashboard />} />
  <Route path="applications" element={<ManageApplications />} />
  <Route path="documents" element={<VerifyDocuments />} />
  <Route path="status" element={<AdmissionStatus />} />
  <Route path="fees" element={<FeesPayments />} />
</Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
