import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Settings,
  ShieldCheck,
  HardDrive,
  LogOut,
  User as UserIcon,
  X,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  Download,
  History,
  AlertCircle,
  Undo2,
} from "lucide-react";

/*
  Add to index.html:
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  Usage: render it in the area to the right of your sidebar (it fills that whole area).
  <SystemSettings user={{ name: "Super Admin" }} onLogout={...} onSave={async (section, values) => { ...call your API... }} />

  - Each tab saves on its own with "Save Changes". Pass onSave to persist (throw an Error to show a failure message).
  - DEFAULTS and the sample backup history are placeholders: load real values in the effect marked "load settings".
*/

/* ───────────── options + defaults ───────────── */
const YEARS = ["2024 - 2025", "2025 - 2026", "2026 - 2027", "2027 - 2028", "2028 - 2029"];
const ROLES = ["Student", "Faculty", "Admin", "Super Admin"];

const DEFAULTS = {
  general: { collegeName: "Abeda Inamdar Senior College", academicYear: "2026 - 2027", defaultRole: "Student" },
  security: { minLength: "8", special: true, twoFactor: false, timeout: "30", attempts: "5" },
  notifications: { email: true, newUsers: true, admissions: true, reports: false, system: true, digest: "Instant" },
  backup: { auto: true, frequency: "Daily", retention: "30" },
};

const TABS = [
  { id: "general", label: "General", icon: Settings, tone: { panel: "from-[#ece7f8] to-[#f7f4fd]", icon: "text-[#5b47d6]", ring: "ring-[#5b47d6]/15" } },
  { id: "security", label: "Security", icon: ShieldCheck, tone: { panel: "from-[#e3f4ea] to-[#f4fbf7]", icon: "text-[#1f9d55]", ring: "ring-[#1f9d55]/15" } },
  { id: "notifications", label: "Notifications", icon: Bell, tone: { panel: "from-[#fdf0dc] to-[#fffaf0]", icon: "text-[#d97706]", ring: "ring-[#d97706]/15" } },
  { id: "backup", label: "Backup", icon: HardDrive, tone: { panel: "from-[#e8f0fd] to-[#f6f9ff]", icon: "text-[#2f6fdd]", ring: "ring-[#2f6fdd]/15" } },
];

const DAY = 24 * 3600 * 1000;
const seedBackups = () => {
  const now = Date.now();
  return [
    { id: "b1", ts: now - 1 * DAY, size: "14.2 MB", kind: "Automatic" },
    { id: "b2", ts: now - 2 * DAY, size: "14.1 MB", kind: "Automatic" },
    { id: "b3", ts: now - 9 * DAY, size: "13.6 MB", kind: "Manual" },
  ];
};

/* ───────────── helpers ───────────── */
const initialsOf = (name) => name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fmt = (ts) => new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const timeAgo = (ts, now) => {
  const m = Math.floor(Math.max(0, now - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

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

/* ───────────── small UI pieces ───────────── */
const inputCls =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const okCls = "border-slate-300 focus:border-[#5b47d6] focus:ring-[#5b47d6]/10";
const badCls = "border-[#e0473b] focus:ring-[#e0473b]/10";

function Row({ label, htmlFor, hint, error, children }) {
  return (
    <div className="grid items-start gap-1.5 sm:grid-cols-[190px_1fr] sm:gap-6">
      <label htmlFor={htmlFor} className="pt-2.5 text-sm font-semibold text-[#14234b]">
        {label}
        {hint && <span className="mt-0.5 block text-xs font-normal text-slate-400">{hint}</span>}
      </label>
      <div>
        {children}
        {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-[#e0473b]"><AlertCircle size={12} /> {error}</p>}
      </div>
    </div>
  );
}

function Select({ id, value, onChange, options, disabled }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${inputCls} ${okCls} appearance-none pr-10`}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${checked ? "bg-[#5b47d6]" : "bg-slate-300"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SwitchRow({ title, text, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 transition ${disabled ? "opacity-50" : "hover:bg-slate-50"}`}>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-[#14234b]">{title}</p>
        {text && <p className="mt-0.5 text-xs text-slate-500">{text}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade absolute inset-0 bg-[#14234b]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-[#14234b]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* left illustration panel – reacts live to the form */
function SidePanel({ tab, draft, saving, now, lastBackup }) {
  const T = TABS.find((t) => t.id === tab);
  const Icon = T.icon;

  const score = useMemo(() => {
    const s = draft.security;
    const len = Number(s.minLength);
    return (
      (len >= 12 ? 30 : len >= 10 ? 20 : 10) +
      (s.special ? 20 : 0) +
      (s.twoFactor ? 30 : 0) +
      (Number(s.attempts) <= 5 ? 10 : 0) +
      (Number(s.timeout) <= 30 ? 10 : 0)
    );
  }, [draft.security]);
  const level = score >= 80 ? { label: "Strong", bar: "bg-[#1f9d55]", text: "text-[#1f7a46]" } : score >= 50 ? { label: "Good", bar: "bg-[#d97706]", text: "text-[#b45309]" } : { label: "Weak", bar: "bg-[#e0473b]", text: "text-[#c2362b]" };

  const n = draft.notifications;
  const alertsOn = n.email ? [n.newUsers, n.admissions, n.reports, n.system].filter(Boolean).length : 0;

  return (
    <aside className={`relative flex min-h-[15rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${T.tone.panel} p-6 text-center ring-1 ${T.tone.ring}`}>
      <span className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/50" aria-hidden="true" />
      <span className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-white/40" aria-hidden="true" />

      <span className={`relative grid h-24 w-24 place-items-center rounded-3xl bg-white shadow-lg ${T.tone.icon}`}>
        <Icon size={46} className={saving ? "animate-spin motion-reduce:animate-none" : "transition duration-500 hover:rotate-90"} />
      </span>

      <div className="relative mt-5 w-full">
        {tab === "general" && (
          <>
            <p className="font-['Playfair_Display',serif] text-lg font-bold leading-tight text-[#14234b]">{draft.general.collegeName || "College name"}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white px-3 py-1 text-[#5b47d6] shadow-sm">{draft.general.academicYear}</span>
              <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">New users: {draft.general.defaultRole}</span>
            </div>
          </>
        )}
        {tab === "security" && (
          <>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Security strength</p>
            <p className={`mt-1 text-2xl font-bold ${level.text}`}>{level.label}</p>
            <div className="mx-auto mt-3 h-2.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/80" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Security strength">
              <div className={`h-full rounded-full transition-all duration-700 ${level.bar}`} style={{ width: `${score}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{score} / 100</p>
          </>
        )}
        {tab === "notifications" && (
          <>
            <p className="text-2xl font-bold text-[#14234b]">{alertsOn} <span className="text-base font-semibold text-slate-500">of 4 alerts on</span></p>
            <p className="mt-1 text-xs text-slate-500">{n.email ? `Delivery: ${n.digest.toLowerCase()}` : "Email notifications are off"}</p>
          </>
        )}
        {tab === "backup" && (
          <>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Last backup</p>
            <p className="mt-1 text-lg font-bold text-[#14234b]">{lastBackup ? timeAgo(lastBackup, now) : "Never"}</p>
            <span className={`mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm ${draft.backup.auto ? "text-[#1f7a46]" : "text-slate-500"}`}>
              <span className={`h-2 w-2 rounded-full ${draft.backup.auto ? "bg-[#1f9d55]" : "bg-slate-400"}`} />
              {draft.backup.auto ? `Auto: ${draft.backup.frequency.toLowerCase()}` : "Auto backup off"}
            </span>
          </>
        )}
      </div>
    </aside>
  );
}

/* ───────────── page ───────────── */
export default function SystemSettings({ user = { name: "Super Admin" }, onLogout, onSave }) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(DEFAULTS);
  const [draft, setDraft] = useState(DEFAULTS);
  const [tab, setTab] = useState("general");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [backups, setBackups] = useState([]);
  const [backup, setBackup] = useState({ running: false, progress: 0 });
  const [restore, setRestore] = useState(null);

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

  // load settings (replace this timeout with your API call)
  useEffect(() => {
    const id = setTimeout(() => {
      setSaved(DEFAULTS);
      setDraft(DEFAULTS);
      setBackups(seedBackups());
      setLoading(false);
    }, 600);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const dirty = useMemo(
    () => Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, !same(saved[k], draft[k])])),
    [saved, draft]
  );
  const anyDirty = Object.values(dirty).some(Boolean);

  // warn before leaving the page with unsaved edits
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  // simulated "Back up now" progress
  useEffect(() => {
    if (!backup.running) return;
    const id = setInterval(() => {
      setBackup((b) => {
        const next = Math.min(100, b.progress + 4 + Math.random() * 9);
        return { ...b, progress: next };
      });
    }, 140);
    return () => clearInterval(id);
  }, [backup.running]);

  useEffect(() => {
    if (backup.running && backup.progress >= 100) {
      const item = { id: `b${Date.now()}`, ts: Date.now(), size: `${(14 + Math.random()).toFixed(1)} MB`, kind: "Manual" };
      setBackups((l) => [item, ...l]);
      setBackup({ running: false, progress: 0 });
      addLog("Manual backup completed");
      toast("Backup completed successfully.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backup]);

  /* feedback */
  const toast = (message, undo) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  function addLog(text) {
    setLog((l) => [{ id: Date.now() + Math.random(), text, ts: Date.now() }, ...l].slice(0, 8));
    setUnread((u) => u + 1);
  }

  /* editing */
  const set = (section, key, value) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (section) => {
    const e = {};
    if (section === "general") {
      if (draft.general.collegeName.trim().length < 3) e.collegeName = "Enter the college name (at least 3 characters).";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate(tab)) return;
    const values = { ...draft[tab], ...(tab === "general" ? { collegeName: draft.general.collegeName.trim() } : {}) };
    try {
      setSaving(true);
      if (onSave) await onSave(tab, values);
      else await new Promise((r) => setTimeout(r, 800)); // demo only
      setSaved((s) => ({ ...s, [tab]: values }));
      setDraft((d) => ({ ...d, [tab]: values }));
      const label = TABS.find((t) => t.id === tab).label;
      addLog(`${label} settings saved`);
      toast(`${label} settings saved.`);
    } catch (err) {
      toast(err?.message || "Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft((d) => ({ ...d, [tab]: saved[tab] }));
    setErrors({});
  };

  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
    if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
  };

  const startBackup = () => {
    if (backup.running) return;
    setBackup({ running: true, progress: 0 });
  };

  const confirmRestore = () => {
    addLog(`Restore started from ${fmt(restore.ts)}`);
    toast(`Restoring data from ${fmt(restore.ts)}…`);
    setRestore(null);
  };

  const g = draft.general;
  const s = draft.security;
  const n = draft.notifications;
  const b = draft.backup;
  const currentTab = TABS.find((t) => t.id === tab);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#fbf7f4] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        .pop { animation: pop .25s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        .fade { animation: fade .2s ease both; }
        @keyframes panelIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .panel-in { animation: panelIn .35s ease both; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
        .toast-in { animation: toastIn .3s ease both; }
        @media (prefers-reduced-motion: reduce) { .pop, .fade, .panel-in, .toast-in, .animate-pulse { animation: none; } }
      `}</style>

      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f4c9d0]/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#cfe0fa]/40 blur-3xl" aria-hidden="true" />

      <div className="relative flex w-full flex-1 flex-col px-5 py-6 sm:px-8 lg:px-10">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-4 pl-14 lg:pl-0">
          <div>
            <h1 className="text-2xl font-bold text-[#14234b] sm:text-[28px]">System Settings</h1>
            <p className="mt-0.5 text-xs text-slate-500">Configure how the college portal looks, behaves and protects data.</p>
          </div>

          <div className="flex items-center gap-3">
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
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#8f0014] px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
                )}
              </button>
              {bellOpen && (
                <div className="pop absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-[#14234b]">Recent changes</p>
                  {log.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing yet. Saved settings will show up here.</p>
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

        {/* ── Settings card ── */}
        <section className="mt-7 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          {/* tabs */}
          <div role="tablist" aria-label="Settings sections" onKeyDown={onTabKey} className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-2 sm:px-6">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-sm font-semibold transition ${active ? "text-[#5b47d6]" : "text-slate-500 hover:text-[#14234b]"}`}
                >
                  <t.icon size={16} />
                  {t.label}
                  {dirty[t.id] && <span className="h-2 w-2 rounded-full bg-[#f2a900]" title="Unsaved changes" aria-label="Unsaved changes" />}
                  <span className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-[#5b47d6] transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0"}`} />
                </button>
              );
            })}
          </div>

          {/* body */}
          <div
            key={tab}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="panel-in grid flex-1 content-start gap-8 p-5 sm:p-8 lg:grid-cols-[300px_1fr]"
          >
            {loading ? (
              <>
                <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />
                <div className="space-y-5">
                  {[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
              </>
            ) : (
              <>
                <SidePanel tab={tab} draft={draft} saving={saving} now={now} lastBackup={backups[0]?.ts} />

                <div className="space-y-5">
                  {/* GENERAL */}
                  {tab === "general" && (
                    <>
                      <Row label="College Name" htmlFor="collegeName" error={errors.collegeName}>
                        <input id="collegeName" value={g.collegeName} onChange={(e) => set("general", "collegeName", e.target.value)} className={`${inputCls} ${errors.collegeName ? badCls : okCls}`} />
                      </Row>
                      <Row label="Academic Year" htmlFor="academicYear">
                        <Select id="academicYear" value={g.academicYear} onChange={(v) => set("general", "academicYear", v)} options={YEARS} />
                      </Row>
                      <Row label="Default Role" htmlFor="defaultRole" hint="Given to newly created accounts">
                        <Select id="defaultRole" value={g.defaultRole} onChange={(v) => set("general", "defaultRole", v)} options={ROLES} />
                      </Row>
                    </>
                  )}

                  {/* SECURITY */}
                  {tab === "security" && (
                    <>
                      <Row label="Minimum Password Length" htmlFor="minLength">
                        <Select id="minLength" value={s.minLength} onChange={(v) => set("security", "minLength", v)} options={[{ value: "8", label: "8 characters" }, { value: "10", label: "10 characters" }, { value: "12", label: "12 characters" }]} />
                      </Row>
                      <Row label="Session Timeout" htmlFor="timeout" hint="Auto logout when inactive">
                        <Select id="timeout" value={s.timeout} onChange={(v) => set("security", "timeout", v)} options={[{ value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }, { value: "60", label: "1 hour" }, { value: "120", label: "2 hours" }]} />
                      </Row>
                      <Row label="Max Login Attempts" htmlFor="attempts" hint="Before the account is locked">
                        <Select id="attempts" value={s.attempts} onChange={(v) => set("security", "attempts", v)} options={[{ value: "3", label: "3 attempts" }, { value: "5", label: "5 attempts" }, { value: "10", label: "10 attempts" }]} />
                      </Row>
                      <div className="space-y-3 pt-1">
                        <SwitchRow title="Require special characters" text="Passwords must include symbols like ! @ #" checked={s.special} onChange={() => set("security", "special", !s.special)} />
                        <SwitchRow title="Two-factor authentication for admins" text="Ask admins for a verification code at login" checked={s.twoFactor} onChange={() => set("security", "twoFactor", !s.twoFactor)} />
                      </div>
                    </>
                  )}

                  {/* NOTIFICATIONS */}
                  {tab === "notifications" && (
                    <>
                      <SwitchRow title="Email notifications" text="Master switch for all portal emails" checked={n.email} onChange={() => set("notifications", "email", !n.email)} />
                      <div className="space-y-3">
                        <SwitchRow title="New user registrations" text="When someone creates an account" checked={n.newUsers} disabled={!n.email} onChange={() => set("notifications", "newUsers", !n.newUsers)} />
                        <SwitchRow title="Admission applications" text="When a new application is submitted" checked={n.admissions} disabled={!n.email} onChange={() => set("notifications", "admissions", !n.admissions)} />
                        <SwitchRow title="Reports ready" text="When a generated report is available" checked={n.reports} disabled={!n.email} onChange={() => set("notifications", "reports", !n.reports)} />
                        <SwitchRow title="System alerts" text="Errors, downtime and security warnings" checked={n.system} disabled={!n.email} onChange={() => set("notifications", "system", !n.system)} />
                      </div>
                      <Row label="Email delivery" htmlFor="digest">
                        <Select id="digest" value={n.digest} disabled={!n.email} onChange={(v) => set("notifications", "digest", v)} options={["Instant", "Daily summary", "Weekly summary"]} />
                      </Row>
                    </>
                  )}

                  {/* BACKUP */}
                  {tab === "backup" && (
                    <>
                      <SwitchRow title="Automatic backups" text="Back up portal data on a schedule" checked={b.auto} onChange={() => set("backup", "auto", !b.auto)} />
                      <Row label="Frequency" htmlFor="frequency">
                        <Select id="frequency" value={b.frequency} disabled={!b.auto} onChange={(v) => set("backup", "frequency", v)} options={["Daily", "Weekly", "Monthly"]} />
                      </Row>
                      <Row label="Keep backups for" htmlFor="retention">
                        <Select id="retention" value={b.retention} onChange={(v) => set("backup", "retention", v)} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} />
                      </Row>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="leading-tight">
                            <p className="text-sm font-semibold text-[#14234b]">Back up now</p>
                            <p className="mt-0.5 text-xs text-slate-500">Create a manual backup of all portal data.</p>
                          </div>
                          <button
                            onClick={startBackup}
                            disabled={backup.running}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#2f6fdd] bg-white px-4 py-2 text-sm font-semibold text-[#2f6fdd] transition hover:bg-[#2f6fdd] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-[#2f6fdd]"
                          >
                            {backup.running ? <><Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> Backing up… {Math.round(backup.progress)}%</> : <><Download size={15} /> Back up now</>}
                          </button>
                        </div>
                        {backup.running && (
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(backup.progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Backup progress">
                            <div className="h-full rounded-full bg-[#2f6fdd] transition-all duration-150" style={{ width: `${backup.progress}%` }} />
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#14234b]"><History size={16} className="text-slate-400" /> Backup history</h3>
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                          {backups.map((x) => (
                            <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                              <div className="flex-1 leading-tight">
                                <p className="text-sm font-semibold text-[#14234b]">{fmt(x.ts)}</p>
                                <p className="text-xs text-slate-400">{x.kind} · {x.size}</p>
                              </div>
                              <button onClick={() => setRestore(x)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#5b47d6] transition hover:bg-[#5b47d6]/10">Restore</button>
                            </li>
                          ))}
                          {backups.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">No backups yet.</li>}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-8">
            <p className={`flex items-center gap-2 text-xs font-semibold ${dirty[tab] ? "text-[#b45309]" : "text-[#1f7a46]"}`} aria-live="polite">
              {dirty[tab] ? (
                <><span className="h-2 w-2 animate-pulse rounded-full bg-[#f2a900] motion-reduce:animate-none" /> Unsaved changes in {currentTab.label}</>
              ) : (
                <><CheckCircle2 size={14} /> All changes saved</>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={discard}
                disabled={!dirty[tab] || saving}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <RotateCcw size={15} /> Reset
              </button>
              <button
                onClick={save}
                disabled={!dirty[tab] || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#5b47d6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5b47d6]/25 transition hover:-translate-y-0.5 hover:bg-[#4a38bb] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
              >
                {saving ? <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> Saving…</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Restore modal ── */}
      {restore && (
        <Modal title="Restore this backup?" onClose={() => setRestore(null)}>
          <div className="px-6 py-6">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#d97706]/10 text-[#d97706]"><AlertCircle size={22} /></span>
              <p className="text-sm leading-relaxed text-slate-600">
                Portal data will be restored to the backup from <strong className="text-[#14234b]">{fmt(restore.ts)}</strong>. Changes made after that time will be lost.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setRestore(null)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={confirmRestore} autoFocus className="rounded-lg bg-[#d97706] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#d97706]/25 hover:bg-[#b45309]">Restore</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 z-[60] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in flex items-center gap-3 rounded-xl bg-[#14234b] px-4 py-3 text-sm text-white shadow-2xl">
            <CheckCircle2 size={18} className="shrink-0 text-[#6ee7a0]" />
            <span className="flex-1">{t.message}</span>
            {t.undo && (
              <button onClick={() => { t.undo(); dismissToast(t.id); }} className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold transition hover:bg-white/25"><Undo2 size={13} /> Undo</button>
            )}
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-white/60 hover:text-white"><X size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}