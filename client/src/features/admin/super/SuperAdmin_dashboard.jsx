
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Users,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  UserPlus,
  Settings,
  FileText,
  UserCheck,
  LogOut,
  User as UserIcon,
  Radio,
} from "lucide-react";

/*
  Add to index.html:
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  Usage: render it in the area to the right of your sidebar (it fills that whole area).
  <SuperAdminDashboard user={{ name: "Super Admin" }} onLogout={...} />

  All numbers below are sample data – replace INITIAL_* with values from your API.
*/

/* ───────────── sample data ───────────── */
const INITIAL_STATS = { users: 1250, admins: 4, reports: 125, uptime: 99.9 };
const INITIAL_SYSTEM = { active: 95, inactive: 5 };

const ACTIVITY_META = {
  admin: { icon: UserPlus, bg: "bg-[#e3ebfb]", fg: "text-[#2f55c7]", title: "New Admin Added" },
  settings: { icon: Settings, bg: "bg-[#fdeadb]", fg: "text-[#e07a1f]", title: "Settings Updated" },
  report: { icon: FileText, bg: "bg-[#fdeadb]", fg: "text-[#e07a1f]", title: "Report Generated" },
  approved: { icon: UserCheck, bg: "bg-[#ddf3e6]", fg: "text-[#1f9d55]", title: "User Approved" },
};

const MIN = 60 * 1000;
const seedActivities = () => {
  const now = Date.now();
  return [
    { id: 1, type: "admin", ts: now - 2 * MIN },
    { id: 2, type: "settings", ts: now - 10 * MIN },
    { id: 3, type: "report", ts: now - 60 * MIN },
    { id: 4, type: "approved", ts: now - 120 * MIN },
    { id: 5, type: "settings", ts: now - 5 * 60 * MIN },
    { id: 6, type: "approved", ts: now - 8 * 60 * MIN },
    { id: 7, type: "report", ts: now - 26 * 60 * MIN },
    { id: 8, type: "admin", ts: now - 30 * 60 * MIN },
  ];
};

const STAT_CARDS = [
  { key: "users", label: "Total Users", icon: Users, bg: "bg-[#e6effc]", blob: "bg-[#cfe0fa]", fg: "text-[#2f6fdd]" },
  { key: "admins", label: "Admin Panels", icon: ShieldCheck, bg: "bg-[#e3f3e8]", blob: "bg-[#c6e8d1]", fg: "text-[#1f9d55]" },
  { key: "reports", label: "Reports", icon: BarChart3, bg: "bg-[#fde8e4]", blob: "bg-[#fad0c9]", fg: "text-[#e0473b]" },
  { key: "uptime", label: "System Uptime", icon: CheckCircle2, bg: "bg-[#ece7f8]", blob: "bg-[#d9d0f2]", fg: "text-[#6a4cc7]", decimals: 1, suffix: "%" },
];

/* ───────────── helpers ───────────── */
function useCountUp(end, duration = 1200) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current;
    if (reduce || from === end) {
      setVal(end);
      prev.current = end;
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (end - from) * eased;
      setVal(v);
      prev.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return val;
}

function timeAgo(ts, now) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && handler();
    const onKey = (e) => e.key === "Escape" && handler();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, handler]);
}

/* ───────────── pieces ───────────── */
function StatCard({ config, value, index }) {
  const { icon: Icon, label, bg, blob, fg, decimals = 0, suffix = "" } = config;
  const shown = useCountUp(value);
  const text = shown.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <div
      className={`rise group relative overflow-hidden rounded-2xl ${bg} p-5 text-center shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${blob} opacity-60 transition duration-500 group-hover:scale-125`} aria-hidden="true" />
      <span className={`relative mx-auto grid h-12 w-12 place-items-center rounded-full bg-white shadow ${fg} transition duration-300 group-hover:scale-110`}>
        <Icon size={24} />
      </span>
      <p className="relative mt-3 text-sm font-medium text-slate-600">{label}</p>
      <p className="relative mt-1 text-3xl font-bold tabular-nums text-[#14234b]">
        {text}
        {suffix}
      </p>
    </div>
  );
}

function Donut({ active, inactive }) {
  const [hover, setHover] = useState(null);
  const a = useCountUp(active, 1100);
  const i = useCountUp(inactive, 1100);
  const r = 64;
  const c = 2 * Math.PI * r;
  const aLen = (c * a) / 100;
  const iLen = (c * i) / 100;

  const arcs = [
    { key: "active", len: aLen, offset: 0, color: "#1f9d8a", label: "Active", value: active },
    { key: "inactive", len: iLen, offset: -aLen, color: "#e0473b", label: "Inactive", value: inactive },
  ];
  const focus = arcs.find((x) => x.key === hover);

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <div className="relative h-52 w-52 xl:h-60 xl:w-60">
        <svg viewBox="0 0 160 160" className="-rotate-90" role="img" aria-label={`System ${active}% active`}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#eef0f4" strokeWidth="18" />
          {arcs.map((x) => (
            <circle
              key={x.key}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={x.color}
              strokeWidth={hover === x.key ? 23 : 18}
              strokeDasharray={`${x.len} ${c - x.len}`}
              strokeDashoffset={x.offset}
              onMouseEnter={() => setHover(x.key)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-[stroke-width] duration-200"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-bold tabular-nums text-[#14234b]">
              {focus ? focus.value : Math.round(a)}%
            </p>
            <p className="text-xs font-medium text-slate-500">{focus ? focus.label : "Active"}</p>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {arcs.map((x) => (
          <li
            key={x.key}
            onMouseEnter={() => setHover(x.key)}
            onMouseLeave={() => setHover(null)}
            className={`flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition ${
              hover === x.key ? "bg-slate-100" : ""
            }`}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: x.color }} />
            {x.label}
            <span className="ml-2 tabular-nums text-slate-400">{x.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── page ───────────── */
export default function SuperAdminDashboard({ user = { name: "Super Admin" }, onLogout, onViewAll }) {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [system, setSystem] = useState(INITIAL_SYSTEM);
  const [activities, setActivities] = useState(seedActivities);
  const [now, setNow] = useState(Date.now());
  const [live, setLive] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const nextId = useRef(100);

  const bellRef = useRef(null);
  const menuRef = useRef(null);
  useClickOutside(bellRef, () => setBellOpen(false));
  useClickOutside(menuRef, () => setMenuOpen(false));

  // keep "x mins ago" fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // simulated live updates (replace with websocket / polling of your API)
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const types = Object.keys(ACTIVITY_META);
      const type = types[Math.floor(Math.random() * types.length)];
      setActivities((prev) => [{ id: nextId.current++, type, ts: Date.now(), fresh: true }, ...prev].slice(0, 12));
      setUnread((u) => u + 1);
      if (type === "approved") setStats((s) => ({ ...s, users: s.users + 1 }));
      if (type === "report") setStats((s) => ({ ...s, reports: s.reports + 1 }));
      const active = 93 + Math.floor(Math.random() * 6); // 93–98
      setSystem({ active, inactive: 100 - active });
    }, 12000);
    return () => clearInterval(id);
  }, [live]);

  const visible = activities.slice(0, expanded ? 8 : 4);
  const healthy = system.active >= 95;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

 return (
  <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#fbf7f4] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .55s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-14px); background: #fff4d6 } to { opacity: 1; transform: none } }
        .slide-in { animation: slideIn .6s ease both; }
        @media (prefers-reduced-motion: reduce) { .rise, .slide-in { animation: none; } }
      `}</style>

      {/* soft decorative blobs */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f4c9d0]/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#cfe0fa]/40 blur-3xl" aria-hidden="true" />

      <div className="relative flex w-full flex-1 flex-col px-5 py-6 sm:px-8 lg:px-10">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-4 pl-14 lg:pl-0">
          <div>
            <h1 className="text-2xl font-bold text-[#14234b] sm:text-[28px]">Super Admin Dashboard</h1>
            <p className="mt-0.5 text-xs text-slate-500">{today}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live toggle */}
            <button
              onClick={() => setLive(!live)}
              aria-pressed={live}
              className={`hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition sm:inline-flex ${
                live ? "bg-[#e3f3e8] text-[#1f9d55] ring-[#1f9d55]/30" : "bg-white text-slate-500 ring-slate-200"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1f9d55] opacity-60 motion-reduce:animate-none" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-[#1f9d55]" : "bg-slate-400"}`} />
              </span>
              {live ? "Live" : "Paused"}
            </button>

            {/* Notifications */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => {
                  setBellOpen(!bellOpen);
                  setUnread(0);
                  setMenuOpen(false);
                }}
                aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}
                aria-expanded={bellOpen}
                className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-[#14234b] shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#8f0014] px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-[#14234b]">Notifications</p>
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                    {activities.slice(0, 5).map((a) => {
                      const m = ACTIVITY_META[a.type];
                      return (
                        <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.bg} ${m.fg}`}>
                            <m.icon size={15} />
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-medium text-slate-800">{m.title}</p>
                            <p className="text-[11px] text-slate-400">{timeAgo(a.ts, now)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setBellOpen(false);
                }}
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#8f0014] text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
                <span className="hidden text-sm font-semibold text-[#14234b] sm:block">{user.name}</span>
                <ChevronDown size={16} className={`text-slate-500 transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-2xl ring-1 ring-slate-200">
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                    <UserIcon size={16} className="text-slate-400" /> Profile
                  </a>
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                    <Settings size={16} className="text-slate-400" /> Settings
                  </a>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-sm text-[#8f0014] hover:bg-[#8f0014]/5"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Stat cards ── */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key figures">
          {STAT_CARDS.map((c, i) => (
            <StatCard key={c.key} config={c} value={stats[c.key]} index={i} />
          ))}
        </section>

        {/* ── Overview + activities ── */}
        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-5">
          <div className="rise flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 lg:col-span-2" style={{ animationDelay: "350ms" }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#14234b]">System Overview</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  healthy ? "bg-[#e3f3e8] text-[#1f9d55]" : "bg-[#fdeadb] text-[#e07a1f]"
                }`}
              >
                {healthy ? "Healthy" : "Needs attention"}
              </span>
            </div>
            <div className="flex flex-1 items-center">
              <Donut active={system.active} inactive={system.inactive} />
            </div>
          </div>

          <div className="rise flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 lg:col-span-3" style={{ animationDelay: "430ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#14234b]">
                Recent Activities
                {live && <Radio size={14} className="text-[#1f9d55]" aria-hidden="true" />}
              </h2>
              <button
                onClick={() => {
                  setExpanded(!expanded);
                  onViewAll && onViewAll();
                }}
                className="text-sm font-semibold text-[#8f0014] transition hover:underline"
              >
                {expanded ? "Show Less" : "View All ›"}
              </button>
            </div>

            <ul className="flex flex-1 flex-col divide-y divide-slate-100" aria-live="polite">
              {visible.map((a) => {
                const m = ACTIVITY_META[a.type];
                return (
                  <li
                    key={a.id}
                    className={`flex flex-1 items-center gap-4 rounded-lg px-2 py-3.5 transition hover:bg-slate-50 ${a.fresh ? "slide-in" : ""}`}
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${m.bg} ${m.fg}`}>
                      <m.icon size={20} />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#14234b]">{m.title}</span>
                    <time className="text-xs text-slate-400">{timeAgo(a.ts, now)}</time>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
             </div>
     </div>
  );
}