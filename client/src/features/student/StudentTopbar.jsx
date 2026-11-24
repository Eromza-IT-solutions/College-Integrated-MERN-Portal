import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Search, User } from "lucide-react";
import { menuItems, slug } from "./StudentSidebar";

/* Closes a dropdown on outside click or Escape */
function useDismiss(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  return ref;
}

// "Sunday, 22 November 2026"
function formatToday(d = new Date()) {
  const weekday = d.toLocaleDateString("en-IN", { weekday: "long" });
  const rest = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return `${weekday}, ${rest}`;
}


/* Quick page search: type "fee", "result"... and jump straight to that page */
function PageSearch({ onNavigate }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useDismiss(open, setOpen);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const all = menuItems.flatMap((m) =>
      m.children
        ? m.children.map((c) => ({ key: `${m.id}/${slug(c)}`, label: c, group: m.label }))
        : [{ key: m.id, label: m.label, group: null }]
    );
    return all
      .filter((r) => `${r.label} ${r.group ?? ""}`.toLowerCase().includes(term))
      .slice(0, 7);
  }, [q]);

  const go = (r) => {
    setOpen(false);
    setQ("");
    onNavigate?.(r.key);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div className="relative hidden w-72 lg:block" ref={ref}>
      <label className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-[#16285a]/25">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open && q.trim() !== ""}
          aria-controls="page-search-results"
          aria-label="Search pages"
          placeholder="Search pages..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </label>

      {open && q.trim() !== "" && (
        <ul
          id="page-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">No pages found</li>
          ) : (
            results.map((r, i) => (
              <li key={r.key} role="option" aria-selected={i === active}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full flex-col px-4 py-2.5 text-left ${i === active ? "bg-slate-50" : ""}`}
                >
                  <span className="text-sm font-medium text-[#16285a]">{r.label}</span>
                  {r.group && <span className="text-xs text-slate-500">{r.group}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function TopNavbar({
  title, // page title; "Dashboard" is shown as "Student Dashboard"
  parent, // optional parent menu name, shown before the date (e.g. "Admission")
  student,
  notifications = [],
  onMenuClick, // opens the sidebar drawer on mobile
  onProfile,
  onViewNotices,
  onLogout,
  onNavigate, // (pageKey) => void, used by the search box
}) {
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useDismiss(bellOpen, setBellOpen);
  const userRef = useDismiss(userOpen, setUserOpen);

  // "Live" pill follows the real connection status
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const heading = title === "Dashboard" ? "Student Dashboard" : title;
  const initials = student.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const count = notifications.length;

  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-3 bg-gradient-to-r from-[#f8f6f5] to-[#f3e1e1] px-4 py-4 md:px-8 md:py-[18px]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-xl bg-white p-2.5 text-[#16285a] shadow-sm hover:bg-slate-50 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Title + date */}
      <div className="min-w-0 flex-1">
        <h1
          className="truncate text-[22px] font-bold leading-tight text-[#16285a] md:text-[30px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {heading}
        </h1>
        <p className="mt-0.5 truncate text-[13px] text-slate-500">
          {parent && <span className="font-medium text-[#8b0f1f]">{parent} · </span>}
          {formatToday()}
        </p>
      </div>

      {/* Search */}
      <PageSearch onNavigate={onNavigate} />

      {/* Live status */}
      <div
        role="status"
        className={`hidden items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold sm:flex ${
          online
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-300 bg-slate-100 text-slate-600"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
        {online ? "Live" : "Offline"}
      </div>

      {/* Notifications */}
      <div className="relative" ref={bellRef}>
        <button
          onClick={() => {
            setBellOpen((o) => !o);
            setUserOpen(false);
          }}
          aria-label={`Notifications${count ? `, ${count} new` : ""}`}
          aria-expanded={bellOpen}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#16285a] shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a]"
        >
          <Bell size={20} strokeWidth={1.8} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8b0f1f] px-1 text-[11px] font-semibold text-white">
              {count}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-[#16285a]">
              Notifications
            </div>
            {count === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">You're all caught up.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{n.time}</p>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => {
                setBellOpen(false);
                onViewNotices?.();
              }}
              className="w-full border-t border-slate-100 px-4 py-3 text-sm font-medium text-[#8b0f1f] hover:bg-slate-50"
            >
              View all notices
            </button>
          </div>
        )}
      </div>

      {/* Profile pill */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => {
            setUserOpen((o) => !o);
            setBellOpen(false);
          }}
          aria-expanded={userOpen}
          className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-2 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a] md:pr-4"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8b0f1f] text-xs font-bold text-white"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="hidden text-sm font-semibold text-[#16285a] md:block">{student.name}</span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${userOpen ? "rotate-180" : ""}`}
          />
        </button>

        {userOpen && (
          <div className="absolute right-0 mt-3 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
            <div className="border-b border-slate-100 px-4 pb-3 pt-2.5">
              <p className="text-sm font-semibold text-[#16285a]">{student.name}</p>
              <p className="text-xs text-slate-500">Roll no. {student.rollNo}</p>
            </div>
            <button
              onClick={() => {
                setUserOpen(false);
                onProfile?.();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"
            >
              <User size={17} className="text-[#16285a]" />
              My Profile
            </button>
            <button
              onClick={() => {
                setUserOpen(false);
                onLogout?.();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#8b0f1f] hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}