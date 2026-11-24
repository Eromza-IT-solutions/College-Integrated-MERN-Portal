
import { useState } from "react";
import { Outlet } from "react-router-dom";

import CHeader from "../../../components/common/CHeader";
import CSidebar from "../../../components/common/CSidebar";

function WebsiteAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: "Dashboard", to: "/website-admin/dashboard" },
    { label: "Manage Content", to: "/website-admin/content" },
    { label: "Departments & Courses", to: "/website-admin/departments" },
    { label: "Faculty Profiles", to: "/website-admin/faculty" },
    { label: "Gallery & Documents", to: "/website-admin/gallery" },
    { label: "Notices & Announcements", to: "/website-admin/notices" },
  ];

  return (
    <div className="min-h-screen bg-eromza-bg">

      {/* Sidebar */}
      <CSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Header */}
      <CHeader
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

export default WebsiteAdminLayout;
