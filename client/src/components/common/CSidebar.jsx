
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  Users,
  Images,
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import collegeLogo from "../../assets/images/image.png";

export default function CSidebar({
  open = false,
  onClose = () => {},
  collapsed = false,
  onToggleCollapse = () => {},
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", to: "/website-admin/dashboard", icon: LayoutDashboard, end: true },
    { label: "Manage Content", to: "/website-admin/content", icon: FileText },
    { label: "Departments & Courses", to: "/website-admin/departments", icon: GraduationCap },
    { label: "Faculty Profiles", to: "/website-admin/faculty", icon: Users },
    { label: "Gallery & Documents", to: "/website-admin/gallery", icon: Images },
    { label: "Notices & Announcements", to: "/website-admin/notices", icon: Megaphone },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden bg-[#142448] text-white shadow-xl transition-all duration-300
        ${collapsed ? "w-[72px]" : "w-[240px]"}
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* College Branding - Super Admin Style */}
        <div className="relative shrink-0 border-b border-white/10 px-5 pb-6 pt-8 text-center">
          <span
            className={`mx-auto grid place-items-center rounded-full bg-white p-1.5 shadow-lg ring-4 ring-[#f2c200]/60 ${
              collapsed ? "h-12 w-12" : "h-20 w-20"
            }`}
          >
            <img
              src={collegeLogo}
              alt="Abeda Inamdar Senior College Logo"
              className="h-full w-full object-contain"
            />
          </span>

          {!collapsed && (
            <>
              <h1 className="mt-4 font-['Playfair_Display',serif] text-xl font-bold leading-tight">
                Abeda Inamdar
                <span className="block text-[#f2c200]">
                  Senior College
                </span>
              </h1>

              <div className="mx-auto mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex min-h-[44px] items-center rounded-xl transition-all duration-200
                  ${collapsed ? "justify-center px-2" : "gap-3 px-3"}
                  ${
                    isActive
                      ? "bg-white text-[#A30D20] font-semibold shadow-sm"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-3 top-2 bottom-2 w-1.5 rounded-r-full bg-[#FFC900]" />
                    )}

                    <Icon
                      size={19}
                      className={isActive ? "shrink-0 text-[#A30D20]" : "shrink-0"}
                    />

                    {!collapsed && (
                      <span className="truncate text-[13px]">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex min-h-[44px] w-full items-center rounded-xl text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-400
            ${collapsed ? "justify-center" : "gap-3 px-3"}`}
          >
            <LogOut size={19} />
            {!collapsed && <span>Logout</span>}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-2 hidden min-h-[38px] w-full items-center justify-center gap-2 rounded-lg text-xs text-slate-400 hover:bg-white/10 hover:text-white lg:flex"
          >
            
          </button>
        </div>
      </aside>
    </>
  );
}
