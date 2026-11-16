import { useLocation } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";

import adminAvatar from "../../assets/images/website-admin-avatar.png";

function CHeader() 
{
  const location = useLocation();

const pageTitles = {
  "/website-admin/dashboard": "College Website Admin Dashboard",
  "/website-admin/content": "Manage Website Content",
  "/website-admin/departments": "Departments & Courses",
  "/website-admin/faculty": "Faculty Profiles",
  "/website-admin/gallery": "Gallery & Documents",
  "/website-admin/notices": "Notices & Announcements",
};

const pageTitle =
  pageTitles[location.pathname] || "College Website Admin";
  return (
    
    <header className="fixed left-[220px] right-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">

      {/* Page Title */}
      <h1 className="text-xl font-bold text-[#102D4F]">
  {pageTitle}
</h1>

      {/* Right Section */}
      <div className="flex items-center gap-5">

        {/* Notification */}
        <button className="relative text-[#102D4F] transition hover:text-[#C9253D]">
          <Bell size={20} />

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Admin Profile */}
        <button className="flex items-center gap-2">

          <img
            src={adminAvatar}
            alt="Website Admin"
            className="h-9 w-9 rounded-full border border-gray-200 object-cover"
          />

          <span className="text-sm font-semibold text-[#102D4F]">
            Website Admin
          </span>

          <ChevronDown size={16} className="text-gray-500" />

        </button>

      </div>

    </header>
  );
}

export default CHeader;
