
import { Bell, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import ProfileDropdown from "../../../components/common/ProfileDropdown";
import NotificationBell from "../../../components/common/NotificationBell";

const PAGE_TITLES = {
  "/dashboard": "Super Admin Dashboard",
  "/users": "Manage Users",
  "/admin-panels": "Manage Admin Panels",
  "/settings": "System Settings",
  "/reports": "Reports & Analytics",
  "/audit-logs": "Audit Logs",
  "/academic-data": "Academic Data",
};

export default function SuperAdmin_Topbar({
  titleOverride,
}) {
  const location = useLocation();

 const pageTitle =
  titleOverride ||
  PAGE_TITLES[location.pathname.replace("/super-admin", "")] ||
  "Super Admin Dashboard";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 h-24 z-50 px-8 flex items-center justify-between bg-gradient-to-r from-[#f8f6f2] to-[#f0dddd]">

      {/* Page Heading */}
      <div>
        <h1 className="text-3xl font-bold text-[#14264b] font-serif">
          {pageTitle}
        </h1>

        <p className="text-sm text-[#64748b] mt-1">
          {today}
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">

        {/* Live Status */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-200 bg-green-50">
          <span className="w-2 h-2 rounded-full bg-green-600"></span>
          <span className="text-sm font-semibold text-green-700">
            Live
          </span>
        </div>

        {/* Notifications (original bell design; click opens the notifications panel) */}
        <NotificationBell
          renderTrigger={({ unreadCount, buttonProps }) => (
        <button {...buttonProps} className="relative w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[#14264b]">
          <Bell size={21} />

          {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-800 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
          ) : null}
        </button>
          )}
        />

        {/* Admin Profile (original pill design; click opens the profile menu with role + sign out) */}
        <ProfileDropdown
          renderTrigger={({ buttonProps }) => (
        <button {...buttonProps} className="flex items-center gap-3 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[#70243e] text-white flex items-center justify-center text-xs font-bold">
            SA
          </div>

          <span className="text-sm font-semibold text-[#14264b]">
            Super Admin
          </span>

          <ChevronDown size={17} className="text-gray-500" />
        </button>
          )}
        />

      </div>
    </header>
  );
}
