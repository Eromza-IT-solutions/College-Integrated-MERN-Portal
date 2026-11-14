import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, RefreshCw, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRoleHome, getRoleLabel, ROLES, ROLE_KEYS } from "../../config/roles";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../utils/initials";
import Badge from "../ui/Badge";

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;

    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleRoleSwitch = (role) => {
    switchRole(role);
    setOpen(false);
    navigate(getRoleHome(role));
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-2 rounded-lg border border-transparent px-1.5 transition hover:border-eromza-border hover:bg-eromza-bg"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-eromza-sidebar text-[11px] font-semibold text-white">
          {getInitials(user?.name)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-36 truncate text-xs font-semibold text-eromza-text">
            {user?.name ?? "User"}
          </span>
          <span className="block max-w-36 truncate text-[10px] text-eromza-subtle">
            {getRoleLabel(user?.role)}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`hidden text-eromza-subtle transition sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-card border border-eromza-border bg-white shadow-card">
          <div className="flex items-center gap-3 border-b border-eromza-border px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-eromza-sidebar text-xs font-semibold text-white">
              {getInitials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-eromza-text">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-[11px] text-eromza-muted">{user?.email}</p>
            </div>
          </div>

          <div className="border-b border-eromza-border px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs text-eromza-muted">
                <UserRound size={14} />
                Current role
              </span>
              <Badge variant="info">{getRoleLabel(user?.role)}</Badge>
            </div>
            {user?.department ? (
              <p className="mt-2 text-[11px] leading-4 text-eromza-subtle">
                {user.department}
              </p>
            ) : null}
          </div>

          {import.meta.env.DEV ? (
            <div className="border-b border-eromza-border px-3 py-2">
              <p className="flex items-center gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                <RefreshCw size={12} />
                Demo role switcher
              </p>
              <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto">
                {ROLE_KEYS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSwitch(role)}
                    className={`rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-eromza-bg ${
                      user?.role === role
                        ? "bg-rose-50 font-semibold text-eromza-accent"
                        : "text-eromza-muted"
                    }`}
                  >
                    {ROLES[role].shortLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-medium text-eromza-error transition hover:bg-rose-50"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
