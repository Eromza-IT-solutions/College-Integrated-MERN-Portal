
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  ChevronDown,
  UserRound,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import NotificationBell from "./NotificationBell";
import { useAuth } from "../../hooks/useAuth";
import { getRoleLabel } from "../../config/roles";
import { getInitials } from "../../utils/initials";

export default function CHeader({
  onMenuClick,
  navItems = [],
  collapsed = false,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const currentItem = navItems.find(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
  );

  const pageTitle = currentItem?.label ?? "Dashboard";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={`sticky top-0 z-20 border-b border-[#E9DADA] bg-gradient-to-r from-[#FAF7F3] to-[#F2DEDE] transition-all duration-300 ${
        collapsed
          ? "lg:ml-[72px] lg:w-[calc(100%-72px)]"
          : "lg:ml-[240px] lg:w-[calc(100%-240px)]"
      }`}
    >
      <div className="flex min-h-[88px] items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* Mobile Menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#172A50] transition hover:bg-white/60 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        {/* Page Title and Date */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-xl font-bold text-[#142448] sm:text-2xl lg:text-[30px]">
            {pageTitle}
          </h1>

          <p className="mt-1 text-xs text-[#687D9C] sm:text-sm">
            {today}
          </p>
        </div>

        {/* Live Status */}
        <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 sm:flex">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Live
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Profile Dropdown */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Open profile menu"
            aria-expanded={open}
            className="flex h-12 items-center gap-2 rounded-full border border-[#E5D9D9] bg-white px-2.5 shadow-sm transition hover:shadow-md"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#84233D] text-xs font-bold text-white">
              {getInitials(user?.name)}
            </span>

            <span className="hidden max-w-32 truncate text-xs font-semibold text-[#142448] sm:block">
              {getRoleLabel(user?.role)}
            </span>

            <ChevronDown
              size={15}
              className={`text-[#687D9C] transition ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">

              {/* Profile Details */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#84233D] text-sm font-bold text-white">
                  {getInitials(user?.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#142448]">
                    {user?.name ?? "User"}
                  </p>

                  <p className="truncate text-xs text-gray-500">
                    {user?.email ?? ""}
                  </p>
                </div>
              </div>

              {/* Current Role */}
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    <UserRound size={15} />
                    Current role
                  </span>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
                    {getRoleLabel(user?.role)}
                  </span>
                </div>

                {user?.department && (
                  <p className="mt-2 pl-6 text-xs text-gray-500">
                    {user.department}
                  </p>
                )}
              </div>

              {/* Sign Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
