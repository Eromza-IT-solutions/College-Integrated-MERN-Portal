
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  ClipboardCheck,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import collegeLogo from "../../assets/images/image.png";

export default function ASidebar({
  open = false,
  onClose = () => {},
  collapsed = false,
  onToggleCollapse = () => {},
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", to: "/admission-admin/dashboard", icon: LayoutDashboard, end: true },
    { label: "Manage Applications", to: "/admission-admin/applications", icon: FileText },
    { label: "Verify Documents", to: "/admission-admin/documents", icon: FileCheck },
    { label: "Admission Status", to: "/admission-admin/status", icon: ClipboardCheck },
    { label: "Fees & Payments", to: "/admission-admin/fees", icon: Wallet },
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
        {/* College Branding */}
        <div className="relative flex shrink-0 flex-col items-center border-b border-white/10 px-3 py-7 text-center">
          <img
            src={collegeLogo}
            alt="College Logo"
            className={`${collapsed ? "h-12 w-12" : "h-20 w-20"} object-contain`}
          />

          {!collapsed && (
            <div className="mt-3">
              <h2 className="font-serif text-lg font-bold leading-tight">
                Abeda Inamdar
              </h2>
              <h2 className="font-serif text-lg font-bold leading-tight text-[#FFC900]">
                Senior College
              </h2>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6">
          {menuItems.map((item) => {
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
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <>
                <ChevronLeft size={17} />
                Collapse Sidebar
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
