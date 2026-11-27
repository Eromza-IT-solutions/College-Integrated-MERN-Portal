import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  X,
  Building2,
  BookOpen,
  Layers,
  Inbox,
} from "lucide-react";

/* ----------------------------- config & seed ----------------------------- */

const ACCENT = "#a3203c";

const TABS = [
  { key: "departments", label: "Departments", singular: "department", icon: Building2, parent: null },
  { key: "courses", label: "Courses", singular: "course", icon: BookOpen, parent: { key: "departments", label: "Department" } },
  { key: "subjects", label: "Subjects", singular: "subject", icon: Layers, parent: { key: "courses", label: "Course" } },
];

const SEED = {
  departments: [
    { id: 1, code: "ART", name: "Arts", active: true },
    { id: 2, code: "BBM", name: "Bcom BM", active: false },
    { id: 3, code: "COM", name: "Commerce", active: true },
    { id: 4, code: "CSC", name: "Computer Science", active: true },
    { id: 5, code: "SCI", name: "Science", active: true },
  ],
  courses: [
    { id: 1, code: "BA", name: "Bachelor of Arts", parent: "ART", active: true },
    { id: 2, code: "BCOM", name: "Bachelor of Commerce", parent: "COM", active: true },
    { id: 3, code: "BSC-CS", name: "B.Sc Computer Science", parent: "CSC", active: true },
    { id: 4, code: "BSC", name: "B.Sc Science", parent: "SCI", active: false },
  ],
  subjects: [
    { id: 1, code: "ENG", name: "English Literature", parent: "BA", active: true },
    { id: 2, code: "ACC", name: "Financial Accounting", parent: "BCOM", active: true },
    { id: 3, code: "DSA", name: "Data Structures", parent: "BSC-CS", active: true },
    { id: 4, code: "PHY", name: "Physics", parent: "BSC", active: true },
  ],
};

/* -------------------------------- helpers -------------------------------- */

function Highlight({ text, query }) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-amber-100 px-0.5 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* --------------------------------- modal --------------------------------- */

function EditorModal({ tab, parentOptions, item, existingCodes, onSave, onClose }) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    parent: item?.parent ?? parentOptions[0]?.code ?? "",
  });
  const [errors, setErrors] = useState({});
  const codeRef = useRef(null);

  useEffect(() => {
    codeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const next = {};
    if (!code) next.code = "Enter a code";
    else if (existingCodes.includes(code)) next.code = "This code is already in use";
    if (!name) next.name = "Enter a name";
    if (tab.parent && !form.parent) next.parent = `Choose a ${tab.parent.label.toLowerCase()}`;
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({ code, name, parent: tab.parent ? form.parent : undefined });
  };

  const inputCls = (err) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-4 ${
      err
        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
        : "border-slate-200 focus:border-[#a3203c] focus:ring-rose-100"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md origin-bottom animate-[pop_.18s_ease-out] rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            {isEdit ? `Edit ${tab.singular}` : `Add ${tab.singular}`}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Code</label>
            <input
              ref={codeRef}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CSC"
              className={inputCls(errors.code)}
            />
            {errors.code && <p className="mt-1 text-xs text-rose-600">{errors.code}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`Name of the ${tab.singular}`}
              className={inputCls(errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          {tab.parent && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{tab.parent.label}</label>
              <select
                value={form.parent}
                onChange={(e) => setForm({ ...form, parent: e.target.value })}
                className={inputCls(errors.parent)}
              >
                {parentOptions.length === 0 && <option value="">No {tab.parent.label.toLowerCase()} available</option>}
                {parentOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              {errors.parent && <p className="mt-1 text-xs text-rose-600">{errors.parent}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            style={{ backgroundColor: ACCENT }}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[.98]"
          >
            {isEdit ? "Save changes" : `Add ${tab.singular}`}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function AcademicData() {
  const [data, setData] = useState(SEED);
  const [activeKey, setActiveKey] = useState("departments");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { item? }
  const [toast, setToast] = useState(null);

  const tab = TABS.find((t) => t.key === activeKey);
  const rows = data[activeKey];

  /* sliding tab underline */
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = tabRefs.current[activeKey];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeKey]);

  /* brief skeleton on tab switch — replace with your real API call */
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [activeKey]);

  /* auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const switchTab = (key) => {
    setActiveKey(key);
    setQuery("");
    setStatusFilter("all");
  };

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.active).length,
      inactive: rows.filter((r) => !r.active).length,
    }),
    [rows]
  );

  const parentName = (code) => {
    if (!tab.parent) return "";
    return data[tab.parent.key].find((p) => p.code === code)?.name ?? code;
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "inactive" && r.active) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (tab.parent && parentName(r.parent).toLowerCase().includes(q))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, statusFilter, tab]);

  const toggleStatus = (row) => {
    setData((d) => ({
      ...d,
      [activeKey]: d[activeKey].map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)),
    }));
    setToast(`${row.name} ${row.active ? "deactivated" : "activated"}`);
  };

  const save = (values) => {
    const editing = modal?.item;
    setData((d) => ({
      ...d,
      [activeKey]: editing
        ? d[activeKey].map((r) => (r.id === editing.id ? { ...r, ...values } : r))
        : [...d[activeKey], { id: Date.now(), active: true, ...values }],
    }));
    setToast(editing ? `${values.name} updated` : `${values.name} added`);
    setModal(null);
  };

  const cols = tab.parent ? "110px 1.6fr 1.3fr 120px 220px" : "140px 1.6fr 140px 220px";
  const headers = tab.parent
    ? ["Code", "Name", tab.parent.label, "Status", "Actions"]
    : ["Code", "Name", "Status", "Actions"];

  const existingCodes = rows
    .filter((r) => r.id !== modal?.item?.id)
    .map((r) => r.code.toUpperCase());

  return (
    <div className="px-6 pb-10">
      {/* ------------------------------- tabs ------------------------------- */}
      <div className="relative mb-6 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.key === activeKey;
          return (
            <button
              key={t.key}
              ref={(el) => (tabRefs.current[t.key] = el)}
              onClick={() => switchTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                on ? "text-[#a3203c]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={16} />
              {t.label}
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-semibold transition-colors ${
                  on ? "bg-rose-50 text-[#a3203c]" : "bg-slate-100 text-slate-500"
                }`}
              >
                {data[t.key].length}
              </span>
            </button>
          );
        })}
        <span
          className="absolute -bottom-px h-0.5 rounded-full transition-all duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width, backgroundColor: ACCENT }}
        />
      </div>

      {/* ------------------------------- card ------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        {/* card header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">{tab.label}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {visible.length === rows.length
                ? `${rows.length} in total`
                : `Showing ${visible.length} of ${rows.length}`}
            </p>
          </div>
          <button
            onClick={() => setModal({})}
            style={{ backgroundColor: ACCENT }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[.98]"
          >
            <Plus size={16} />
            Add {tab.singular}
          </button>
        </div>

        {/* search + filters */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-6 py-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab.label.toLowerCase()}`}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#a3203c] focus:bg-white focus:ring-4 focus:ring-rose-100"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1">
            {["all", "active", "inactive"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  statusFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f} <span className="ml-0.5 text-slate-400">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div
              className="grid items-center gap-4 border-y border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-semibold text-slate-700"
              style={{ gridTemplateColumns: cols }}
            >
              {headers.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>

            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="grid gap-4 border-b border-slate-100 px-6 py-5" style={{ gridTemplateColumns: cols }}>
                  {headers.map((h) => (
                    <div key={h} className="h-4 animate-pulse rounded bg-slate-100" />
                  ))}
                </div>
              ))
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                  <Inbox size={22} />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {rows.length === 0 ? `No ${tab.label.toLowerCase()} yet` : "Nothing matches your search"}
                </p>
                <p className="text-xs text-slate-500">
                  {rows.length === 0
                    ? `Add your first ${tab.singular} to get started.`
                    : "Try a different keyword or change the status filter."}
                </p>
                {rows.length > 0 && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("all");
                    }}
                    className="mt-2 text-xs font-semibold text-[#a3203c] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              visible.map((r) => (
                <div
                  key={r.id}
                  className={`group grid items-center gap-4 border-b border-slate-100 px-6 py-4 transition-colors last:border-b-0 hover:bg-rose-50/40 ${
                    r.active ? "" : "bg-slate-50/40"
                  }`}
                  style={{ gridTemplateColumns: cols }}
                >
                  <span className="text-sm font-semibold text-slate-900">
                    <Highlight text={r.code} query={query.trim()} />
                  </span>
                  <span className={`text-sm transition-colors ${r.active ? "text-slate-700" : "text-slate-400"}`}>
                    <Highlight text={r.name} query={query.trim()} />
                  </span>
                  {tab.parent && (
                    <span className="text-sm text-slate-500">
                      <Highlight text={parentName(r.parent)} query={query.trim()} />
                    </span>
                  )}
                  <span>
                    <StatusBadge active={r.active} />
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModal({ item: r })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleStatus(r)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        r.active
                          ? "text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          : "text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {r.active ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                      {r.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------ modal ------------------------------- */}
      {modal && (
        <EditorModal
          key={modal.item?.id ?? "new"}
          tab={tab}
          parentOptions={tab.parent ? data[tab.parent.key].filter((p) => p.active) : []}
          item={modal.item}
          existingCodes={existingCodes}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}

      {/* ------------------------------ toast ------------------------------- */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-[pop_.2s_ease-out] items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
        >
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}