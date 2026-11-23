
import { useState } from "react";
import { Outlet } from "react-router-dom";

import AHeader from "../../../components/common/AHeader";
import ASidebar from "../../../components/common/ASidebar";

function AdmissionAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: "Dashboard", to: "/admission-admin/dashboard" },
    { label: "Manage Applications", to: "/admission-admin/applications" },
    { label: "Verify Documents", to: "/admission-admin/documents" },
    { label: "Admission Status", to: "/admission-admin/status" },
    { label: "Fees & Payments", to: "/admission-admin/fees" },
  ];

  return (
    <div className="min-h-screen bg-eromza-bg">
      <ASidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      <AHeader
        onMenuClick={() => setSidebarOpen(true)}
        navItems={navItems}
      />

      <main
        className={`min-h-screen px-4 pb-6 pt-20 transition-all duration-300 sm:px-6 lg:px-8 ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
        }`}
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdmissionAdminLayout;
