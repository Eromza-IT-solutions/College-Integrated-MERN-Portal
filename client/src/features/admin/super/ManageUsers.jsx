import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  Download,
  Mail,
  Undo2,
  CheckCircle2,
  SearchX,
  Users,
  UserCheck,
  UserX,
  GraduationCap,
} from "lucide-react";

/*
  Add to index.html:
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  Usage: render it in the area to the right of your sidebar (it fills that whole area).
  <ManageUsers />

  Theme (same as the login page and dashboard): navy #14234b · maroon #8f0014 · gold #f2c200
  Sample data lives in SEED_USERS. To connect your backend, load users in the useEffect marked
  "load users" and call your API inside saveUser / confirmDelete / toggleStatus.
*/

// Optional blurred campus photo behind the counts strip.
// Paste your original base64 string here, or leave "" to use the plain navy gradient.
const campusBg = "";

/* ───────────── sample data ───────────── */
const ROLES = ["Super Admin", "Admin", "Faculty", "Student"];

const SEED_USERS = [
  { id: "U001", name: "Iqra Shaikh", email: "iqra@abc.com", role: "Super Admin", status: "Active" },
  { id: "U002", name: "Ayesha Khan", email: "ayesha@abc.com", role: "Admin", status: "Active" },
  { id: "U003", name: "Sana Patel", email: "sana@abc.com", role: "Faculty", status: "Active" },
  { id: "U004", name: "Zara Ansari", email: "zara@abc.com", role: "Student", status: "Active" },
  { id: "U005", name: "Riya Mehta", email: "riya@abc.com", role: "Student", status: "Inactive" },
  { id: "U006", name: "Omar Farooq", email: "omar@abc.com", role: "Faculty", status: "Active" },
  { id: "U007", name: "Neha Deshmukh", email: "neha@abc.com", role: "Student", status: "Active" },
  { id: "U008", name: "Imran Qureshi", email: "imran@abc.com", role: "Admin", status: "Inactive" },
  { id: "U009", name: "Fatima Sheikh", email: "fatima@abc.com", role: "Student", status: "Active" },
  { id: "U010", name: "Rohan Kulkarni", email: "rohan@abc.com", role: "Faculty", status: "Active" },
  { id: "U011", name: "Aisha Siddiqui", email: "aisha@abc.com", role: "Student", status: "Active" },
  { id: "U012", name: "Kabir Joshi", email: "kabir@abc.com", role: "Student", status: "Inactive" },
];

const ROLE_STYLE = {
  "Super Admin": { badge: "bg-[#8f0014]/10 text-[#8f0014]", avatar: "from-[#8f0014] to-[#c9162c]", bar: "#8f0014" },
  Admin: { badge: "bg-[#14234b]/10 text-[#14234b]", avatar: "from-[#14234b] to-[#4a5a86]", bar: "#14234b" },
  Faculty: { badge: "bg-[#0f9488]/10 text-[#0f9488]", avatar: "from-[#0f9488] to-[#34c3b6]", bar: "#0f9488" },
  Student: { badge: "bg-[#d99a00]/15 text-[#946500]", avatar: "from-[#e0a800] to-[#f7d23a]", bar: "#f2c200" },
};

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
];

/* ───────────── helpers ───────────── */
const initialsOf = (name) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function pageList(total, cur) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur - 1, cur, cur + 1]);
  const arr = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  arr.forEach((n, i) => {
    if (i && n - arr[i - 1] > 1) out.push(`gap${n}`);
    out.push(n);
  });
  return out;
}

function useCountUp(end, duration = 1000) {
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

function Highlight({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-[#f2c200]/60 px-0.5 text-inherit">{p}</mark>
    ) : (
      p
    )
  );
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
      <div className="fade absolute inset-0 bg-[#14234b]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="pop relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#14234b]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status, onClick }) {
  const active = status === "Active";
  return (
    <button
      onClick={onClick}
      title={`Click to mark ${active ? "Inactive" : "Active"}`}
      aria-label={`${status}. Click to mark ${active ? "inactive" : "active"}`}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition hover:ring-2 ${
        active ? "bg-[#e3f3e8] text-[#1f7a46] hover:ring-[#1f9d55]/30" : "bg-[#fde8e4] text-[#c2362b] hover:ring-[#e0473b]/30"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-[#1f9d55]" : "bg-[#e0473b]"}`} />
      {status}
    </button>
  );
}

function UserForm({ mode, initial, users, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", email: "", role: "Student", status: "Active" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 2) err.name = "Please enter the full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) err.email = "Enter a valid email address.";
    else if (users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== initial?.id))
      err.email = "This email is already used by another user.";
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({ ...form, name: form.name.trim(), email: form.email.trim() });
  };

  const input = "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-4";
  const ok = "border-slate-300 focus:border-[#8f0014] focus:ring-[#8f0014]/10";
  const bad = "border-[#e0473b] focus:ring-[#e0473b]/10";

  return (
    <Modal title={mode === "add" ? "Add New User" : "Edit User"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4 px-6 pb-6 pt-1">
        <div>
          <label htmlFor="uf-name" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Full name</label>
          <input id="uf-name" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sana Patel" className={`${input} ${errors.name ? bad : ok}`} />
          {errors.name && <p className="mt-1 text-xs text-[#e0473b]">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="uf-email" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Email</label>
          <input id="uf-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@college.edu" className={`${input} ${errors.email ? bad : ok}`} />
          {errors.email && <p className="mt-1 text-xs text-[#e0473b]">{errors.email}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="uf-role" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Role</label>
            <select id="uf-role" value={form.role} onChange={(e) => set("role", e.target.value)} className={`${input} ${ok}`}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#14234b] uppercase">Status</span>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {["Active", "Inactive"].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => set("status", s)}
                  aria-pressed={form.status === s}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${form.status === s ? "bg-white text-[#14234b] shadow" : "text-slate-500"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/25 transition hover:brightness-110">
            {mode === "add" ? "Add User" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatItem({ icon: Icon, label, value, hint, selected, onClick }) {
  const shown = useCountUp(value);
  return (
    <li>
      <button
        onClick={onClick}
        aria-pressed={selected}
        className="group relative flex w-full items-center gap-4 bg-[#14234b]/70 px-6 py-5 text-left backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2c200]"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 transition duration-300 group-hover:scale-110 ${
            selected ? "bg-[#f2c200] text-[#14234b] ring-[#f2c200]" : "bg-white/10 text-[#f2c200] ring-white/20 group-hover:bg-[#f2c200] group-hover:text-[#14234b]"
          }`}
        >
          <Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-wider text-white/60 uppercase">{label}</span>
          <span className="mt-1 block font-['Playfair_Display',serif] text-3xl font-bold tabular-nums leading-none text-white">{shown}</span>
        </span>
        <span className="hidden text-[11px] font-medium text-white/50 xl:block">{hint}</span>
        <span className={`absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#f2c200] transition-transform duration-300 ${selected ? "scale-x-100" : "scale-x-0"}`} />
      </button>
    </li>
  );
}

/* ───────────── page ───────────── */
export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusF, setStatusF] = useState("All");
  const [roleF, setRoleF] = useState("All");
  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "view" | "delete", user? }
  const [toasts, setToasts] = useState([]);

  // load users (replace this timeout with your API call)
  useEffect(() => {
    const id = setTimeout(() => {
      setUsers(SEED_USERS);
      setLoading(false);
    }, 600);
    return () => clearTimeout(id);
  }, []);

  /* derived data */
  const counts = useMemo(
    () => ({
      All: users.length,
      Active: users.filter((u) => u.status === "Active").length,
      Inactive: users.filter((u) => u.status === "Inactive").length,
      Students: users.filter((u) => u.role === "Student").length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users.filter(
      (u) =>
        (statusF === "All" || u.status === statusF) &&
        (roleF === "All" || u.role === roleF) &&
        (!q || [u.id, u.name, u.email, u.role].some((v) => v.toLowerCase().includes(q)))
    );
    return list.sort((a, b) => {
      const r = String(a[sort.key]).localeCompare(String(b[sort.key]), undefined, { numeric: true, sensitivity: "base" });
      return sort.dir === "asc" ? r : -r;
    });
  }, [users, query, statusF, roleF, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  useEffect(() => setPage(1), [query, statusF, roleF, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* feedback helpers */
  const toast = (message, undo) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  /* actions */
  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const toggleStatus = (u) => {
    const status = u.status === "Active" ? "Inactive" : "Active";
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status } : x)));
    toast(`${u.name} is now ${status.toLowerCase()}.`);
  };

  const saveUser = (data) => {
    if (modal.type === "add") {
      const next = Math.max(0, ...users.map((u) => parseInt(u.id.slice(1), 10))) + 1;
      const newUser = { ...data, id: `U${String(next).padStart(3, "0")}` };
      setUsers((list) => [...list, newUser]);
      toast(`${newUser.name} was added.`);
    } else {
      setUsers((list) => list.map((u) => (u.id === modal.user.id ? { ...u, ...data } : u)));
      toast(`${data.name} was updated.`);
    }
    setModal(null);
  };

  const confirmDelete = () => {
    const target = modal.user;
    const index = users.findIndex((u) => u.id === target.id);
    setUsers((list) => list.filter((u) => u.id !== target.id));
    toast(`${target.name} was deleted.`, () => {
      setUsers((list) => {
        const copy = [...list];
        copy.splice(Math.min(index, copy.length), 0, target);
        return copy;
      });
    });
    setModal(null);
  };

  const exportCsv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [COLUMNS.map((c) => c.label).join(","), ...filtered.map((u) => COLUMNS.map((c) => esc(u[c.key])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} user${filtered.length === 1 ? "" : "s"} to CSV.`);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusF("All");
    setRoleF("All");
  };

  const pickRole = (r) => setRoleF((cur) => (cur === r ? "All" : r));
  const filtersActive = query || statusF !== "All" || roleF !== "All";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f7f3ef] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .rise { animation: rise .55s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes rowIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .row-in { animation: rowIn .35s ease both; }
        @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        .pop { animation: pop .25s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        .fade { animation: fade .2s ease both; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
        .toast-in { animation: toastIn .3s ease both; }
        @media (prefers-reduced-motion: reduce) { .rise, .row-in, .pop, .fade, .toast-in, .animate-pulse { animation: none; } }
      `}</style>

      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8f0014]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#14234b]/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex w-full flex-1 flex-col px-5 py-6 sm:px-8 lg:px-10">
        {/* ── Live counts (click a figure to filter the table) ── */}
        <section className="rise relative overflow-hidden rounded-3xl bg-[#14234b] shadow-xl">
          {campusBg && (
            <div className="absolute -inset-4 scale-105 bg-cover bg-center blur-[6px]" style={{ backgroundImage: `url(${campusBg})` }} aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-[#14234b]/92 via-[#1b2f63]/88 to-[#3a1230]/88" aria-hidden="true" />
          <span className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#8f0014]/30" aria-hidden="true" />

          <ul className="relative grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4" aria-label="User figures">
            <StatItem icon={Users} label="Total Users" value={counts.All} hint="Show all" selected={statusF === "All" && roleF === "All"} onClick={() => { setStatusF("All"); setRoleF("All"); }} />
            <StatItem icon={UserCheck} label="Active" value={counts.Active} hint="Filter" selected={statusF === "Active"} onClick={() => setStatusF(statusF === "Active" ? "All" : "Active")} />
            <StatItem icon={UserX} label="Inactive" value={counts.Inactive} hint="Filter" selected={statusF === "Inactive"} onClick={() => setStatusF(statusF === "Inactive" ? "All" : "Inactive")} />
            <StatItem icon={GraduationCap} label="Students" value={counts.Students} hint="Filter" selected={roleF === "Student"} onClick={() => pickRole("Student")} />
          </ul>
          <div className="relative h-1 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
        </section>

        {/* ── Table panel ── */}
        <section className="rise mt-6 flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100" style={{ animationDelay: "120ms" }}>
          <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />

          {/* toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by status">
                {["All", "Active", "Inactive"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusF(s)}
                    aria-pressed={statusF === s}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${statusF === s ? "bg-white text-[#14234b] shadow" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {s} <span className="ml-1 tabular-nums text-slate-400">{counts[s]}</span>
                  </button>
                ))}
              </div>
              <select
                value={roleF}
                onChange={(e) => setRoleF(e.target.value)}
                aria-label="Filter by role"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 focus:border-[#8f0014] focus:outline-none focus:ring-4 focus:ring-[#8f0014]/10"
              >
                <option value="All">All roles</option>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              {filtersActive && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#8f0014] transition hover:bg-[#8f0014]/10">
                  <X size={13} /> Clear filters
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-[#8f0014] focus-within:ring-4 focus-within:ring-[#8f0014]/10">
                <Search size={16} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users..."
                  aria-label="Search users"
                  className="w-44 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Clear search" className="text-slate-400 hover:text-slate-700">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={exportCsv}
                disabled={!filtered.length}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#14234b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} /> Export
              </button>
              <button
                onClick={() => setModal({ type: "add" })}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/25 transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <Plus size={16} /> Add User
              </button>
            </div>
          </div>

          {/* table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-[#14234b]/[0.04] text-xs tracking-wide text-[#14234b]/70 uppercase">
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className="px-5 py-3.5 font-semibold"
                    >
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1.5 uppercase transition hover:text-[#8f0014]">
                        {c.label}
                        {sort.key === c.key ? (
                          sort.dir === "asc" ? <ChevronUp size={14} className="text-[#8f0014]" /> : <ChevronDown size={14} className="text-[#8f0014]" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${55 + ((i + j) % 4) * 12}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading &&
                  rows.map((u, i) => (
                    <tr key={u.id} className="row-in group transition hover:bg-[#14234b]/[0.03]" style={{ animationDelay: `${i * 45}ms` }}>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-slate-500">
                        <Highlight text={u.id} query={query} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow ring-2 ring-white transition group-hover:scale-105 ${ROLE_STYLE[u.role].avatar}`}>
                            {initialsOf(u.name)}
                          </span>
                          <span className="font-semibold text-[#14234b]"><Highlight text={u.name} query={query} /></span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600"><Highlight text={u.email} query={query} /></td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_STYLE[u.role].badge}`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={u.status} onClick={() => toggleStatus(u)} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ type: "view", user: u })} aria-label={`View ${u.name}`} title="View" className="rounded-lg p-2 text-slate-500 transition hover:bg-[#14234b]/10 hover:text-[#14234b]"><Eye size={17} /></button>
                          <button onClick={() => setModal({ type: "edit", user: u })} aria-label={`Edit ${u.name}`} title="Edit" className="rounded-lg p-2 text-slate-500 transition hover:bg-[#f2c200]/25 hover:text-[#946500]"><Pencil size={17} /></button>
                          <button onClick={() => setModal({ type: "delete", user: u })} aria-label={`Delete ${u.name}`} title="Delete" className="rounded-lg p-2 text-slate-500 transition hover:bg-[#e0473b]/10 hover:text-[#e0473b]"><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {!loading && rows.length === 0 && (
              <div className="grid place-items-center px-6 py-16 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><SearchX size={28} /></span>
                <p className="mt-4 font-['Playfair_Display',serif] text-lg font-bold text-[#14234b]">No users found</p>
                <p className="mt-1 text-sm text-slate-500">
                  {filtersActive ? "Try a different search or clear the filters." : "Add your first user to get started."}
                </p>
                {filtersActive && (
                  <button onClick={clearFilters} className="mt-4 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* footer / pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {filtered.length === 0 ? "No results" : `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} users`}
              </span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#8f0014]/20"
                >
                  {[5, 10, 20].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </label>
            </div>

            <nav className="flex items-center gap-1.5" aria-label="Pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {pageList(totalPages, page).map((n) =>
                typeof n === "string" ? (
                  <span key={n} className="px-1 text-slate-400">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition ${
                      n === page ? "bg-gradient-to-b from-[#a30018] to-[#6d000f] text-white shadow-md shadow-[#8f0014]/30" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </section>
      </div>

      {/* ── Modals ── */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <UserForm mode={modal.type} initial={modal.user} users={users} onSave={saveUser} onClose={() => setModal(null)} />
      )}

      {modal?.type === "view" && (
        <Modal title="User Details" onClose={() => setModal(null)}>
          <div className="px-6 pb-6 pt-2 text-center">
            <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br text-2xl font-bold text-white shadow-lg ring-4 ring-[#f2c200]/50 ${ROLE_STYLE[modal.user.role].avatar}`}>
              {initialsOf(modal.user.name)}
            </span>
            <h3 className="mt-4 font-['Playfair_Display',serif] text-2xl font-bold text-[#14234b]">{modal.user.name}</h3>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500"><Mail size={14} /> {modal.user.email}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">ID</p><p className="mt-1 text-sm font-bold text-[#14234b]">{modal.user.id}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Role</p><p className="mt-1 text-sm font-bold text-[#14234b]">{modal.user.role}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Status</p><p className={`mt-1 text-sm font-bold ${modal.user.status === "Active" ? "text-[#1f9d55]" : "text-[#e0473b]"}`}>{modal.user.status}</p></div>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
              <button onClick={() => setModal({ type: "edit", user: modal.user })} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"><Pencil size={15} /> Edit</button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === "delete" && (
        <Modal title="Delete user?" onClose={() => setModal(null)}>
          <div className="px-6 pb-6 pt-2">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e0473b]/10 text-[#e0473b]"><Trash2 size={22} /></span>
              <p className="text-sm leading-relaxed text-slate-600">
                You are about to delete <strong className="text-[#14234b]">{modal.user.name}</strong> ({modal.user.id}). You can undo this right after.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={confirmDelete} autoFocus className="rounded-lg bg-[#e0473b] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#e0473b]/25 hover:bg-[#c2362b]">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 z-[60] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in flex items-center gap-3 rounded-xl bg-[#14234b] px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-[#f2c200]/30">
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