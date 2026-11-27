
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
    <div className="website-admin-font min-h-screen bg-eromza-bg">

      {/* Font and Logout Styling */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

        /* Default Font */
        .website-admin-font {
          font-family: 'Poppins', sans-serif;
        }

        /* Heading Font */
        .website-admin-font h1,
        .website-admin-font h2,
        .website-admin-font h3 {
          font-family: 'Playfair Display', serif;
        }

        /* Logout Button - Solid Dark Red */
        .website-admin-font aside > div:last-child > button:first-child {
          transition: all 0.2s ease;
        }

        .website-admin-font aside > div:last-child > button:first-child:hover,
        .website-admin-font aside > div:last-child > button:first-child:active {
          background-color: #7f1d1d !important;
          color: #ffffff !important;
          box-shadow: none !important;
          transform: none;
        }
      `}</style>

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
