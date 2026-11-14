import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Copy,
  Download,
  FileText,
  LogIn,
  LogOut,
  Pencil,
  Radio,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------
   Audit Logs – styled to match the Reports & Analytics page
   - Works out of the box with sample data ("Demo data" pill).
   - Real data: <AuditLogs apiUrl="/api/audit-logs" />  (refreshes every 30s,
     pill switches to "Live"). Each log: { _id, user, action, module, ip, createdAt }.
     If your fields differ, edit `normalize` below.
   - Needs: Tailwind CSS + lucide-react. No chart library required.
-------------------------------------------------------------------------- */

const SAMPLE_LOGS = [
  { id: 1, user: "Super Admin", action: "Logged In", module: "System", ip: "192.168.1.10", at: "2026-11-06T15:15:00" },
  { id: 2, user: "Iqra Shaikh", action: "Updated Settings", module: "Settings", ip: "192.168.1.25", at: "2026-11-06T14:40:00" },
  { id: 3, user: "Admin", action: "Added User", module: "Users", ip: "192.168.1.18", at: "2026-11-06T13:22:00" },
  { id: 4, user: "Ayesha Khan", action: "Generated Report", module: "Reports", ip: "192.168.1.20", at: "2026-11-05T17:10:00" },
  { id: 5, user: "Super Admin", action: "Logged Out", module: "System", ip: "192.168.1.10", at: "2026-11-05T16:35:00" },
  { id: 6, user: "Admin", action: "Deleted User", module: "Users", ip: "192.168.1.18", at: "2026-11-05T11:02:00" },
  { id: 7, user: "Iqra Shaikh", action: "Logged In", module: "System", ip: "192.168.1.25", at: "2026-11-05T09:48:00" },
  { id: 8, user: "Ayesha Khan", action: "Updated Settings", module: "Settings", ip: "192.168.1.20", at: "2026-11-04T18:20:00" },
  { id: 9, user: "Super Admin", action: "Generated Report", module: "Reports", ip: "192.168.1.10", at: "2026-11-04T15:05:00" },
  { id: 10, user: "Admin", action: "Logged Out", module: "System", ip: "192.168.1.18", at: "2026-11-04T12:30:00" },
  { id: 11, user: "Iqra Shaikh", action: "Added User", module: "Users", ip: "192.168.1.25", at: "2026-11-03T10:15:00" },
  { id: 12, user: "Ayesha Khan", action: "Logged In", module: "System", ip: "192.168.1.20", at: "2026-11-03T09:02:00" },
];

const normalize = (l, i) => ({
  id: l._id ?? l.id ?? i,
  user: l.user?.name ?? l.user ?? "Unknown",
  action: l.action ?? "",
  module: l.module ?? "System",
  ip: l.ip ?? l.ipAddress ?? "",
  at: l.createdAt ?? l.timestamp ?? l.at,
});

const COLUMNS = [
  { key: "at", label: "Date & Time" },
  { key: "user", label: "User" },
  { key: "action", label: "Action" },
  { key: "module", label: "Module" },
  { key: "ip", label: "IP Address" },
];

const MODULES = ["All", "System", "Settings", "Users", "Reports"];

const MODULE_COLOR = { System: "#5B48D9", Settings: "#F0862A", Users: "#1F9D88", Reports: "#3B82F6" };
const MODULE_BADGE = {
  System: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  Settings: "bg-orange-50 text-orange-700 ring-orange-200",
  Users: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Reports: "bg-sky-50 text-sky-700 ring-sky-200",
};

const AVATAR_STYLE = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
];

const TONES = {
  lavender: { card: "bg-[#ECE8F8]", deco: "bg-[#DDD6F3]", icon: "text-[#5B48D9]" },
  mint: { card: "bg-[#E3F3EA]", deco: "bg-[#CFEBD9]", icon: "text-emerald-600" },
  blue: { card: "bg-[#E4EEFB]", deco: "bg-[#D2E3F9]", icon: "text-blue-600" },
  peach: { card: "bg-[#FCE8D7]", deco: "bg-[#F9D9BC]", icon: "text-orange-500" },
};

function actionMeta(action = "") {
  const a = action.toLowerCase();
  if (a.includes("logged in")) return { Icon: LogIn, tint: "bg-emerald-50 text-emerald-600" };
  if (a.includes("logged out")) return { Icon: LogOut, tint: "bg-slate-100 text-slate-500" };
  if (a.includes("delete")) return { Icon: Trash2, tint: "bg-rose-50 text-rose-600" };
  if (a.includes("add") || a.includes("creat")) return { Icon: UserPlus, tint: "bg-indigo-50 text-indigo-600" };
  if (a.includes("report")) return { Icon: FileText, tint: "bg-sky-50 text-sky-600" };
  return { Icon: Pencil, tint: "bg-amber-50 text-amber-600" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const h = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

const initials = (name) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const avatarStyle = (name) =>
  AVATAR_STYLE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_STYLE.length];

function pageList(cur, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const list = [...new Set([1, total, cur - 1, cur, cur + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return undefined;
    }
    let raf;
    let t0;
    const step = (t) => {
      if (t0 === undefined) t0 = t;
      const p = Math.min((t - t0) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({ tone, Icon, label, value, caption }) {
  const t = TONES[tone];
  const shown = useCountUp(value);
  return (
    <div className={`relative overflow-hidden rounded-3xl px-6 py-6 text-center shadow-[0_4px_20px_rgba(30,30,80,0.06)] ${t.card}`}>
      <span aria-hidden="true" className={`absolute -right-7 -top-7 h-28 w-28 rounded-full ${t.deco}`} />
      <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm">
        <Icon size={22} className={t.icon} />
      </span>
      <p className="relative mt-4 text-[15px] text-slate-600">{label}</p>
      <p className="relative mt-1 text-4xl font-bold tabular-nums tracking-tight text-[#14214B]">{shown.toLocaleString()}</p>
      <p className="relative mt-2 text-xs font-semibold text-slate-500">{caption}</p>
    </div>
  );
}

function Donut({ counts, total, active, hovered, onHover, onPick }) {
  const R = 76;
  const C = 2 * Math.PI * R;
  const mods = Object.keys(MODULE_COLOR).filter((m) => counts[m] > 0);
  let offset = 0;
  const centerValue = active === "All" ? total : counts[active] ?? 0;
  const centerLabel = active === "All" ? "Events" : active;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center lg:flex-col xl:flex-row">
      <div className="relative h-[210px] w-[210px] shrink-0">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label="Events by module">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#F1F1F7" strokeWidth="26" />
          {mods.map((m) => {
            const len = (counts[m] / total) * C;
            const seg = Math.max(len - 3, 0);
            const el = (
              <circle
                key={m}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={MODULE_COLOR[m]}
                strokeWidth={hovered === m || active === m ? 32 : 26}
                strokeDasharray={`${seg} ${C - seg}`}
                strokeDashoffset={-offset}
                opacity={active !== "All" && active !== m ? 0.3 : 1}
                style={{ transition: "stroke-width .2s, opacity .2s", cursor: "pointer" }}
                onMouseEnter={() => onHover(m)}
                onMouseLeave={() => onHover("")}
                onClick={() => onPick(m)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-bold tabular-nums text-[#14214B]">{centerValue}</p>
            <p className="text-sm text-slate-500">{centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="w-full max-w-[230px] space-y-1">
        {Object.keys(MODULE_COLOR).map((m) => {
          const pct = total ? Math.round(((counts[m] ?? 0) / total) * 100) : 0;
          const selected = active === m;
          return (
            <li key={m}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(m)}
                onMouseEnter={() => onHover(m)}
                onMouseLeave={() => onHover("")}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  selected ? "bg-indigo-50 font-semibold text-[#14214B]" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: MODULE_COLOR[m] }} />
                <span className="flex-1">{m}</span>
                <span className="tabular-nums text-slate-600">{pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AuditLogs({ logs, apiUrl, pollMs = 30000, currentUser = { name: "Super Admin" } }) {
  const [data, setData] = useState(() => (logs ?? SAMPLE_LOGS).map(normalize));
  const [loading, setLoading] = useState(Boolean(apiUrl));
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [hoverMod, setHoverMod] = useState("");
  const [sort, setSort] = useState({ key: "at", dir: "desc" });
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [copiedIp, setCopiedIp] = useState("");

  // Optional: load (and refresh) from your API
  const load = useCallback(
    async (signal) => {
      try {
        const r = await fetch(apiUrl, { credentials: "include", signal });
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        const json = await r.json();
        const list = Array.isArray(json) ? json : json.logs ?? [];
        setData(list.map(normalize));
        setError("");
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    if (!apiUrl) return undefined;
    const ctrl = new AbortController();
    setLoading(true);
    load(ctrl.signal);
    const id = pollMs > 0 ? setInterval(() => load(ctrl.signal), pollMs) : null;
    return () => {
      ctrl.abort();
      if (id) clearInterval(id);
    };
  }, [apiUrl, pollMs, load]);

  const counts = useMemo(() => {
    const c = {};
    data.forEach((l) => {
      c[l.module] = (c[l.module] || 0) + 1;
    });
    return c;
  }, [data]);

  const stats = useMemo(() => {
    const has = (l, s) => l.action.toLowerCase().includes(s);
    return {
      total: data.length,
      users: new Set(data.map((l) => l.user)).size,
      logins: data.filter((l) => has(l, "logged in")).length,
      changes: data.filter((l) => has(l, "updat") || has(l, "add") || has(l, "delet") || has(l, "creat")).length,
      latest: data.reduce((m, l) => Math.max(m, new Date(l.at).getTime() || 0), 0),
    };
  }, [data]);

  const topUsers = useMemo(() => {
    const c = {};
    data.forEach((l) => {
      c[l.user] = (c[l.user] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.filter((l) => {
      if (moduleFilter !== "All" && l.module !== moduleFilter) return false;
      if (!q) return true;
      return [l.user, l.action, l.module, l.ip].some((v) => String(v).toLowerCase().includes(q));
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === "at") return (new Date(a.at) - new Date(b.at)) * dir;
      return String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, { numeric: true }) * dir;
    });
  }, [data, query, moduleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const filtersActive = query !== "" || moduleFilter !== "All";

  const pickModule = (m) => {
    setModuleFilter((cur) => (cur === m ? "All" : m));
    setPage(1);
  };

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "at" ? "desc" : "asc" }));
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setModuleFilter("All");
    setPage(1);
  };

  const copyIp = async (ip) => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(""), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const exportCsv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      COLUMNS.map((c) => esc(c.label)).join(","),
      ...rows.map((l) => [formatDate(l.at), l.user, l.action, l.module, l.ip].map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const live = Boolean(apiUrl);
  const card = "rounded-3xl bg-white shadow-[0_4px_24px_rgba(30,30,80,0.06)]";

  return (
    <div
      className="min-h-full w-full px-4 py-6 sm:px-8"
      style={{
        backgroundColor: "#FAF6F3",
        backgroundImage:
          "radial-gradient(700px 320px at 100% 0%, rgba(246,205,210,.55), transparent 70%), radial-gradient(320px 520px at 0% 65%, rgba(214,226,245,.55), transparent 70%)",
      }}
    >
      <style>{`
        @keyframes auditRowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .audit-row { animation: auditRowIn .28s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .audit-row { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#14214B]">Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-600">Track every action, user and module across the portal.</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                live ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {live && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              {live ? "Live" : "Demo data"}
            </span>
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-slate-700 shadow-[0_2px_12px_rgba(30,30,80,0.08)] transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Bell size={19} />
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-[0_2px_12px_rgba(30,30,80,0.08)] transition hover:shadow-[0_4px_16px_rgba(30,30,80,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#3b1f5e] to-[#9b2c4a] text-xs font-bold text-white">
                {initials(currentUser.name)}
              </span>
              <span className="text-sm font-semibold text-[#14214B]">{currentUser.name}</span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <section aria-label="Summary" className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard tone="lavender" Icon={Activity} label="Total Events" value={stats.total} caption="Across all modules" />
          <StatCard tone="mint" Icon={Users} label="Active Users" value={stats.users} caption="Unique accounts" />
          <StatCard tone="blue" Icon={LogIn} label="Sign-ins" value={stats.logins} caption="Logins recorded" />
          <StatCard tone="peach" Icon={Pencil} label="Changes Made" value={stats.changes} caption="Updates, adds and deletes" />
        </section>

        {/* Main row */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Log table card */}
          <section className={`${card} p-5 sm:p-7`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#14214B]">Activity Log</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                    {loading ? "Loading…" : `${rows.length} of ${data.length} events`}
                  </span>
                  {stats.latest > 0 && <span>latest · {formatDate(stats.latest)}</span>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/60 p-1" role="group" aria-label="Filter by module">
                  {MODULES.map((m) => {
                    const on = moduleFilter === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setModuleFilter(m);
                          setPage(1);
                        }}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                          on ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-indigo-700"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!rows.length}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#14214B] transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            <div className="relative mt-5 w-full sm:max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search user, action or IP"
                aria-label="Search audit logs"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Couldn’t load audit logs: {error}. Check that the API is running and try again.
              </p>
            )}

            <div className="-mx-2 mt-4 overflow-x-auto px-2">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    {COLUMNS.map((c, i) => {
                      const on = sort.key === c.key;
                      const SortIcon = !on ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
                      return (
                        <th
                          key={c.key}
                          scope="col"
                          aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                          className={`bg-slate-50 py-3 text-sm font-semibold text-slate-700 ${i === 0 ? "rounded-l-xl pl-4" : ""} ${
                            i === COLUMNS.length - 1 ? "rounded-r-xl pr-4" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className="group flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            {c.label}
                            <SortIcon size={14} className={on ? "text-indigo-600" : "text-slate-300 transition group-hover:text-slate-500"} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {loading &&
                    Array.from({ length: pageSize }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        {COLUMNS.map((c) => (
                          <td key={c.key} className="border-b border-slate-100 py-4 pl-4">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {!loading &&
                    pageRows.map((l, i) => {
                      const { Icon, tint } = actionMeta(l.action);
                      return (
                        <tr
                          key={`${l.id}-${safePage}-${sort.key}-${sort.dir}-${moduleFilter}`}
                          className="audit-row group transition-colors hover:bg-indigo-50/50"
                          style={{ animationDelay: `${i * 35}ms` }}
                        >
                          <td className="whitespace-nowrap border-b border-slate-100 py-3.5 pl-4 pr-4 text-sm tabular-nums text-slate-600">
                            {formatDate(l.at)}
                          </td>
                          <td className="border-b border-slate-100 py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarStyle(l.user)}`}>
                                {initials(l.user)}
                              </span>
                              <span className="text-sm font-semibold text-[#14214B]">{l.user}</span>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tint}`}>
                                <Icon size={15} />
                              </span>
                              <span className="text-sm text-slate-700">{l.action}</span>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 py-3.5 pr-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                MODULE_BADGE[l.module] ?? MODULE_BADGE.System
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: MODULE_COLOR[l.module] ?? MODULE_COLOR.System }} />
                              {l.module}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm tabular-nums text-slate-600">{l.ip}</span>
                              <button
                                type="button"
                                onClick={() => copyIp(l.ip)}
                                aria-label={`Copy IP address ${l.ip}`}
                                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 opacity-0 transition hover:bg-white hover:text-indigo-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group-hover:opacity-100"
                              >
                                {copiedIp === l.ip ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {!loading && rows.length === 0 && (
                <div className="grid place-items-center px-4 py-14 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-500">
                    <Search size={20} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-800">No matching logs</p>
                  <p className="mt-1 text-sm text-slate-500">Try a different search or clear the filters.</p>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="tabular-nums">
                  {rows.length === 0 ? "0 results" : `Showing ${start + 1}–${Math.min(start + pageSize, rows.length)} of ${rows.length}`}
                </span>
                <label className="flex items-center gap-2">
                  <span className="sr-only">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-6 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    {[5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <nav aria-label="Pagination" className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                >
                  <ChevronLeft size={16} />
                </button>
                {pageList(safePage, totalPages).map((p) =>
                  typeof p === "string" ? (
                    <span key={p} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      aria-label={`Page ${p}`}
                      aria-current={p === safePage ? "page" : undefined}
                      onClick={() => setPage(p)}
                      className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        p === safePage
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300"
                          : "border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            </footer>
          </section>

          {/* Events by module card */}
          <section className={`${card} flex flex-col p-5 sm:p-7`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-[#14214B]">
                Events by Module
                <Radio size={14} className="text-emerald-600" aria-hidden="true" />
              </h2>
              <span className="pt-1.5 text-xs text-slate-400">Click legend to filter</span>
            </div>

            <div className="flex flex-1 items-center justify-center py-6">
              {data.length > 0 ? (
                <Donut counts={counts} total={data.length} active={moduleFilter} hovered={hoverMod} onHover={setHoverMod} onPick={pickModule} />
              ) : (
                <p className="text-sm text-slate-500">No events yet.</p>
              )}
            </div>

            {topUsers.length > 0 && (
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-[#14214B]">Most active users</h3>
                <ul className="mt-3 space-y-3">
                  {topUsers.map(([name, n]) => (
                    <li key={name} className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarStyle(name)}`}>
                        {initials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium text-slate-700">{name}</span>
                          <span className="tabular-nums text-slate-500">{n}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#5B48D9] transition-[width] duration-500" style={{ width: `${(n / topUsers[0][1]) * 100}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
