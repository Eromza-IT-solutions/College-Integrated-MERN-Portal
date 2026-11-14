import SuperAdmin_Sidebar from "./SuperAdmin_Sidebar";
import { Outlet } from "react-router-dom";

export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen">
      <SuperAdmin_Sidebar />

      <div className="lg:pl-64">
        <Outlet />
      </div>
    </div>
  );
}