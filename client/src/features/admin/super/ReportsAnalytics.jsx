import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Users,
  FileText,
  Activity,
  Clock,
  ArrowUp,
  Download,
  Settings,
  LogOut,
  User as UserIcon,
  X,
  CheckCircle2,
  TrendingUp,
  Radio,
} from "lucide-react";

/*
  Add to index.html:
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  Usage: render it in the area to the right of your sidebar (it fills that whole area).
  <ReportsAnalytics user={{ name: "Super Admin" }} onLogout={...} />

  Charts are drawn with plain SVG (no chart library needed). All numbers are sample data:
  replace INITIAL_STATS, GROWTH and REPORT_TYPES with your API data.
*/

/* ───────────── sample data ───────────── */
const INITIAL_STATS = { users: 1250, reports: 125, sessions: 8750, avg: 24 };

// last 12 months (the 6-month view shows the final six)
const GROWTH = [
  { m: "Jul", v: 120 }, { m: "Aug", v: 160 }, { m: "Sep", v: 210 }, { m: "Oct", v: 250 }, { m: "Nov", v: 280 }, { m: "Dec", v: 310 },
  { m: "Jan", v: 330 }, { m: "Feb", v: 480 }, { m: "Mar", v: 640 }, { m: "Apr", v: 780 }, { m: "May", v: 950 }, { m: "Jun", v: 1250 },
];

const REPORT_TYPES = [
  { key: "academic", label: "Academic", count: 56, color: "#5b47d6" },
  { key: "admin", label: "Administrative", count: 44, color: "#1f9d8a" },
  { key: "others", label: "Others", count: 25, color: "#f08a24" },
];

const STAT_CARDS = [
  { key: "users", label: "Total Users", icon: Users, bg: "bg-[#ece7f8]", blob: "bg-[#d9d0f2]", fg: "text-[#6a4cc7]", trend: 12, trendCls: "text-[#1f9d55]" },
  { key: "reports", label: "Total Reports", icon: FileText, bg: "bg-[#e3f3e8]", blob: "bg-[#c6e8d1]", fg: "text-[#1f9d55]", trend: 8, trendCls: "text-[#1f9d55]" },
  { key: "sessions", label: "Active Sessions", icon: Activity, bg: "bg-[#e6effc]", blob: "bg-[#cfe0fa]", fg: "text-[#2f6fdd]", trend: 15, trendCls: "text-[#1f9d55]" },
  { key: "avg", label: "Avg. Session", icon: Clock, bg: "bg-[#fdeadb]", blob: "bg-[#f8d5b5]", fg: "text-[#e07a1f]", trend: 10, trendCls: "text-[#e07a1f]", suffix: " min" },
];

/* ───────────── helpers ───────────── */
const initialsOf = (name) => name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const timeAgo = (ts, now) => {
  const m = Math.floor(Math.max(0, now - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  return `${Math.floor(m / 60)} hour${Math.floor(m / 60) > 1 ? "s" : ""} ago`;
};

const kfmt = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : `${n}`);

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
      const v = from + (end - from) * (1 - Math.pow(1 - t, 3));
      setVal(v);
      prev.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return val;
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
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
  const { icon: Icon, label, bg, blob, fg, trend, trendCls, suffix = "" } = config;
  const shown = Math.round(useCountUp(value));
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
        {shown.toLocaleString()}
        <span className="text-xl">{suffix}</span>
      </p>
      <p className={`relative mt-1 inline-flex items-center gap-0.5 text-xs font-bold ${trendCls}`}>
        <ArrowUp size={12} strokeWidth={3} /> {trend}%
      </p>
    </div>
  );
}

function LineChart({ data, rangeKey }) {
  const wrap = useRef(null);
  const { w, h } = useSize(wrap);
  const [hover, setHover] = useState(null);

  const pad = { l: 44, r: 20, t: 16, b: 32 };
  const innerW = Math.max(0, w - pad.l - pad.r);
  const innerH = Math.max(0, h - pad.t - pad.b);
  const max = Math.max(500, Math.ceil(Math.max(...data.map((d) => d.v)) / 500) * 500);
  const ticks = Array.from({ length: max / 500 + 1 }, (_, i) => i * 500);

  const x = (i) => pad.l + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const y = (v) => pad.t + innerH - (v / max) * innerH;
  const points = data.map((d, i) => [x(i), y(d.v)]);
  const line = points.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  const area = points.length ? `${line} L${x(data.length - 1)},${pad.t + innerH} L${x(0)},${pad.t + innerH} Z` : "";

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.l;
    const idx = Math.round((px / innerW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hi = hover !== null ? hover : null;
  const tip = hi !== null ? { x: x(hi), y: y(data[hi].v), d: data[hi], prev: hi > 0 ? data[hi - 1].v : null } : null;

  return (
    <div ref={wrap} className="relative h-full min-h-[15rem] w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`User growth from ${data[0].m} (${data[0].v}) to ${data[data.length - 1].m} (${data[data.length - 1].v})`} className="overflow-visible">
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b47d6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#5b47d6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#e8eaf0" strokeDasharray={t === 0 ? "0" : "4 4"} />
              <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{t === 0 ? "0" : kfmt(t)}</text>
            </g>
          ))}

          {/* x labels */}
          {data.map((d, i) => (
            <text key={d.m + i} x={x(i)} y={h - 8} textAnchor="middle" className={`text-[11px] transition ${hi === i ? "fill-[#5b47d6] font-bold" : "fill-slate-400"}`}>{d.m}</text>
          ))}

          <g key={rangeKey}>
            <path d={area} fill="url(#growthFill)" className="area-in" />
            <path d={line} pathLength="1" fill="none" stroke="#5b47d6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="draw" />
          </g>

          {/* hover guide */}
          {tip && <line x1={tip.x} x2={tip.x} y1={pad.t} y2={pad.t + innerH} stroke="#5b47d6" strokeOpacity="0.35" strokeDasharray="4 4" />}

          {/* markers */}
          {points.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={hi === i ? 7 : 4.5} fill="#fff" stroke="#5b47d6" strokeWidth={hi === i ? 3 : 2} className="transition-all duration-150" />
          ))}

          {/* pointer capture */}
          <rect
            x={pad.l - 10}
            y={0}
            width={innerW + 20}
            height={h}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-[#14234b] px-3 py-2 text-center text-xs text-white shadow-xl"
          style={{ left: Math.min(Math.max(tip.x, 50), w - 50), top: tip.y - 14 }}
        >
          <p className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">{tip.d.m}</p>
          <p className="text-sm font-bold tabular-nums">{tip.d.v.toLocaleString()} users</p>
          {tip.prev !== null && (
            <p className={`text-[10px] font-semibold ${tip.d.v >= tip.prev ? "text-[#6ee7a0]" : "text-[#ff9b92]"}`}>
              {tip.d.v >= tip.prev ? "▲" : "▼"} {Math.abs(Math.round(((tip.d.v - tip.prev) / tip.prev) * 100))}% vs previous
            </p>
          )}
        </div>
      )}

      {/* accessible data table */}
      <table className="sr-only">
        <caption>User growth by month</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.m}><th scope="row">{d.m}</th><td>{d.v}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Donut({ types, hidden, onToggle }) {
  const [hover, setHover] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(id);
  }, []);

  const r = 70;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const visible = types.filter((t) => !hidden.includes(t.key));
  const total = visible.reduce((s, t) => s + t.count, 0);
  const allTotal = types.reduce((s, t) => s + t.count, 0);

  let acc = 0;
  const arcs = types.map((t) => {
    const isVis = !hidden.includes(t.key);
    const share = isVis && total ? t.count / total : 0;
    const len = mounted ? Math.max(0, c * share - (visible.length > 1 ? gap : 0)) : 0;
    const offset = -acc;
    acc += c * share;
    return { ...t, len, offset, share, isVis };
  });

  const focus = arcs.find((a) => a.key === hover && a.isVis);
  const centerPct = focus ? Math.round(focus.share * 100) : null;

  return (
    <div className="flex h-full flex-col items-center justify-around gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative h-52 w-52 shrink-0 xl:h-56 xl:w-56">
        <svg viewBox="0 0 200 200" className="-rotate-90" role="img" aria-label="Report types breakdown">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#eef0f4" strokeWidth="26" />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === a.key ? 32 : 26}
              strokeDasharray={`${a.len} ${c - a.len}`}
              strokeDashoffset={a.offset}
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
              style={{ transition: "stroke-dasharray .8s cubic-bezier(.2,.7,.2,1), stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1), stroke-width .2s" }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-bold tabular-nums text-[#14234b]">{focus ? `${centerPct}%` : total}</p>
            <p className="text-xs font-medium text-slate-500">{focus ? focus.label : total === allTotal ? "Reports" : "Selected"}</p>
          </div>
        </div>
      </div>

      <ul className="w-full max-w-[15rem] space-y-1.5">
        {arcs.map((a) => (
          <li key={a.key}>
            <button
              onClick={() => onToggle(a.key)}
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
              aria-pressed={a.isVis}
              title={a.isVis ? "Click to hide" : "Click to show"}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 ${a.isVis ? "text-slate-700" : "text-slate-400 line-through"}`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.isVis ? a.color : "#cbd5e1" }} />
              <span className="flex-1">{a.label}</span>
              <span className="tabular-nums text-slate-500 no-underline">{a.isVis ? `${Math.round(a.share * 100)}%` : "—"}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── page ───────────── */
export default function ReportsAnalytics({ user = { name: "Super Admin" }, onLogout }) {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [range, setRange] = useState(6);
  const [hidden, setHidden] = useState([]);
  const [live, setLive] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [log, setLog] = useState([]);
  const [unread, setUnread] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const bellRef = useRef(null);
  const menuRef = useRef(null);
  useClickOutside(bellRef, () => setBellOpen(false));
  useClickOutside(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // simulated live numbers (replace with websocket / polling of your API)
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setStats((s) => ({
        ...s,
        sessions: Math.max(8000, s.sessions + Math.floor(Math.random() * 151) - 60),
        avg: Math.min(27, Math.max(21, s.avg + (Math.random() > 0.5 ? 1 : -1))),
      }));
    }, 4000);
    return () => clearInterval(id);
  }, [live]);

  const data = useMemo(() => GROWTH.slice(-range), [range]);
  const growthPct = Math.round(((data[data.length - 1].v - data[0].v) / data[0].v) * 100);
  const peak = data.reduce((p, d) => (d.v > p.v ? d : p), data[0]);

  const toast = (message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };
  const addLog = (text) => {
    setLog((l) => [{ id: Date.now() + Math.random(), text, ts: Date.now() }, ...l].slice(0, 8));
    setUnread((u) => u + 1);
  };

  const toggleType = (key) =>
    setHidden((h) => {
      if (h.includes(key)) return h.filter((k) => k !== key);
      if (h.length >= REPORT_TYPES.length - 1) return h; // keep at least one visible
      return [...h, key];
    });

  const toggleLive = () => {
    setLive(!live);
    addLog(live ? "Live updates paused" : "Live updates resumed");
  };

  const exportCsv = () => {
    const rows = [
      "User growth",
      "Month,Users",
      ...data.map((d) => `${d.m},${d.v}`),
      "",
      "Report types",
      "Type,Reports",
      ...REPORT_TYPES.map((t) => `${t.label},${t.count}`),
      "",
      "Summary",
      `Total users,${stats.users}`,
      `Total reports,${stats.reports}`,
      `Active sessions,${stats.sessions}`,
      `Avg. session (min),${stats.avg}`,
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "reports-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
    addLog("Analytics exported to CSV");
    toast("Analytics exported to CSV.");
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#fbf7f4] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .55s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        .pop { animation: pop .25s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes draw { to { stroke-dashoffset: 0 } }
        .draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.2s cubic-bezier(.4,.1,.2,1) forwards; }
        @keyframes areaIn { from { opacity: 0 } to { opacity: 1 } }
        .area-in { animation: areaIn 1s ease .3s both; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
        .toast-in { animation: toastIn .3s ease both; }
        @media (prefers-reduced-motion: reduce) { .rise, .pop, .area-in, .toast-in { animation: none; } .draw { animation: none; stroke-dashoffset: 0; } }
      `}</style>

      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f4c9d0]/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#cfe0fa]/40 blur-3xl" aria-hidden="true" />

      <div className="relative flex w-full flex-1 flex-col px-5 py-6 sm:px-8 lg:px-10">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-4 pl-14 lg:pl-0">
          <div>
            <h1 className="text-2xl font-bold text-[#14234b] sm:text-[28px]">Reports &amp; Analytics</h1>
            <p className="mt-0.5 text-xs text-slate-500">Track users, reports and engagement across the portal.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleLive}
              aria-pressed={live}
              className={`hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition sm:inline-flex ${live ? "bg-[#e3f3e8] text-[#1f9d55] ring-[#1f9d55]/30" : "bg-white text-slate-500 ring-slate-200"}`}
            >
              <span className="relative flex h-2 w-2">
                {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1f9d55] opacity-60 motion-reduce:animate-none" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-[#1f9d55]" : "bg-slate-400"}`} />
              </span>
              {live ? "Live" : "Paused"}
            </button>

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
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#8f0014] px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
              </button>
              {bellOpen && (
                <div className="pop absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-[#14234b]">Recent activity</p>
                  {log.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing yet. Exports and live changes will show up here.</p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                      {log.map((l) => (
                        <li key={l.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{l.text}</p>
                          <p className="text-[11px] text-slate-400">{timeAgo(l.ts, now)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

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
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#8f0014] text-xs font-bold text-white">{initialsOf(user.name)}</span>
                )}
                <span className="hidden text-sm font-semibold text-[#14234b] sm:block">{user.name}</span>
                <ChevronDown size={16} className={`text-slate-500 transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="pop absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-2xl ring-1 ring-slate-200">
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"><UserIcon size={16} className="text-slate-400" /> Profile</a>
                  <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"><Settings size={16} className="text-slate-400" /> Settings</a>
                  <button onClick={onLogout} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-sm text-[#8f0014] hover:bg-[#8f0014]/5"><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Stat cards ── */}
        <section className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key figures">
          {STAT_CARDS.map((c, i) => (
            <StatCard key={c.key} config={c} value={stats[c.key]} index={i} />
          ))}
        </section>

        {/* ── Charts (fill remaining height) ── */}
        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-5">
          {/* User growth */}
          <div className="rise flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 lg:col-span-3" style={{ animationDelay: "350ms" }}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#14234b]">User Growth</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e3f3e8] px-2.5 py-0.5 font-bold text-[#1f7a46]"><TrendingUp size={12} /> +{growthPct}%</span>
                  over {range} months · peak {peak.v.toLocaleString()} in {peak.m}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Time range">
                  {[6, 12].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      aria-pressed={range === r}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${range === r ? "bg-white text-[#5b47d6] shadow" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {r} months
                    </button>
                  ))}
                </div>
                <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                  <Download size={14} /> Export
                </button>
              </div>
            </div>
            <div className="min-h-[15rem] flex-1">
              <LineChart data={data} rangeKey={range} />
            </div>
          </div>

          {/* Report types */}
          <div className="rise flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 lg:col-span-2" style={{ animationDelay: "430ms" }}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#14234b]">
                Report Types
                {live && <Radio size={14} className="text-[#1f9d55]" aria-hidden="true" />}
              </h2>
              <span className="text-xs text-slate-400">Click legend to filter</span>
            </div>
            <div className="min-h-[15rem] flex-1">
              <Donut types={REPORT_TYPES} hidden={hidden} onToggle={toggleType} />
            </div>
          </div>
        </section>
      </div>

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 z-[60] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in flex items-center gap-3 rounded-xl bg-[#14234b] px-4 py-3 text-sm text-white shadow-2xl">
            <CheckCircle2 size={18} className="shrink-0 text-[#6ee7a0]" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-white/60 hover:text-white"><X size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}