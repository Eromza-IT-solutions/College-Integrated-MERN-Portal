import { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity, Users, LogIn, LogOut, Pencil, UserPlus, FileText, Download, Trash2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown, Search, X,
  Radio,
} from "lucide-react";

/* ---------- demo data (replace with your API) ---------- */
const d = (day, h, m) => new Date(2026, 10, day, h, m).getTime();
const EVENTS = [
  { id: 1, time: d(6, 15, 15), user: "Super Admin", action: "Logged In", module: "System", ip: "192.168.1.10", kind: "signin" },
  { id: 2, time: d(6, 14, 40), user: "Iqra Shaikh", action: "Updated Settings", module: "Settings", ip: "192.168.1.25", kind: "change" },
  { id: 3, time: d(6, 13, 22), user: "Admin", action: "Added User", module: "Users", ip: "192.168.1.18", kind: "change" },
  { id: 4, time: d(5, 17, 10), user: "Ayesha Khan", action: "Generated Report", module: "Reports", ip: "192.168.1.20", kind: "other" },
  { id: 5, time: d(5, 16, 35), user: "Super Admin", action: "Logged Out", module: "System", ip: "192.168.1.10", kind: "other" },
  { id: 6, time: d(5, 11, 5), user: "Iqra Shaikh", action: "Logged In", module: "System", ip: "192.168.1.25", kind: "signin" },
  { id: 7, time: d(5, 10, 20), user: "Admin", action: "Updated User", module: "Users", ip: "192.168.1.18", kind: "change" },
  { id: 8, time: d(4, 16, 50), user: "Ayesha Khan", action: "Exported Report", module: "Reports", ip: "192.168.1.20", kind: "other" },
  { id: 9, time: d(4, 15, 30), user: "Super Admin", action: "Updated Settings", module: "Settings", ip: "192.168.1.10", kind: "change" },
  { id: 10, time: d(4, 13, 15), user: "Admin", action: "Logged In", module: "System", ip: "192.168.1.18", kind: "signin" },
  { id: 11, time: d(4, 10, 45), user: "Iqra Shaikh", action: "Deleted User", module: "Users", ip: "192.168.1.25", kind: "change" },
  { id: 12, time: d(3, 9, 30), user: "Ayesha Khan", action: "Logged Out", module: "System", ip: "192.168.1.20", kind: "other" },
];

const MODULES = ["System", "Settings", "Users", "Reports"];
const MOD_COLOR = { System: "#1b2d6b", Settings: "#d99a06", Users: "#12915a", Reports: "#a50d22" };
const MOD_TINT = { System: "#e8ecfb", Settings: "#fdf1d6", Users: "#e1f5ec", Reports: "#fbe6ea" };
const ACTION_ICON = {
  "Logged In": LogIn, "Logged Out": LogOut, "Updated Settings": Pencil, "Updated User": Pencil,
  "Added User": UserPlus, "Generated Report": FileText, "Exported Report": Download, "Deleted User": Trash2,
};
const USER_TINT = {
  "Super Admin": ["#d6f5ea", "#0f7a4b"], "Iqra Shaikh": ["#fdecc8", "#a87203"],
  Admin: ["#fdf1d6", "#a87203"], "Ayesha Khan": ["#e8e4fb", "#4b3bb5"],
};

/* ---------- helpers ---------- */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (t) => {
  const x = new Date(t), h = x.getHours();
  return `${pad(x.getDate())} ${MON[x.getMonth()]} ${x.getFullYear()}, ${pad(h % 12 || 12)}:${pad(x.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
};
const initials = (n) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ---------- components ---------- */
function StatCard({ icon: Icon, label, value, caption, tone, delay }) {
  const n = useCountUp(value);
  return (
    <div className={`stat tone-${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-val">{n}</div>
        <div className="stat-cap">{caption}</div>
      </div>
    </div>
  );
}

function Avatar({ name, size = 36 }) {
  const [bg, fg] = USER_TINT[name] || ["#e8ecfb", "#1b2d6b"];
  return <span className="av" style={{ width: size, height: size, background: bg, color: fg }}>{initials(name)}</span>;
}

function Donut({ counts, total, active, onPick }) {
  const [hov, setHov] = useState(null);
  const R = 78, SW = 28, C = 2 * Math.PI * R, GAP = 4;
  let cum = 0;
  const segs = MODULES.map((m) => {
    const frac = counts[m] / total;
    const s = { m, len: Math.max(frac * C - GAP, 0), off: -cum * C, pct: Math.round(frac * 100) };
    cum += frac;
    return s;
  });
  const focus = hov || active;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 200 200" role="img" aria-label="Events by module">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#eef0f7" strokeWidth={SW} />
          <g transform="rotate(-90 100 100)">
            {segs.map((s) => (
              <circle key={s.m} cx="100" cy="100" r={R} fill="none" stroke={MOD_COLOR[s.m]}
                strokeWidth={focus === s.m ? SW + 6 : SW} strokeDasharray={`${s.len} ${C - s.len}`}
                strokeDashoffset={s.off} opacity={focus && focus !== s.m ? 0.35 : 1} className="seg"
                onMouseEnter={() => setHov(s.m)} onMouseLeave={() => setHov(null)} onClick={() => onPick(s.m)} />
            ))}
          </g>
        </svg>
        <div className="donut-center">
          <b>{focus ? counts[focus] : total}</b>
          <span>{focus || "Events"}</span>
        </div>
      </div>
      <ul className="legend">
        {segs.map((s) => (
          <li key={s.m}>
            <button className={active && active !== s.m ? "dim" : ""} onClick={() => onPick(s.m)}
              onMouseEnter={() => setHov(s.m)} onMouseLeave={() => setHov(null)} aria-pressed={active === s.m}>
              <i style={{ background: MOD_COLOR[s.m] }} />
              <span>{s.m}</span><b>{s.pct}%</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortTh({ label, k, sort, setSort }) {
  const on = sort.key === k;
  const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSort({ key: k, dir: on && sort.dir === "desc" ? "asc" : "desc" })} className={on ? "on" : ""}>
        {label} <Icon size={13} />
      </button>
    </th>
  );
}

/* ---------- page ---------- */
export default function AuditLogs() {
  const [module, setModule] = useState("All");
  const [userF, setUserF] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "time", dir: "desc" });
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t); }, []);

  /* stats (all data) */
  const stats = useMemo(() => ({
    total: EVENTS.length,
    users: new Set(EVENTS.map((e) => e.user)).size,
    signins: EVENTS.filter((e) => e.kind === "signin").length,
    changes: EVENTS.filter((e) => e.kind === "change").length,
  }), []);
  const modCounts = useMemo(() => Object.fromEntries(MODULES.map((m) => [m, EVENTS.filter((e) => e.module === m).length])), []);
  const userCounts = useMemo(() => {
    const map = {};
    EVENTS.forEach((e) => (map[e.user] = (map[e.user] || 0) + 1));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);
  const latest = Math.max(...EVENTS.map((e) => e.time));

  /* filter + sort + paginate */
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = EVENTS.filter((e) =>
      (module === "All" || e.module === module) && (!userF || e.user === userF) &&
      (!s || [e.user, e.action, e.ip, e.module].some((v) => v.toLowerCase().includes(s))));
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
    });
  }, [module, userF, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / per));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * per, cur * per);
  const from = rows.length ? (cur - 1) * per + 1 : 0;

  const pickModule = (m) => { setModule((p) => (p === m ? "All" : m)); setPage(1); };
  const pickUser = (u) => { setUserF((p) => (p === u ? null : u)); setPage(1); };
  const tabs = ["All", ...MODULES];

  const exportCsv = () => {
    const csv = "Date & Time,User,Action,Module,IP Address\n" +
      rows.map((r) => [fmtDate(r.time), r.user, r.action, r.module, r.ip].map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pageNums = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((n) => pages <= 7 || n === 1 || n === pages || Math.abs(n - cur) <= 1);

  return (
    <div className="al">
      <style>{CSS}</style>

      <section className="stats">
        <StatCard icon={Activity} label="Total Events" value={stats.total} caption="Across all modules" tone="navy" delay={0} />
        <StatCard icon={Users} label="Active Users" value={stats.users} caption="Unique accounts" tone="emerald" delay={70} />
        <StatCard icon={LogIn} label="Sign-ins" value={stats.signins} caption="Logins recorded" tone="maroon" delay={140} />
        <StatCard icon={Pencil} label="Changes Made" value={stats.changes} caption="Updates, adds and deletes" tone="gold" delay={210} />
      </section>

      <section className="layout">
        {/* activity log */}
        <div className="box">
          <div className="box-head">
            <div>
              <h2>Activity Log</h2>
              <div className="sub">
                <span className="chip">{rows.length} of {EVENTS.length} events</span>
                <span>latest · {fmtDate(latest)}</span>
              </div>
            </div>
            <div className="head-actions">
              <div className="seg-ctl" style={{ "--i": tabs.indexOf(module), "--n": tabs.length }}>
                <span className="pill" />
                {tabs.map((t) => (
                  <button key={t} className={module === t ? "on" : ""} onClick={() => { setModule(t); setPage(1); }}>{t}</button>
                ))}
              </div>
              <button className="export" onClick={exportCsv}><Download size={15} /> Export</button>
            </div>
          </div>

          <div className="filters">
            <div className="search">
              <Search size={16} />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search user, action or IP" />
              {q && <button onClick={() => setQ("")} aria-label="Clear search"><X size={14} /></button>}
            </div>
            {userF && (
              <button className="user-chip" onClick={() => setUserF(null)}>
                <Avatar name={userF} size={22} /> {userF} <X size={13} />
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="Date & Time" k="time" sort={sort} setSort={setSort} />
                  <SortTh label="User" k="user" sort={sort} setSort={setSort} />
                  <SortTh label="Action" k="action" sort={sort} setSort={setSort} />
                  <SortTh label="Module" k="module" sort={sort} setSort={setSort} />
                  <SortTh label="IP Address" k="ip" sort={sort} setSort={setSort} />
                </tr>
              </thead>
              <tbody key={`${cur}-${module}-${userF}-${q}-${sort.key}-${sort.dir}-${per}`}>
                {slice.map((r, i) => {
                  const Icon = ACTION_ICON[r.action] || Activity;
                  return (
                    <tr key={r.id} style={{ animationDelay: `${i * 45}ms` }}>
                      <td className="muted">{fmtDate(r.time)}</td>
                      <td><span className="user-cell"><Avatar name={r.user} /><b>{r.user}</b></span></td>
                      <td><span className="act"><span className="act-ic"><Icon size={16} /></span>{r.action}</span></td>
                      <td>
                        <span className="badge" style={{ background: MOD_TINT[r.module], color: MOD_COLOR[r.module] }}>
                          <i style={{ background: MOD_COLOR[r.module] }} />{r.module}
                        </span>
                      </td>
                      <td className="muted mono">{r.ip}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="empty">
                <b>No events match</b>
                <span>Clear the search or switch the module filter back to All.</span>
              </div>
            )}
          </div>

          <div className="pager">
            <div className="showing">
              Showing {from}–{Math.min(cur * per, rows.length)} of {rows.length}
              <label className="per">
                <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
                  {[5, 10, 20].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
            <nav className="pages" aria-label="Pagination">
              <button onClick={() => setPage(cur - 1)} disabled={cur === 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
              {pageNums.map((n, i) => (
                <span key={n} className="pg">
                  {i > 0 && n - pageNums[i - 1] > 1 && <span className="gap">…</span>}
                  <button className={n === cur ? "on" : ""} onClick={() => setPage(n)} aria-current={n === cur ? "page" : undefined}>{n}</button>
                </span>
              ))}
              <button onClick={() => setPage(cur + 1)} disabled={cur === pages} aria-label="Next page"><ChevronRight size={16} /></button>
            </nav>
          </div>
        </div>

        {/* side column */}
        <div className="box side">
          <div className="box-head">
            <h2>Events by Module <Radio size={13} className="radio" /></h2>
            <span className="hint">Click legend to filter</span>
          </div>
          <Donut counts={modCounts} total={EVENTS.length} active={module === "All" ? null : module} onPick={pickModule} />

          <div className="active-users">
            <h3>Most active users</h3>
            {userCounts.map(([u, c]) => (
              <button key={u} className={`au ${userF === u ? "sel" : ""} ${userF && userF !== u ? "dim" : ""}`} onClick={() => pickUser(u)}>
                <Avatar name={u} size={32} />
                <span className="au-main">
                  <span className="au-row"><span>{u}</span><b>{c}</b></span>
                  <span className="track"><i style={{ width: mounted ? `${(c / userCounts[0][1]) * 100}%` : "0%" }} /></span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');

.al{--navy:#14214f;--navy2:#1b2d6b;--maroon:#8a0b1c;--maroon2:#a50d22;--gold:#e8b923;--muted:#5d6785;--line:#e4e7f0;--bg:#f6f4f2;font-style:normal;
  min-height:100vh;padding:32px clamp(16px,4vw,44px) 44px;font-family:'Poppins',system-ui,sans-serif;color:var(--navy);
  background:radial-gradient(900px 420px at 100% -10%,rgba(138,11,28,.10),transparent 60%),radial-gradient(800px 420px at -10% 0%,rgba(27,45,107,.10),transparent 60%),var(--bg)}
.al *{box-sizing:border-box;font-style:normal}
.al button{font-family:inherit;cursor:pointer}
.al :focus-visible{outline:3px solid rgba(232,185,35,.7);outline-offset:2px}

/* stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;margin-bottom:24px}
.stat{--c:#1b2d6b;--ct:#e8ecfb;position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;padding:20px 22px;border-radius:20px;background:#fff;border:1px solid var(--line);
  box-shadow:0 16px 30px -26px rgba(20,33,79,.7);transition:transform .25s,box-shadow .25s,border-color .25s;animation:rise .55s cubic-bezier(.2,.8,.2,1) both}
.stat::after{content:"";position:absolute;left:22px;right:22px;top:0;height:3px;border-radius:0 0 4px 4px;background:var(--c);transform:scaleX(.18);transform-origin:left;transition:transform .45s cubic-bezier(.3,.9,.3,1)}
.stat:hover{transform:translateY(-4px);border-color:var(--c);box-shadow:0 26px 36px -26px var(--c)}
.stat:hover::after{transform:scaleX(1)}
.stat-icon{flex-shrink:0;width:54px;height:54px;border-radius:16px;display:grid;place-items:center;color:var(--c);background:var(--ct);transition:transform .3s}
.stat:hover .stat-icon{transform:rotate(-8deg) scale(1.08)}
.stat-label{font-size:13.5px;color:var(--muted)}
.stat-val{font-family:'Playfair Display',serif;font-size:34px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.stat-cap{font-size:12px;color:#8a93ad;margin-top:2px}
.tone-emerald{--c:#12915a;--ct:#e1f5ec}.tone-maroon{--c:#a50d22;--ct:#fbe6ea}.tone-gold{--c:#c98a06;--ct:#fdf1d6}

/* layout */
.layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:22px;align-items:start}
.box{padding:24px 26px 20px;border-radius:24px;background:#fff;border:1px solid var(--line);box-shadow:0 20px 40px -32px rgba(20,33,79,.6);animation:rise .6s .2s cubic-bezier(.2,.8,.2,1) both}
.box-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.box h2{display:flex;align-items:center;gap:8px;margin:0;font-family:'Playfair Display',serif;font-size:22px}
.radio{color:#12915a;animation:blink 1.6s infinite}
.sub{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;color:var(--muted)}
.chip{padding:3px 10px;border-radius:999px;background:#e1f5ec;color:#0f7a4b;font-weight:600}
.hint{font-size:12px;color:var(--muted);padding-top:6px}
.head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.seg-ctl{--i:0;--n:5;position:relative;display:grid;grid-template-columns:repeat(var(--n),1fr);padding:4px;border-radius:12px;background:#eef0f8}
.pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/var(--n));border-radius:9px;background:var(--navy);transform:translateX(calc(var(--i)*100%));transition:transform .28s cubic-bezier(.3,.9,.3,1)}
.seg-ctl button{position:relative;z-index:1;border:0;background:none;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--muted);white-space:nowrap;transition:color .2s}
.seg-ctl button.on{color:#fff}
.export{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--navy);font-size:12.5px;font-weight:600;transition:all .2s}
.export:hover{border-color:var(--maroon);color:var(--maroon);transform:translateY(-1px)}

/* filters */
.filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.search{display:flex;align-items:center;gap:10px;width:min(100%,380px);height:44px;padding:0 12px 0 14px;border-radius:12px;background:#eef2fd;border:1px solid var(--line);color:var(--muted);transition:border-color .2s,box-shadow .2s,background .2s}
.search:focus-within{border-color:var(--navy2);background:#fff;box-shadow:0 0 0 4px rgba(27,45,107,.1)}
.search input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:14px;color:var(--navy)}
.search button{display:grid;place-items:center;width:24px;height:24px;border:0;border-radius:50%;background:#dfe4f4;color:var(--navy)}
.user-chip{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 6px;border-radius:999px;border:1px solid var(--maroon2);background:#fbe6ea;color:var(--maroon);font-size:12.5px;font-weight:600;animation:pop .2s}

/* table */
.table-wrap{overflow-x:auto;border-radius:14px}
table{width:100%;min-width:720px;border-collapse:collapse;font-size:14px}
thead tr{background:#f6f7fc}
th{padding:0;text-align:left;font-size:13px}
th:first-child button{padding-left:16px}
th button{display:inline-flex;align-items:center;gap:6px;width:100%;padding:14px 10px;border:0;background:none;font-size:13px;font-weight:600;color:var(--navy)}
th button svg{color:#9aa3bd;transition:color .2s}
th button:hover svg,th button.on svg{color:var(--maroon)}
thead th:first-child{border-radius:12px 0 0 12px}thead th:last-child{border-radius:0 12px 12px 0}
td{padding:14px 10px;border-bottom:1px solid #eef0f6;vertical-align:middle}
td:first-child{padding-left:16px}
tbody tr{animation:fade .35s ease-out both;transition:background .2s}
tbody tr:hover{background:#f8f9fd}
tbody tr:last-child td{border-bottom:0}
.muted{color:var(--muted)}.mono{font-variant-numeric:tabular-nums}
.user-cell{display:inline-flex;align-items:center;gap:12px}
.av{display:inline-grid;place-items:center;flex-shrink:0;border-radius:50%;font-size:11.5px;font-weight:600}
.act{display:inline-flex;align-items:center;gap:12px;white-space:nowrap}
.act-ic{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#eef2fd;color:var(--navy2);transition:transform .2s,background .2s,color .2s}
tbody tr:hover .act-ic{background:var(--navy2);color:#fff;transform:scale(1.08)}
.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:600}
.badge i{width:6px;height:6px;border-radius:50%}
.empty{display:flex;flex-direction:column;align-items:center;gap:4px;padding:44px 16px;font-size:14px;color:var(--muted)}
.empty b{color:var(--navy);font-size:16px}

/* pager */
.pager{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px;padding-top:16px;border-top:1px solid #eef0f6}
.showing{display:flex;align-items:center;gap:14px;font-size:13px;color:var(--muted);flex-wrap:wrap}
.per{position:relative}
.per select{appearance:none;-webkit-appearance:none;height:38px;padding:0 34px 0 14px;border-radius:10px;border:1px solid var(--line);background:#fff;font:inherit;font-size:13px;color:var(--navy);cursor:pointer}
.per svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none}
.pages{display:flex;align-items:center;gap:6px}
.pg{display:inline-flex;align-items:center;gap:6px}
.gap{color:var(--muted)}
.pages button{min-width:38px;height:38px;padding:0 6px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--navy);font-size:13.5px;font-weight:600;display:grid;place-items:center;transition:all .18s}
.pages button:hover:not(:disabled):not(.on){border-color:var(--maroon);color:var(--maroon)}
.pages button.on{border-color:transparent;color:#fff;background:linear-gradient(180deg,var(--maroon2),var(--maroon));box-shadow:0 8px 16px -8px rgba(138,11,28,.7)}
.pages button:disabled{opacity:.4;cursor:not-allowed}

/* donut */
.donut-wrap{display:flex;align-items:center;justify-content:center;gap:clamp(14px,2.5vw,30px);flex-wrap:wrap;padding:10px 0 20px}
.donut{position:relative;width:190px;height:190px;flex-shrink:0}
.donut svg{width:100%;height:100%;overflow:visible}
.seg{transition:stroke-width .2s,opacity .2s;cursor:pointer}
.donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.donut-center b{font-family:'Playfair Display',serif;font-size:36px;line-height:1}
.donut-center span{margin-top:4px;font-size:12.5px;color:var(--muted)}
.legend{list-style:none;margin:0;padding:0;min-width:150px}
.legend button{display:grid;grid-template-columns:12px 1fr auto;align-items:center;gap:10px;width:100%;padding:9px 12px;border:0;border-radius:10px;background:none;font-size:14px;color:var(--navy);text-align:left;transition:background .2s,opacity .2s}
.legend button:hover{background:#f3f5fb}.legend button.dim{opacity:.45}
.legend i{width:12px;height:12px;border-radius:50%}

/* active users */
.active-users{padding-top:18px;border-top:1px solid #eef0f6}
.active-users h3{margin:0 0 10px;font-size:14px;font-weight:600}
.au{display:flex;align-items:center;gap:12px;width:100%;padding:8px 10px;margin-bottom:2px;border:0;border-radius:12px;background:none;text-align:left;color:var(--navy);transition:background .2s,opacity .2s}
.au:hover{background:#f3f5fb}.au.sel{background:#fbe6ea}.au.dim{opacity:.45}
.au-main{flex:1;min-width:0}
.au-row{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px}
.au-row b{font-weight:600}
.track{display:block;height:7px;border-radius:7px;background:#e8ebf6;overflow:hidden}
.track i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,var(--navy2),var(--maroon2));transition:width 1s cubic-bezier(.3,.9,.3,1)}

@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
@keyframes blink{50%{opacity:.3}}

@media (max-width:1060px){.layout{grid-template-columns:1fr}}
@media (max-width:640px){.head-actions{width:100%}.seg-ctl{overflow-x:auto;max-width:100%}}
@media (prefers-reduced-motion:reduce){.al *{animation:none!important;transition:none!important}}
`;