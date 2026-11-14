import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getRoleLabel } from "../../config/roles";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../utils/initials";

export default function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  navItems = [],
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-eromza-sidebar/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-eromza-sidebar text-white shadow-2xl transition-all duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[72px]" : "lg:w-[240px]"}`}
      >
        <div
          className={`flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4 ${
            collapsed ? "lg:justify-center lg:px-2" : ""
          }`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-eromza-accent text-white shadow-sm">
            <GraduationCap size={18} />
          </span>
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-sm font-semibold tracking-wide">
              EROMZA <span className="font-normal text-white/50">ICMS</span>
            </p>
            <p className="truncate text-[10px] text-slate-400">
              Abeda Inamdar Senior College
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p
            className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            Workspace
          </p>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-white/10 font-medium text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                >
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-eromza-accent transition ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon size={18} className="shrink-0" />
                  <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div
            className={`flex items-center gap-3 rounded-lg bg-white/5 p-2 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
              {getInitials(user?.name)}
            </span>
            <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-xs font-medium text-white">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {getRoleLabel(user?.role)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white ${
                collapsed ? "lg:hidden" : ""
              }`}
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-white lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
