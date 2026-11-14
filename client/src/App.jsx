import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./features/public-website/HomePage";
import Login from "./features/auth/Login";
import SuperAdminLayout from "./features/admin/super/SuperAdminLayout";
import SuperAdminDashboard from "./features/admin/super/SuperAdmin_dashboard";
import ManageUsers from "./features/admin/super/ManageUsers";
import ManageAdminPanels from "./features/admin/super/ManageAdminPanels";
import SystemSettings from "./features/admin/super/SystemSettings";
import ReportsAnalytics from "./features/admin/super/ReportsAnalytics";
import AuditLogs from "./features/admin/super/AuditLogs";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />

        {/* Super Admin Layout */}
        <Route path="/" element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="admin-panels" element={<ManageAdminPanels />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="reports" element={<ReportsAnalytics />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;