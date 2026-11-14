import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Plus,
  ArrowRight,
  Search,
  X,
  Pencil,
  Trash2,
  Landmark,
  GraduationCap,
  BarChart3,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  BookOpen,
  LogOut,
  User as UserIcon,
  Undo2,
  CheckCircle2,
  SearchX,
  UserPlus,
  Clock,
} from "lucide-react";

/*
  Add to index.html:
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  Usage: render it in the area to the right of your sidebar (it fills that whole area).
  <ManageAdminPanels user={{ name: "Super Admin" }} onLogout={...} onManage={(panel) => navigate(`/panels/${panel.id}`)} />

  - "Manage →" calls onManage(panel) if you pass it; otherwise it opens a side drawer with the panel's admins.
  - Panels below are sample data (SEED_PANELS). Replace the "load panels" timeout and the save/delete/toggle
    handlers with your API calls.
*/

/* ───────────── theme + sample data ───────────── */
const THEMES = {
  blue: { card: "from-[#e8f0fd] to-[#f6f9ff]", blob: "bg-[#cfe0fa]", fg: "text-[#2f6fdd]", ring: "ring-[#2f6fdd]/15", btn: "border-[#2f6fdd] text-[#2f6fdd] hover:bg-[#2f6fdd]", swatch: "bg-[#2f6fdd]" },
  green: { card: "from-[#e3f4ea] to-[#f4fbf7]", blob: "bg-[#c6e8d1]", fg: "text-[#1f9d55]", ring: "ring-[#1f9d55]/15", btn: "border-[#1f9d55] text-[#1f9d55] hover:bg-[#1f9d55]", swatch: "bg-[#1f9d55]" },
  purple: { card: "from-[#ece7f8] to-[#f8f5fd]", blob: "bg-[#d9d0f2]", fg: "text-[#6a4cc7]", ring: "ring-[#6a4cc7]/15", btn: "border-[#6a4cc7] text-[#6a4cc7] hover:bg-[#6a4cc7]", swatch: "bg-[#6a4cc7]" },
  amber: { card: "from-[#fdf0dc] to-[#fffaf0]", blob: "bg-[#f8dcae]", fg: "text-[#d97706]", ring: "ring-[#d97706]/15", btn: "border-[#d97706] text-[#d97706] hover:bg-[#d97706]", swatch: "bg-[#d97706]" },
  rose: { card: "from-[#fde8e4] to-[#fff4f2]", blob: "bg-[#fad0c9]", fg: "text-[#e0473b]", ring: "ring-[#e0473b]/15", btn: "border-[#e0473b] text-[#e0473b] hover:bg-[#e0473b]", swatch: "bg-[#e0473b]" },
};

const ICONS = { landmark: Landmark, cap: GraduationCap, chart: BarChart3, file: FileText, users: Users, settings: Settings, shield: ShieldCheck, book: BookOpen };

const HOUR = 3600 * 1000;
const seedPanels = () => {
  const now = Date.now();
  return [
    { id: "p1", name: "College Admin", description: "Manage college content and info", icon: "landmark", theme: "blue", admins: ["Ayesha Khan", "Omar Farooq"], active: true, updated: now - 2 * HOUR },
    { id: "p2", name: "Admission Admin", description: "Handle admissions and applications", icon: "cap", theme: "green", admins: ["Sana Patel"], active: true, updated: now - 26 * HOUR },
    { id: "p3", name: "Criterion Admin", description: "Manage AQAR criteria & metrics", icon: "chart", theme: "purple", admins: ["Imran Qureshi", "Rohan Kulkarni", "Zara Ansari"], active: true, updated: now - 5 * HOUR },
  ];
};

/* ───────────── helpers ───────────── */
const initialsOf = (name) => name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const timeAgo = (ts, now) => {
  const m = Math.floor(Math.max(0, now - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

function useCountUp(end, duration = 900) {
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
  return Math.round(val);
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

/* ───────────── small UI pieces ───────────── */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade absolute inset-0 bg-[#14234b]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-[#14234b]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#1f9d55]" : "bg-slate-300"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, delay }) {
  const shown = useCountUp(value);
  return (
    <div className="rise flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100" style={{ animationDelay: `${delay}ms` }}>
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${tone}`}><Icon size={22} /></span>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none text-[#14234b]">{shown}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function PanelForm({ mode, initial, panels, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", description: "", icon: "landmark", theme: "blue" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 3) err.name = "Panel name must be at least 3 characters.";
    else if (panels.some((p) => p.name.toLowerCase() === form.name.trim().toLowerCase() && p.id !== initial?.id))
      err.name = "A panel with this name already exists.";
    if (!form.description.trim()) err.description = "Add a short description.";
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({ ...form, name: form.name.trim(), description: form.description.trim() });
  };

  const input = "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-4";
  const ok = "border-slate-300 focus:border-[#5b47d6] focus:ring-[#5b47d6]/10";
  const bad = "border-[#e0473b] focus:ring-[#e0473b]/10";
  const T = THEMES[form.theme];
  const PreviewIcon = ICONS[form.icon];

  return (
    <Modal title={mode === "add" ? "Add New Panel" : "Edit Panel"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        {/* live preview */}
        <div className={`flex items-center gap-3 rounded-xl bg-gradient-to-br ${T.card} p-3 ring-1 ${T.ring}`}>
          <span className={`grid h-11 w-11 place-items-center rounded-full bg-white shadow ${T.fg}`}><PreviewIcon size={22} /></span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-[#14234b]">{form.name || "Panel name"}</p>
            <p className="truncate text-xs text-slate-500">{form.description || "Short description"}</p>
          </div>
        </div>

        <div>
          <label htmlFor="pf-name" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Panel name</label>
          <input id="pf-name" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Examination Admin" className={`${input} ${errors.name ? bad : ok}`} />
          {errors.name && <p className="mt-1 text-xs text-[#e0473b]">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="pf-desc" className="mb-1.5 flex justify-between text-xs font-semibold tracking-wide text-[#14234b] uppercase">
            Description <span className="font-normal normal-case text-slate-400">{form.description.length}/60</span>
          </label>
          <input id="pf-desc" maxLength={60} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What does this panel manage?" className={`${input} ${errors.description ? bad : ok}`} />
          {errors.description && <p className="mt-1 text-xs text-[#e0473b]">{errors.description}</p>}
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Colour</span>
          <div className="flex gap-2.5">
            {Object.keys(THEMES).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => set("theme", k)}
                aria-label={k}
                aria-pressed={form.theme === k}
                className={`h-8 w-8 rounded-full ${THEMES[k].swatch} transition ${form.theme === k ? "scale-110 ring-4 ring-offset-2 ring-slate-200" : "opacity-80 hover:opacity-100"}`}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Icon</span>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.entries(ICONS).map(([k, I]) => (
              <button
                type="button"
                key={k}
                onClick={() => set("icon", k)}
                aria-label={k}
                aria-pressed={form.icon === k}
                className={`grid h-9 place-items-center rounded-lg transition ${form.icon === k ? "bg-[#5b47d6] text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                <I size={17} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
          <button type="submit" className="rounded-lg bg-[#5b47d6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5b47d6]/25 transition hover:bg-[#4a38bb]">
            {mode === "add" ? "Add Panel" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Drawer({ panel, onClose, onAssign, onRemove, onOpen }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const T = THEMES[panel.theme];
  const Icon = ICONS[panel.icon];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Enter the admin’s name.");
    if (panel.admins.some((a) => a.toLowerCase() === n.toLowerCase())) return setError("This admin is already assigned.");
    onAssign(panel.id, n);
    setName("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${panel.name} details`}>
      <div className="fade absolute inset-0 bg-[#14234b]/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className={`relative overflow-hidden bg-gradient-to-br ${T.card} px-6 pb-6 pt-7`}>
          <span className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${T.blob} opacity-60`} aria-hidden="true" />
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/70"><X size={18} /></button>
          <span className={`relative grid h-14 w-14 place-items-center rounded-full bg-white shadow ${T.fg}`}><Icon size={28} /></span>
          <h2 className="relative mt-4 text-xl font-bold text-[#14234b]">{panel.name}</h2>
          <p className="relative mt-1 text-sm text-slate-600">{panel.description}</p>
          <span className={`relative mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${panel.active ? "bg-white text-[#1f7a46]" : "bg-white text-slate-500"}`}>
            <span className={`h-2 w-2 rounded-full ${panel.active ? "bg-[#1f9d55]" : "bg-slate-400"}`} /> {panel.active ? "Active" : "Disabled"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-sm font-bold text-[#14234b]">Assigned admins <span className="ml-1 text-slate-400">({panel.admins.length})</span></h3>
          <ul className="mt-3 space-y-2">
            {panel.admins.map((a) => (
              <li key={a} className="row-in flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className={`grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-bold shadow-sm ${T.fg}`}>{initialsOf(a)}</span>
                <span className="flex-1 text-sm font-semibold text-[#14234b]">{a}</span>
                <button onClick={() => onRemove(panel.id, a)} aria-label={`Remove ${a}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#e0473b]/10 hover:text-[#e0473b]"><X size={16} /></button>
              </li>
            ))}
            {panel.admins.length === 0 && <li className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No admins assigned yet.</li>}
          </ul>

          <form onSubmit={add} className="mt-4">
            <label htmlFor="assign" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Assign an admin</label>
            <div className="flex gap-2">
              <input
                id="assign"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="Admin name"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#5b47d6] focus:outline-none focus:ring-4 focus:ring-[#5b47d6]/10"
              />
              <button type="submit" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#5b47d6] px-4 text-sm font-semibold text-white transition hover:bg-[#4a38bb]"><UserPlus size={15} /> Add</button>
            </div>
            {error && <p className="mt-1 text-xs text-[#e0473b]">{error}</p>}
          </form>
        </div>

        <div className="border-t border-slate-100 p-5">
          <button
            onClick={() => onOpen(panel)}
            disabled={!panel.active}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14234b] py-3 text-sm font-semibold text-white transition hover:bg-[#1c3170] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open {panel.name} <ArrowRight size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ───────────── page ───────────── */
export default function ManageAdminPanels({ user = { name: "Super Admin" }, onLogout, onManage }) {
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "delete", panel? }
  const [drawerId, setDrawerId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [log, setLog] = useState([]);
  const [unread, setUnread] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const nextId = useRef(10);

  const bellRef = useRef(null);
  const menuRef = useRef(null);
  useClickOutside(bellRef, () => setBellOpen(false));
  useClickOutside(menuRef, () => setMenuOpen(false));

  // load panels (replace this timeout with your API call)
  useEffect(() => {
    const id = setTimeout(() => {
      setPanels(seedPanels());
      setLoading(false);
    }, 600);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(
    () => ({
      total: panels.length,
      active: panels.filter((p) => p.active).length,
      admins: new Set(panels.flatMap((p) => p.admins.map((a) => a.toLowerCase()))).size,
    }),
    [panels]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return panels.filter(
      (p) =>
        (filter === "All" || (filter === "Active" ? p.active : !p.active)) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.admins.some((a) => a.toLowerCase().includes(q)))
    );
  }, [panels, query, filter]);

  const drawerPanel = panels.find((p) => p.id === drawerId);
  const filtersActive = query || filter !== "All";

  /* feedback */
  const toast = (message, undo) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const addLog = (text) => {
    setLog((l) => [{ id: Date.now() + Math.random(), text, ts: Date.now() }, ...l].slice(0, 8));
    setUnread((u) => u + 1);
  };
  const touch = (id, patch) => setPanels((list) => list.map((p) => (p.id === id ? { ...p, ...patch, updated: Date.now() } : p)));

  /* actions */
  const togglePanel = (p) => {
    touch(p.id, { active: !p.active });
    addLog(`${p.name} ${p.active ? "disabled" : "enabled"}`);
    toast(`${p.name} is now ${p.active ? "disabled" : "active"}.`);
  };

  const savePanel = (data) => {
    if (modal.type === "add") {
      const created = { ...data, id: `p${nextId.current++}`, admins: [], active: true, updated: Date.now() };
      setPanels((list) => [...list, created]);
      addLog(`Created panel ${created.name}`);
      toast(`${created.name} was created.`);
    } else {
      touch(modal.panel.id, data);
      addLog(`Updated panel ${data.name}`);
      toast(`${data.name} was updated.`);
    }
    setModal(null);
  };

  const confirmDelete = () => {
    const target = modal.panel;
    const index = panels.findIndex((p) => p.id === target.id);
    setPanels((list) => list.filter((p) => p.id !== target.id));
    if (drawerId === target.id) setDrawerId(null);
    addLog(`Deleted panel ${target.name}`);
    toast(`${target.name} was deleted.`, () => {
      setPanels((list) => {
        const copy = [...list];
        copy.splice(Math.min(index, copy.length), 0, target);
        return copy;
      });
      addLog(`Restored panel ${target.name}`);
    });
    setModal(null);
  };

  const assignAdmin = (id, name) => {
    const p = panels.find((x) => x.id === id);
    touch(id, { admins: [...p.admins, name] });
    addLog(`${name} assigned to ${p.name}`);
  };
  const removeAdmin = (id, name) => {
    const p = panels.find((x) => x.id === id);
    touch(id, { admins: p.admins.filter((a) => a !== name) });
    addLog(`${name} removed from ${p.name}`);
    toast(`${name} was removed from ${p.name}.`, () => {
      setPanels((list) => list.map((x) => (x.id === id ? { ...x, admins: [...x.admins, name] } : x)));
    });
  };

  const manage = (p) => (onManage ? onManage(p) : setDrawerId(p.id));

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#fbf7f4] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .55s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes rowIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .row-in { animation: rowIn .35s ease both; }
        @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        .pop { animation: pop .25s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        .fade { animation: fade .2s ease both; }
        @keyframes drawerIn { from { transform: translateX(100%) } to { transform: none } }
        .drawer { animation: drawerIn .3s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
        .toast-in { animation: toastIn .3s ease both; }
        @media (prefers-reduced-motion: reduce) { .rise, .row-in, .pop, .fade, .drawer, .toast-in, .animate-pulse { animation: none; } }
      `}</style>

      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f4c9d0]/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#cfe0fa]/40 blur-3xl" aria-hidden="true" />

      <div className="relative flex w-full flex-1 flex-col px-5 py-6 sm:px-8 lg:px-10">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-center justify-between gap-4 pl-14 lg:pl-0">
          <div>
            <h1 className="text-2xl font-bold text-[#14234b] sm:text-[28px]">Manage Admin Panels</h1>
            <p className="mt-0.5 text-xs text-slate-500">Create panels, assign admins and control access.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal({ type: "add" })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#5b47d6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5b47d6]/25 transition hover:-translate-y-0.5 hover:bg-[#4a38bb]"
            >
              <Plus size={16} /> Add Panel
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
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#8f0014] px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
                )}
              </button>
              {bellOpen && (
                <div className="pop absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-[#14234b]">Recent changes</p>
                  {log.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing yet. Changes you make will show up here.</p>
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

        {/* ── Summary ── */}
        <section className="mt-7 grid gap-4 sm:grid-cols-3" aria-label="Summary">
          <SummaryCard label="Total panels" value={stats.total} icon={ShieldCheck} tone="bg-[#5b47d6]/10 text-[#5b47d6]" delay={0} />
          <SummaryCard label="Active panels" value={stats.active} icon={CheckCircle2} tone="bg-[#1f9d55]/10 text-[#1f9d55]" delay={80} />
          <SummaryCard label="Admins assigned" value={stats.admins} icon={Users} tone="bg-[#d97706]/10 text-[#d97706]" delay={160} />
        </section>

        {/* ── Toolbar ── */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-100" role="group" aria-label="Filter by status">
            {["All", "Active", "Disabled"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${filter === s ? "bg-[#14234b] text-white shadow" : "text-slate-500 hover:text-slate-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition focus-within:border-[#5b47d6] focus-within:ring-4 focus-within:ring-[#5b47d6]/10">
            <Search size={16} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search panels or admins..." aria-label="Search panels" className="w-56 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none" />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
            )}
          </div>
        </div>

        {/* ── Panel cards ── */}
        <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Admin panels">
          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/70 ring-1 ring-slate-100" />
            ))}

          {!loading &&
            visible.map((p, i) => {
              const T = THEMES[p.theme];
              const Icon = ICONS[p.icon];
              return (
                <article
                  key={p.id}
                  className={`rise group relative overflow-hidden rounded-2xl bg-gradient-to-br ${T.card} p-6 text-center shadow-sm ring-1 ${T.ring} transition duration-300 hover:-translate-y-1.5 hover:shadow-xl ${p.active ? "" : "saturate-50"}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className={`absolute -right-10 -top-10 h-36 w-36 rounded-full ${T.blob} opacity-60 transition duration-500 group-hover:scale-125`} aria-hidden="true" />

                  {/* edit / delete (visible on hover or focus) */}
                  <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                    <button onClick={() => setModal({ type: "edit", panel: p })} aria-label={`Edit ${p.name}`} title="Edit" className="rounded-lg bg-white/90 p-2 text-slate-500 shadow-sm transition hover:text-[#d97706]"><Pencil size={15} /></button>
                    <button onClick={() => setModal({ type: "delete", panel: p })} aria-label={`Delete ${p.name}`} title="Delete" className="rounded-lg bg-white/90 p-2 text-slate-500 shadow-sm transition hover:text-[#e0473b]"><Trash2 size={15} /></button>
                  </div>

                  <span className={`relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-white shadow-md ${T.fg} transition duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]`}>
                    <Icon size={30} />
                  </span>
                  <h2 className="relative mt-4 text-lg font-bold leading-tight text-[#14234b]">{p.name}</h2>
                  <p className="relative mx-auto mt-1.5 max-w-[16rem] text-sm text-slate-600">{p.description}</p>

                  <button
                    onClick={() => manage(p)}
                    disabled={!p.active}
                    className={`relative mt-5 inline-flex items-center gap-2 rounded-full border-2 bg-white px-6 py-2 text-sm font-semibold transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-500 ${T.btn}`}
                  >
                    Manage <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </button>

                  <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-black/5 pt-4 text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="flex -space-x-2">
                        {p.admins.slice(0, 3).map((a) => (
                          <span key={a} title={a} className={`grid h-7 w-7 place-items-center rounded-full bg-white text-[10px] font-bold ring-2 ring-white ${T.fg}`}>{initialsOf(a)}</span>
                        ))}
                        {p.admins.length === 0 && <span className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-slate-400 ring-2 ring-white"><Users size={13} /></span>}
                      </div>
                      <div className="leading-tight">
                        <p className="text-xs font-semibold text-[#14234b]">{p.admins.length} admin{p.admins.length === 1 ? "" : "s"}</p>
                        <p className="flex items-center gap-1 text-[10px] text-slate-500"><Clock size={10} /> {timeAgo(p.updated, now)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">{p.active ? "Active" : "Disabled"}</span>
                      <Switch checked={p.active} onChange={() => togglePanel(p)} label={`${p.active ? "Disable" : "Enable"} ${p.name}`} />
                    </div>
                  </div>
                </article>
              );
            })}

          {/* create-new tile */}
          {!loading && !filtersActive && (
            <button
              onClick={() => setModal({ type: "add" })}
              className="rise group grid min-h-[18rem] place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-6 text-center transition hover:border-[#5b47d6] hover:bg-white"
              style={{ animationDelay: `${visible.length * 80}ms` }}
            >
              <span>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#5b47d6]/10 text-[#5b47d6] transition group-hover:scale-110 group-hover:bg-[#5b47d6] group-hover:text-white"><Plus size={26} /></span>
                <span className="mt-3 block font-semibold text-[#14234b]">Create new panel</span>
                <span className="mt-1 block text-xs text-slate-500">Add a panel for another department</span>
              </span>
            </button>
          )}
        </section>

        {!loading && visible.length === 0 && (
          <div className="mt-4 grid place-items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-100">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><SearchX size={28} /></span>
            <p className="mt-4 font-semibold text-[#14234b]">No panels found</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search or clear the filters.</p>
            <button onClick={() => { setQuery(""); setFilter("All"); }} className="mt-4 rounded-lg bg-[#5b47d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a38bb]">Clear filters</button>
          </div>
        )}

        {/* ── Activity (fills the remaining height) ── */}
        <section className="mt-6 flex flex-1 flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100" aria-label="Panel activity">
          <h2 className="text-lg font-bold text-[#14234b]">Panel Activity</h2>
          {log.length === 0 ? (
            <div className="grid flex-1 place-items-center py-8 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400"><Clock size={22} /></span>
                <p className="mt-3 text-sm text-slate-500">Changes you make to panels and admins will appear here.</p>
              </div>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100" aria-live="polite">
              {log.map((l) => (
                <li key={l.id} className="row-in flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5b47d6]" />
                  <span className="flex-1 text-sm font-medium text-[#14234b]">{l.text}</span>
                  <time className="text-xs text-slate-400">{timeAgo(l.ts, now)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Modals / drawer ── */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <PanelForm mode={modal.type} initial={modal.panel} panels={panels} onSave={savePanel} onClose={() => setModal(null)} />
      )}

      {modal?.type === "delete" && (
        <Modal title="Delete panel?" onClose={() => setModal(null)}>
          <div className="px-6 py-6">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e0473b]/10 text-[#e0473b]"><Trash2 size={22} /></span>
              <p className="text-sm leading-relaxed text-slate-600">
                You are about to delete <strong className="text-[#14234b]">{modal.panel.name}</strong>
                {modal.panel.admins.length > 0 && <> and unassign its {modal.panel.admins.length} admin{modal.panel.admins.length > 1 ? "s" : ""}</>}. You can undo this right after.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={confirmDelete} autoFocus className="rounded-lg bg-[#e0473b] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#e0473b]/25 hover:bg-[#c2362b]">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {drawerPanel && (
        <Drawer
          panel={drawerPanel}
          onClose={() => setDrawerId(null)}
          onAssign={assignAdmin}
          onRemove={removeAdmin}
          onOpen={(p) => {
            addLog(`Opened ${p.name}`);
            toast(`Opening ${p.name}… connect this to your panel route with the onManage prop.`);
          }}
        />
      )}

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 z-[60] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in flex items-center gap-3 rounded-xl bg-[#14234b] px-4 py-3 text-sm text-white shadow-2xl">
            <CheckCircle2 size={18} className="shrink-0 text-[#6ee7a0]" />
            <span className="flex-1">{t.message}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo();
                  dismissToast(t.id);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold transition hover:bg-white/25"
              >
                <Undo2 size={13} /> Undo
              </button>
            )}
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-white/60 hover:text-white"><X size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}