
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
    { label: "Refunds", to: "/admission-admin/refunds" },
  ];

  return (
    <div className="admission-admin-font min-h-screen bg-eromza-bg">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

        .admission-admin-font {
          font-family: 'Poppins', sans-serif;
        }

        .admission-admin-font h1,
        .admission-admin-font h2,
        .admission-admin-font h3 {
          font-family: 'Playfair Display', serif;
        }

        .admission-admin-font aside > div:last-child > button:first-child {
          transition: all 0.2s ease;
        }

        .admission-admin-font aside > div:last-child > button:first-child:hover,
        .admission-admin-font aside > div:last-child > button:first-child:active {
          background-color: #7f1d1d !important;
          color: #ffffff !important;
          box-shadow: none !important;
          transform: none;
        }
      `}</style>

      {/* Sidebar */}
      <ASidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Header */}
      <AHeader
        onMenuClick={() => setSidebarOpen(true)}
        navItems={navItems}
        collapsed={collapsed}
      />

      {/* Main Content */}
      <main
        className={`min-h-screen px-4 pb-6 pt-6 transition-all duration-300 sm:px-6 lg:px-8 ${
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
