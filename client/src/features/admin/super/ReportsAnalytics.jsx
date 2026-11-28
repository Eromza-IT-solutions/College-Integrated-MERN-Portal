import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Building2,
  Users,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  Clock,
  BookOpen,
  Percent,
  Wallet,
  Receipt,
  Inbox,
  CalendarRange,
} from "lucide-react";
import { fetchReport } from "../../../services/reportsService";

/* ----------------------------- helpers & seed ---------------------------- */

const ACCENT = "#a3203c";

const daysAgo = (n) => {
  const x = new Date();
  x.setDate(x.getDate() - n);
  return x.toISOString().slice(0, 10);
};

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const BADGE = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  blue: "bg-sky-50 text-sky-700",
  slate: "bg-slate-100 text-slate-600",
};

function Badge({ tone, children }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[tone]}`}>{children}</span>
  );
}

// The server answers GET /reports/:type with { title, summary, rows }. The admission, exam and payment
// reports are totals (per course, per exam, per fee type), so the columns below follow those rows.
const REPORT_TYPE = { departments: "department", admissions: "admission", exams: "exam", payments: "payment" };
const ADMISSION_STATUSES = [
  ["submitted", "Submitted"], ["approved", "Approved"], ["feePaid", "Fee paid"], ["admitted", "Admitted"], ["rejected", "Rejected"],
];
const sum = (rows, key) => rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
const dash = <span className="text-slate-400">–</span>;
const percentCell = (key) => (r) => (r[key] == null ? dash : `${r[key]}%`);

const REPORTS = {
  departments: {
    label: "Departments",
    title: "Department report",
    subtitle: "Live numbers from the college database",
    dateKey: null,
    columns: [
      { key: "department", label: "Department", strong: true },
      { key: "code", label: "Code" },
      { key: "programs", label: "Programs", num: true },
      { key: "activeStudents", label: "Active students", num: true },
      { key: "teachers", label: "Teachers", num: true },
      { key: "attendanceEntries", label: "Attendance entries", num: true },
      {
        key: "presentPercent", label: "Present percent", num: true,
        render: (r) =>
          r.presentPercent == null ? dash : (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.presentPercent}%` }} />
              </div>
              <span>{r.presentPercent}%</span>
            </div>
          ),
      },
      { key: "marksApproved", label: "Marks approved", num: true },
      { key: "marksAwaitingApproval", label: "Marks awaiting approval", num: true },
    ],
    stats: (rows) => [
      { label: "Departments", value: rows.length, icon: Building2 },
      { label: "Active students", value: sum(rows, "activeStudents"), icon: GraduationCap },
      { label: "Teachers", value: sum(rows, "teachers"), icon: Users },
    ],
  },
  admissions: {
    label: "Admissions",
    title: "Admissions report",
    subtitle: "Applications received in the selected period, course by course",
    dateKey: "createdAt",
    columns: [
      { key: "program", label: "Course", strong: true },
      { key: "code", label: "Code" },
      ...ADMISSION_STATUSES.map(([key, label]) => ({ key, label, num: true, render: (r) => r[key] ?? 0, csv: (r) => r[key] ?? 0 })),
      { key: "total", label: "Total", num: true },
    ],
    stats: (rows) => [
      { label: "Applications", value: sum(rows, "total"), icon: ClipboardList },
      { label: "Approved", value: sum(rows, "approved") + sum(rows, "admitted"), icon: CheckCircle2 },
      { label: "Waiting for review", value: sum(rows, "submitted"), icon: Clock },
    ],
  },
  exams: {
    label: "Exams",
    title: "Exam report",
    subtitle: "Exam forms and results of every exam",
    dateKey: null,
    columns: [
      { key: "exam", label: "Exam", strong: true },
      { key: "program", label: "Course" },
      { key: "semester", label: "Sem", num: true },
      { key: "formsApproved", label: "Forms approved", num: true },
      { key: "resultsPublished", label: "Results published", num: true },
      { key: "passPercent", label: "Pass percent", num: true, render: percentCell("passPercent") },
      { key: "averagePercentage", label: "Average score", num: true, render: percentCell("averagePercentage") },
    ],
    stats: (rows) => {
      const scored = rows.filter((r) => r.averagePercentage != null);
      return [
        { label: "Exams", value: rows.length, icon: BookOpen },
        { label: "Results published", value: sum(rows, "resultsPublished"), icon: CheckCircle2 },
        { label: "Average score", value: scored.length ? Math.round(sum(scored, "averagePercentage") / scored.length) : 0, icon: Percent, fmt: (n) => `${n}%` },
      ];
    },
  },
  payments: {
    label: "Payments",
    title: "Payment report",
    subtitle: "Fees collected, pending and refunded in the selected period",
    dateKey: "createdAt",
    columns: [
      { key: "purpose", label: "Fee type", strong: true, render: (r) => <Badge tone="slate">{r.purpose === "exam" ? "Exam fee" : "Admission fee"}</Badge>, csv: (r) => r.purpose },
      { key: "paidCount", label: "Paid", num: true },
      { key: "collectedRupees", label: "Collected", num: true, render: (r) => inr(r.collectedRupees), csv: (r) => r.collectedRupees },
      { key: "pendingCount", label: "Pending", num: true },
      { key: "refundedRupees", label: "Refunded", num: true, render: (r) => inr(r.refundedRupees), csv: (r) => r.refundedRupees },
      { key: "netRupees", label: "Net", num: true, render: (r) => inr(r.netRupees), csv: (r) => r.netRupees },
    ],
    stats: (rows) => [
      { label: "Collected", value: sum(rows, "collectedRupees"), icon: Wallet, fmt: inr },
      { label: "Refunded", value: sum(rows, "refundedRupees"), icon: Receipt, fmt: inr },
      { label: "Pending payments", value: sum(rows, "pendingCount"), icon: Clock },
    ],
  },
};

const TAB_KEYS = Object.keys(REPORTS);

/* ------------------------------ small pieces ----------------------------- */

function useCountUp(target, duration = 650) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function StatCard({ stat, loading }) {
  const Icon = stat.icon;
  const n = useCountUp(loading ? 0 : stat.value);
  return (
    <div className="flex items-start justify-between rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <p className="text-sm text-slate-500">{stat.label}</p>
        <p className="font-display oldstyle-nums mt-1 text-4xl font-bold text-slate-900">
          {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100" /> : (stat.fmt ?? String)(n)}
        </p>
      </div>
      <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
        <Icon size={20} />
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, min, max }) {
  return (
    <label className="block flex-1">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#a3203c] focus:ring-4 focus:ring-rose-100"
      />
    </label>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function ReportsAnalytics() {
  const [tab, setTab] = useState("departments");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState({ tab: null, rows: [] }); // rows belong to the tab they were loaded for
  const [error, setError] = useState("");

  const report = REPORTS[tab];
  const usesDates = Boolean(report.dateKey);
  const badRange = from && to && from > to;

  /* load the report from the server; the date range is applied by the server */
  useEffect(() => {
    if (badRange) return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    const params = usesDates ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : {};
    fetchReport(REPORT_TYPE[tab], params)
      .then((data) => { if (alive) setLoaded({ tab, rows: data.rows ?? [] }); })
      .catch((err) => {
        if (!alive) return;
        setLoaded({ tab, rows: [] });
        setError(err.cause?.response?.data?.error?.message || err.message);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab, from, to, usesDates, badRange]);

  const switchTab = (k) => {
    setTab(k);
    setQuery("");
    setSort({ key: null, dir: "asc" });
  };

  const preset = (days) => {
    setFrom(days ? daysAgo(days) : "");
    setTo(days ? daysAgo(0) : "");
  };

  /* rows of this report (drive the stat cards) */
  const ranged = useMemo(() => (loaded.tab === tab ? loaded.rows : []), [loaded, tab]);

  /* rows after search + sort (drive the table) */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q
      ? ranged.filter((r) => report.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)))
      : ranged;
    if (sort.key) {
      rows = [...rows].sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (x == null) return 1;
        if (y == null) return -1;
        const c = typeof x === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.dir === "asc" ? c : -c;
      });
    }
    return rows;
  }, [ranged, query, sort, report.columns]);

  const stats = report.stats(ranged);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      report.columns.map((c) => esc(c.label)).join(","),
      ...visible.map((r) => report.columns.map((c) => esc(c.csv ? c.csv(r) : r[c.key])).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${tab}-report.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 pb-10">
      {/* ------------------------ tabs + export buttons ------------------------ */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          {TAB_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => switchTab(k)}
              style={tab === k ? { backgroundColor: ACCENT } : undefined}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition active:scale-[.97] ${
                tab === k
                  ? "border-transparent text-white shadow-md shadow-rose-900/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {REPORTS[k].label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[.97]"
          >
            <Download size={16} /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[.97]"
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      {/* ------------------------------ date range ------------------------------ */}
      <div className={`mb-6 transition-opacity print:hidden ${usesDates ? "opacity-100" : "opacity-60"}`}>
        <div className="flex flex-wrap items-end gap-4">
          <DateField label="From" value={from} onChange={setFrom} max={to || undefined} />
          <DateField label="To" value={to} onChange={setTo} min={from || undefined} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <CalendarRange size={14} className="text-slate-400" />
          {[
            ["Last 7 days", 7],
            ["Last 30 days", 30],
            ["Last 90 days", 90],
            ["All time", 0],
          ].map(([label, d]) => (
            <button
              key={label}
              onClick={() => preset(d)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 transition hover:border-[#a3203c] hover:text-[#a3203c]"
            >
              {label}
            </button>
          ))}
          {!usesDates && <span className="text-slate-400">Dates don’t apply to the department report.</span>}
          {badRange && <span className="font-medium text-rose-600">The start date is after the end date.</span>}
        </div>
      </div>

      {/* -------------------------------- stat cards -------------------------------- */}
      <div key={tab} className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} loading={loading} />
        ))}
      </div>

      {/* ---------------------------------- table ---------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">{report.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {report.subtitle}
              {!loading && <span className="text-slate-400"> · {visible.length} {visible.length === 1 ? "row" : "rows"}</span>}
            </p>
            {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>

          <div className="relative w-full sm:w-64 print:hidden">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this report"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#a3203c] focus:bg-white focus:ring-4 focus:ring-rose-100"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/70">
                {report.columns.map((c) => {
                  const on = sort.key === c.key;
                  const Arrow = !on ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th key={c.key} className={`px-6 py-3 text-xs font-semibold ${c.num ? "text-left" : ""}`}>
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={`inline-flex items-center gap-1 transition-colors ${on ? "text-[#a3203c]" : "text-slate-700 hover:text-slate-900"}`}
                      >
                        {c.label}
                        <Arrow size={12} className={on ? "" : "opacity-40"} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {report.columns.map((c) => (
                      <td key={c.key} className="px-6 py-4">
                        <div className="h-4 w-full max-w-[110px] animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={report.columns.length}>
                    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                        <Inbox size={22} />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No records found</p>
                      <p className="text-xs text-slate-500">Try a wider date range or a different search.</p>
                      <button
                        onClick={() => { preset(0); setQuery(""); }}
                        className="mt-1 text-xs font-semibold text-[#a3203c] hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-rose-50/40">
                    {report.columns.map((c) => (
                      <td key={c.key} className={`px-6 py-4 tabular-nums ${c.strong ? "font-medium text-slate-900" : "text-slate-600"}`}>
                        {c.render ? c.render(r) : r[c.key] ?? "–"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}