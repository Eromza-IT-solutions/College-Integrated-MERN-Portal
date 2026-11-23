
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  X,
  LayoutDashboard,
  FileText,
  FileCheck,
  ClipboardCheck,
  Wallet,
} from "lucide-react";

function ASidebar({
  open = false,
  onClose = () => {},
  collapsed = false,
  onToggleCollapse = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      label: "Dashboard",
      to: "/admission-admin/dashboard",
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: "Manage Applications",
      to: "/admission-admin/applications",
      icon: FileText,
    },
    {
      label: "Verify Documents",
      to: "/admission-admin/documents",
      icon: FileCheck,
    },
    {
      label: "Admission Status",
      to: "/admission-admin/status",
      icon: ClipboardCheck,
    },
    {
      label: "Fees & Payments",
      to: "/admission-admin/fees",
      icon: Wallet,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden bg-eromza-sidebar text-white shadow-xl transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[240px]"
        } ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Branding */}
        <div
          className={`flex shrink-0 items-center border-b border-white/10 ${
            collapsed ? "justify-center px-3 py-5" : "gap-3 px-5 py-5"
          }`}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
            <GraduationCap size={23} />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-wide text-white">
                EROMZA ICMS
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">
                Abeda Inamdar Senior College
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Admission Management
            </p>
          )}

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
                  `group relative flex min-h-[44px] items-center rounded-xl transition-all duration-200 ${
                    collapsed
                      ? "justify-center px-2"
                      : "gap-3 px-3"
                  } ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-eromza-accent" />
                    )}

                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${
                        isActive
                          ? "text-eromza-accent"
                          : "text-slate-400 group-hover:text-white"
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate text-[13px] font-medium">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="shrink-0 border-t border-white/10 p-3">
          {!collapsed && (
            <div className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-eromza-accent/15 text-sm font-bold text-eromza-accent">
                AA
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  Admission Admin
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Administrator
                </p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex min-h-[42px] w-full items-center rounded-xl text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 ${
              collapsed ? "justify-center" : "gap-3 px-3"
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="mt-2 hidden min-h-[40px] w-full items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className="ml-2 text-xs">Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default ASidebar;
