import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowUpDown, X, Download, Undo2, CheckCircle2,
  SearchX, CalendarDays, CalendarCheck, Clock,
  CheckCircle, GraduationCap, AlertTriangle,
} from "lucide-react";

import { createExam, fetchExamReference, fetchExams, updateExam } from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import "../../../assets/styles/aisc-premium.css";

/* -------------------------------------------------------
   Server <-> page: status words and dates
------------------------------------------------------- */

// The page shows Active / Scheduled / Completed / Draft; the server stores draft / open / closed.
const toServerStatus = (status) => (status === "Draft" ? "draft" : status === "Completed" ? "closed" : "open");
const dayStart = (d) => new Date(`${d}T00:00:00`).toISOString();
const dayEnd = (d) => new Date(`${d}T23:59:59`).toISOString();
const describe = (err) => {
  const list = err.cause?.response?.data?.error?.errors;
  return list?.length ? list.map((e) => `${e.field}: ${e.message}`).join(" | ") : err.message;
};
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const STATUS_OPTIONS = ["Active", "Scheduled", "Completed", "Draft"];

const STATUS_STYLE = {
  Active: "bg-emerald-50 text-emerald-700",
  Scheduled: "bg-blue-50 text-blue-700",
  Completed: "bg-slate-100 text-slate-600",
  Draft: "bg-amber-50 text-amber-700",
};

const STATUS_DOT = {
  Active: "bg-emerald-500",
  Scheduled: "bg-blue-500",
  Completed: "bg-slate-400",
  Draft: "bg-amber-500",
};



const pageList = (total, current) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const numbers = [...new Set([
    1,
    total,
    current - 1,
    current,
    current + 1,
  ])]
    .filter((number) => number >= 1 && number <= total)
    .sort((a, b) => a - b);

  const result = [];

  numbers.forEach((number, index) => {
    if (index && number - numbers[index - 1] > 1) {
      result.push(`gap-${number}`);
    }
    result.push(number);
  });

  return result;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (value = "") => {
  const status = String(value).toLowerCase();

  if (status === "active" || status === "ongoing") return "Active";
  if (status === "completed" || status === "finished") return "Completed";
  if (status === "scheduled" || status === "upcoming") return "Scheduled";

  return "Draft";
};

const getSessionId = (session, index) =>
  session._id || session.id || `backend-session-${index}`;

const normalizeBackendSession = (session, index, lookups = {}) => {
  const opens = session.formOpensAt || session.startDate || "";
  const closes = session.formClosesAt || session.endDate || "";
  const status = normalizeStatus(
    session.status === "open" && opens && new Date(opens) > new Date() ? "scheduled"
      : session.status === "open" ? "active"
        : session.status === "closed" ? "completed" : session.status,
  );
  return {
    ...session,
    _id: getSessionId(session, index),
    name: session.name || session.examName || "Untitled Examination",
    programName: lookups.programs?.[session.programId] || session.programName || "—",
    semester: session.semester ? ROMAN[session.semester] || session.semester : "—",
    semesterNumber: session.semester,
    term: lookups.years?.[session.academicYearId] || session.term || "—",
    startDate: String(opens).slice(0, 10),
    endDate: String(closes).slice(0, 10),
    status,
    isDemo: false,
  };
};

/* -------------------------------------------------------
   REUSABLE COMPONENTS
------------------------------------------------------- */

function StatusBadge({ status }) {
  const label = status || "Draft";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLE[label] || STATUS_STYLE.Draft
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          STATUS_DOT[label] || STATUS_DOT.Draft
        }`}
      />
      {label}
    </span>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="fade absolute inset-0 cursor-default bg-[#14234b]/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        className={`pop relative my-auto w-full ${
          wide ? "max-w-xl" : "max-w-md"
        } overflow-hidden rounded-3xl bg-white shadow-2xl`}
      >
        <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#14234b]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  hint,
  selected,
  onClick,
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className="group relative flex w-full items-center gap-4 bg-[#14234b]/70 px-5 py-5 text-left backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2c200] sm:px-6"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 transition duration-300 group-hover:scale-110 ${
            selected
              ? "bg-[#f2c200] text-[#14234b] ring-[#f2c200]"
              : "bg-white/10 text-[#f2c200] ring-white/20 group-hover:bg-[#f2c200] group-hover:text-[#14234b]"
          }`}
        >
          <Icon size={22} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase sm:text-[11px]">
            {label}
          </span>

          <span className="mt-1 block font-['Playfair_Display',serif] text-3xl font-bold leading-none tabular-nums text-white">
            {value}
          </span>
        </span>

        <span className="hidden text-[11px] font-medium text-white/50 xl:block">
          {hint}
        </span>

        <span
          className={`absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#f2c200] transition-transform duration-300 ${
            selected ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </button>
    </li>
  );
}

/* -------------------------------------------------------
   SESSION FORM
------------------------------------------------------- */

function SessionForm({ initial, reference, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      programId: "",
      semester: "1",
      academicYearId: "",
      startDate: "",
      endDate: "",
      status: "Draft",
    }
  );

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  const submit = async (event) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.programId ||
      !form.academicYearId ||
      !form.startDate ||
      !form.endDate
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim() });
    } catch (err) {
      setError(describe(err)); // the form stays open so nothing typed is lost
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? "Edit Examination Session" : "Add Examination Session"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-4 px-6 pb-6 pt-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
            Session / Examination Name *
          </label>

          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="e.g. First Semester Examination 2026-27"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              Programme
            </label>

            <select
              className={inputClass}
              value={form.programId}
              onChange={(event) => set("programId", event.target.value)}
            >
              <option value="">Select a course...</option>
              {(reference?.programs ?? []).map((program) => (
                <option key={program._id} value={program._id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              Semester
            </label>

            <select
              className={inputClass}
              value={form.semester}
              onChange={(event) => set("semester", event.target.value)}
            >
              {Array.from({ length: 8 }, (_, i) => String(i + 1)).map((semester) => (
                <option key={semester} value={semester}>
                  Semester {ROMAN[Number(semester)]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
            Academic Term *
          </label>

          <select
            className={inputClass}
            value={form.academicYearId}
            onChange={(event) => set("academicYearId", event.target.value)}
          >
            <option value="">Select an academic year...</option>
            {(reference?.academicYears ?? []).map((year) => (
              <option key={year._id} value={year._id}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              Exam form opens *
            </label>

            <input
              type="date"
              className={inputClass}
              value={form.startDate}
              onChange={(event) => set("startDate", event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              Exam form closes *
            </label>

            <input
              type="date"
              className={inputClass}
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(event) => set("endDate", event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
            Session Status
          </label>

          <select
            className={inputClass}
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
            {error}
          </p>
        )}

        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
          Saved to the college database. Students can fill the exam form only
          while the session is Active and today is between the two dates.
        </p>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/20 transition hover:brightness-110"
          >
            {saving ? "Saving..." : initial ? "Save Changes" : "Add Session"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function ExamSessions() {
  const examsResource = useApiData(
    () => fetchExams(),
    "examination-sessions"
  );

  const backendExams = useMemo(() => examsResource.data ?? [], [examsResource.data]);

  // Courses and academic years: for the form dropdowns and to show names instead of ids.
  const referenceResource = useApiData(
    () => fetchExamReference(),
    "examination-reference"
  );
  const reference = referenceResource.data;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [termFilter, setTermFilter] = useState("All");

  const [sort, setSort] = useState({
    key: "startDate",
    dir: "desc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  /* Normalize API records and combine demo records */

  const lookups = useMemo(
    () => ({
      programs: Object.fromEntries((reference?.programs ?? []).map((p) => [p._id, p.name])),
      years: Object.fromEntries((reference?.academicYears ?? []).map((y) => [y._id, y.label])),
    }),
    [reference]
  );

  const databaseSessions = useMemo(
    () => backendExams.map((exam, index) => normalizeBackendSession(exam, index, lookups)),
    [backendExams, lookups]
  );

  const allSessions = databaseSessions;

  /* Statistics */

  const counts = useMemo(
    () => ({
      All: allSessions.length,
      Active: allSessions.filter((item) => item.status === "Active").length,
      Scheduled: allSessions.filter((item) => item.status === "Scheduled").length,
      Completed: allSessions.filter((item) => item.status === "Completed").length,
      Draft: allSessions.filter((item) => item.status === "Draft").length,
    }),
    [allSessions]
  );

  /* Term dropdown options */

  const terms = useMemo(() => {
    const uniqueTerms = [
      ...new Set(
        allSessions
          .map((session) => session.term)
          .filter((term) => term && term !== "—")
      ),
    ];

    return uniqueTerms.sort((a, b) => a.localeCompare(b));
  }, [allSessions]);

  /* Search, filter and sorting */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = allSessions.filter((session) => {
      const statusMatch =
        statusFilter === "All" || session.status === statusFilter;

      const termMatch =
        termFilter === "All" || session.term === termFilter;

      const searchMatch =
        !q ||
        [
          session._id,
          session.name,
          session.programName,
          session.semester,
          session.term,
          session.status,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );

      return statusMatch && termMatch && searchMatch;
    });

    return [...result].sort((a, b) => {
      const left = String(a[sort.key] ?? "");
      const right = String(b[sort.key] ?? "");

      const comparison = left.localeCompare(
        right,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );

      return sort.dir === "asc" ? comparison : -comparison;
    });
  }, [allSessions, query, statusFilter, termFilter, sort]);

  /* Pagination */

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const start = (page - 1) * pageSize;

  const rows = filtered.slice(
    start,
    start + pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, termFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* Toast notifications */

  const toast = (message, undo) => {
    const id = Date.now() + Math.random();

    setToasts((current) => [
      ...current,
      { id, message, undo },
    ]);

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((item) => item.id !== id)
      );
    }, 5500);
  };

  const dismissToast = (id) => {
    setToasts((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /* Sorting */

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            dir: current.dir === "asc" ? "desc" : "asc",
          }
        : {
            key,
            dir: "asc",
          }
    );
  };

  /* Add / Edit session */

  // Create or update the exam in the database. A failure is thrown to the form, which shows it.
  const saveSession = async (data) => {
    const target = modal?.session;
    const body = {
      name: data.name,
      academicYearId: data.academicYearId,
      programId: data.programId,
      semester: Number(data.semester),
      formOpensAt: dayStart(data.startDate),
      formClosesAt: dayEnd(data.endDate),
    };
    const status = toServerStatus(data.status);

    if (!target) {
      const created = await createExam(body); // a new exam starts as a draft
      if (status !== "draft") await updateExam(created._id, { status });
      toast(`${data.name} was added successfully.`);
    } else {
      await updateExam(target._id, { ...body, status });
      toast(`${data.name} was updated successfully.`);
    }
    setModal(null);
    examsResource.reload();
  };

  /* Delete session */

  const confirmDelete = () => {
    const target = modal?.session;

    if (!target) return;

    // The server never deletes an exam (results and forms point to it). It is closed instead.
    setModal({
      type: "backend-delete-info",
      session: target,
    });
  };

  /* Status change: Draft -> Active (open), Active or Scheduled -> Completed (closed), Completed -> Active */

  const changeStatus = async (session) => {
    const next =
      session.status === "Draft" ? "open"
        : session.status === "Completed" ? "open" : "closed";

    try {
      await updateExam(session._id, { status: next });
      toast(`${session.name}: status changed to ${next === "closed" ? "Completed" : "Active"}.`);
      examsResource.reload();
    } catch (err) {
      toast(describe(err));
    }
  };

  /* CSV Export */

  const exportCsv = () => {
    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const columns = [
      ["Session ID", "_id"],
      ["Session Name", "name"],
      ["Programme", "programName"],
      ["Semester", "semester"],
      ["Academic Term", "term"],
      ["Start Date", "startDate"],
      ["End Date", "endDate"],
      ["Status", "status"],
      ["Record Type", "isDemo"],
    ];

    const csv = [
      columns
        .map(([label]) => escapeCsv(label))
        .join(","),

      ...filtered.map((session) =>
        columns
          .map(([, key]) =>
            escapeCsv(
              key === "isDemo"
                ? session.isDemo
                  ? "Demo"
                  : "Database"
                : session[key]
            )
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "aisc-examination-sessions.csv";
    anchor.click();

    URL.revokeObjectURL(url);

    toast(`Exported ${filtered.length} examination sessions.`);
  };

  /* Clear filters */

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setTermFilter("All");
  };

  const filtersActive =
    Boolean(query) ||
    statusFilter !== "All" ||
    termFilter !== "All";

  const loading = examsResource.loading;

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  return (
    <div className="exam-sessions-page relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f7f3ef] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap');

        @keyframes rise {
          from { opacity: 0; transform: translateY(14px) }
          to { opacity: 1; transform: none }
        }

        @keyframes rowIn {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: none }
        }

        @keyframes pop {
          from { opacity: 0; transform: translateY(10px) scale(.97) }
          to { opacity: 1; transform: none }
        }

        @keyframes fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px) }
          to { opacity: 1; transform: none }
        }

        .exam-sessions-page .rise {
          animation: rise .55s cubic-bezier(.2,.7,.2,1) both;
        }

        .exam-sessions-page .row-in {
          animation: rowIn .35s ease both;
        }

        .exam-sessions-page .pop {
          animation: pop .25s cubic-bezier(.2,.7,.2,1) both;
        }

        .exam-sessions-page .fade {
          animation: fade .2s ease both;
        }

        .exam-sessions-page .toast-in {
          animation: toastIn .3s ease both;
        }

        .exam-sessions-page button:focus-visible,
        .exam-sessions-page input:focus-visible,
        .exam-sessions-page select:focus-visible {
          outline: 2px solid #f2c200;
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .exam-sessions-page .rise,
          .exam-sessions-page .row-in,
          .exam-sessions-page .pop,
          .exam-sessions-page .fade,
          .exam-sessions-page .toast-in {
            animation: none;
          }
        }
      `}</style>

      {/* Background decoration */}

      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8f0014]/10 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#14234b]/10 blur-3xl"
        aria-hidden="true"
      />

      <main className="relative flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">

        {/* Page heading */}

        <header className="rise mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[.22em] text-[#8f0014] uppercase">
              Examination Cell · Read to Lead
            </p>

           

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Create, organize and monitor examination sessions across
              academic terms and programmes.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#f2c200]/50 bg-white/80 px-4 py-2 text-xs font-semibold text-[#14234b] shadow-sm">
            <GraduationCap size={16} className="text-[#8f0014]" />
            Examination Administration
          </div>
        </header>

        {/* Statistics */}

        <section className="rise relative overflow-hidden rounded-3xl bg-[#14234b] shadow-xl">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#14234b]/95 via-[#1b2f63]/90 to-[#3a1230]/90"
            aria-hidden="true"
          />

          <span
            className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#8f0014]/30"
            aria-hidden="true"
          />

          <ul
            className="relative grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4"
            aria-label="Examination session statistics"
          >
            <StatItem
              icon={CalendarDays}
              label="Total Sessions"
              value={counts.All}
              hint="Show all"
              selected={statusFilter === "All"}
              onClick={() => setStatusFilter("All")}
            />

            <StatItem
              icon={CalendarCheck}
              label="Active Sessions"
              value={counts.Active}
              hint="Filter active"
              selected={statusFilter === "Active"}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "Active" ? "All" : "Active"
                )
              }
            />

            <StatItem
              icon={Clock}
              label="Scheduled Sessions"
              value={counts.Scheduled}
              hint="Filter scheduled"
              selected={statusFilter === "Scheduled"}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "Scheduled" ? "All" : "Scheduled"
                )
              }
            />

            <StatItem
              icon={CheckCircle}
              label="Completed Sessions"
              value={counts.Completed}
              hint="Filter completed"
              selected={statusFilter === "Completed"}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "Completed" ? "All" : "Completed"
                )
              }
            />
          </ul>

          <div className="relative h-1 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
        </section>

        {/* Main table panel */}

        <section
          className="rise mt-6 flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100"
          style={{ animationDelay: "120ms" }}
        >
          <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />

          {/* Toolbar */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex flex-wrap rounded-xl bg-slate-100 p-1"
                role="group"
                aria-label="Filter by status"
              >
                {["All", ...STATUS_OPTIONS].map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                      statusFilter === status
                        ? "bg-white text-[#14234b] shadow"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {status}
                    <span className="ml-1 tabular-nums text-slate-400">
                      {counts[status]}
                    </span>
                  </button>
                ))}
              </div>

              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#8f0014] transition hover:bg-[#8f0014]/10"
                >
                  <X size={13} />
                  Clear filters
                </button>
              )}
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <select
                value={termFilter}
                onChange={(event) => setTermFilter(event.target.value)}
                aria-label="Filter by academic term"
                className={`${inputClass} max-w-full sm:max-w-[210px]`}
              >
                <option value="All">All Academic Terms</option>

                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>

              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-[#8f0014] focus-within:ring-4 focus-within:ring-[#8f0014]/10 sm:w-48 sm:flex-none">
                <Search size={16} className="shrink-0 text-slate-400" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sessions..."
                  aria-label="Search examination sessions"
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={exportCsv}
                disabled={!filtered.length}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#14234b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} />
                Export
              </button>

              <button
                type="button"
                onClick={() => setModal({ type: "add" })}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/25 transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <Plus size={16} />
                Add Session
              </button>
            </div>
          </div>

          {/* Table */}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="bg-[#14234b]/[0.04] text-xs tracking-wide text-[#14234b]/70 uppercase">
                  {[
                    ["_id", "Session ID"],
                    ["name", "Examination Session"],
                    ["term", "Academic Term"],
                    ["startDate", "Start Date"],
                    ["endDate", "End Date"],
                    ["status", "Status"],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      scope="col"
                      className="px-5 py-3.5 font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1.5 uppercase transition hover:text-[#8f0014]"
                      >
                        {label}

                        {sort.key === key ? (
                          sort.dir === "asc" ? (
                            <ChevronUp
                              size={14}
                              className="text-[#8f0014]"
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                              className="text-[#8f0014]"
                            />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}

                  <th
                    scope="col"
                    className="px-5 py-3.5 text-right font-semibold"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: pageSize }).map((_, index) => (
                    <tr key={`loading-${index}`}>
                      {Array.from({ length: 7 }).map((__, cell) => (
                        <td key={cell} className="px-5 py-4">
                          <div
                            className="h-4 animate-pulse rounded bg-slate-100"
                            style={{
                              width: `${55 + ((index + cell) % 4) * 12}%`,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading &&
                  rows.map((session, index) => (
                    <tr
                      key={session._id}
                      className="row-in group transition hover:bg-[#14234b]/[0.03]"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      {/* Session ID */}

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xs font-bold text-white shadow ring-2 ring-white transition group-hover:scale-105">
                            <CalendarDays size={16} />
                          </span>

                          <span className="font-semibold tabular-nums text-[#14234b]">
                            {String(session._id).startsWith("session-demo-")
                              ? `SES-${String(session._id).slice(-3)}`
                              : String(session._id).slice(-8)}
                          </span>
                        </div>
                      </td>

                      {/* Session name */}

                      <td className="px-5 py-3.5">
                        <span className="block max-w-[230px] truncate font-semibold text-[#14234b]">
                          {session.name}
                        </span>

                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {session.programName || "Programme not specified"}
                          {session.semester && session.semester !== "—"
                            ? ` · Semester ${session.semester}`
                            : ""}
                        </span>
                      </td>

                      {/* Academic term */}

                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-600">
                          {session.term || "—"}
                        </span>
                      </td>

                      {/* Start date */}

                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(session.startDate)}
                      </td>

                      {/* End date */}

                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(session.endDate)}
                      </td>

                      {/* Status */}

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => changeStatus(session)}
                            title="Click to change the status"
                            className="rounded-full transition hover:scale-105"
                          >
                            <StatusBadge status={session.status} />
                          </button>

                          {session.isDemo && (
                            <span className="rounded-full bg-[#f2c200]/20 px-2 py-1 text-[10px] font-bold text-[#946500]">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}

                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                type: "view",
                                session,
                              })
                            }
                            aria-label={`View ${session.name}`}
                            title="View"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#14234b]/10 hover:text-[#14234b]"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                type: "edit",
                                session,
                              })
                            }
                            aria-label={`Edit ${session.name}`}
                            title="Edit"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#f2c200]/25 hover:text-[#946500]"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                type: "delete",
                                session,
                              })
                            }
                            aria-label={`Delete ${session.name}`}
                            title="Delete"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Empty state */}

            {!loading && rows.length === 0 && (
              <div className="grid place-items-center px-6 py-16 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <SearchX size={28} />
                </span>

                <p className="mt-4 font-['Playfair_Display',serif] text-lg font-bold text-[#14234b]">
                  No examination sessions found
                </p>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {filtersActive
                    ? "Try a different search or clear the filters."
                    : "Add an examination session to get started."}
                </p>

                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {filtered.length === 0
                  ? "No results"
                  : `Showing ${start + 1}–${Math.min(
                      start + pageSize,
                      filtered.length
                    )} of ${filtered.length} sessions`}
              </span>

              <label className="flex items-center gap-2">
                <span className="sr-only">Rows per page</span>

                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value))
                  }
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-[#8f0014]/20"
                >
                  {[5, 10, 20].map((number) => (
                    <option key={number} value={number}>
                      {number} / page
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <nav
              className="flex items-center gap-1.5"
              aria-label="Pagination"
            >
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={page === 1}
                aria-label="Previous page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {pageList(totalPages, page).map((number) =>
                typeof number === "string" ? (
                  <span
                    key={number}
                    className="px-1 text-slate-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={number}
                    onClick={() => setPage(number)}
                    aria-current={number === page ? "page" : undefined}
                    className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition ${
                      number === page
                        ? "bg-gradient-to-b from-[#a30018] to-[#6d000f] text-white shadow-md shadow-[#8f0014]/30"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {number}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page === totalPages}
                aria-label="Next page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </section>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          Demo sessions are sample records for preview only. Database
          examination records are fetched through the examination API.
        </p>
      </main>

      {/* Add / Edit session */}

      {(modal?.type === "add" || modal?.type === "edit") && (
          <SessionForm
            initial={
              modal.type === "edit"
                ? {
                    name: modal.session.name || "",
                    programId: modal.session.programId || "",
                    semester: String(modal.session.semesterNumber || 1),
                    academicYearId: modal.session.academicYearId || "",
                    startDate: modal.session.startDate || "",
                    endDate: modal.session.endDate || "",
                    status: modal.session.status || "Draft",
                  }
                : null
            }
            reference={reference}
            onSave={saveSession}
            onClose={() => setModal(null)}
          />
      )}

      {/* View session details */}

      {modal?.type === "view" && (
        <Modal
          title="Examination Session Details"
          onClose={() => setModal(null)}
          wide
        >
          <div className="px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xl font-bold text-white shadow-lg ring-4 ring-[#f2c200]/40">
                <CalendarDays size={28} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#14234b]">
                  {modal.session.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {modal.session.programName} · Semester{" "}
                  {modal.session.semester}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={modal.session.status} />

                  {modal.session.isDemo && (
                    <span className="rounded-full bg-[#f2c200]/20 px-2 py-1 text-[10px] font-bold text-[#946500]">
                      DEMO RECORD
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-cols-3">
              {[
                ["Session ID", modal.session._id],
                ["Academic Term", modal.session.term],
                ["Programme", modal.session.programName],
                ["Semester", modal.session.semester],
                ["Start Date", formatDate(modal.session.startDate)],
                ["End Date", formatDate(modal.session.endDate)],
                ["Status", modal.session.status],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    {label}
                  </p>

                  <p className="mt-1 break-words text-sm font-bold text-[#14234b]">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>

            {modal.session.isDemo && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                This is a sample demo record. It is not stored in the
                college database.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() =>
                  setModal({
                    type: "edit",
                    session: modal.session,
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
              >
                <Pencil size={15} />
                Edit
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}

      {modal?.type === "delete" && (
        <Modal
          title="Delete examination session?"
          onClose={() => setModal(null)}
        >
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 size={22} />
              </span>

              <p className="text-sm leading-relaxed text-slate-600">
                {modal.session.isDemo ? (
                  <>
                    You are about to delete the demo session{" "}
                    <strong className="text-[#14234b]">
                      {modal.session.name}
                    </strong>
                    . You can undo this action immediately.
                  </>
                ) : (
                  <>
                    This session is stored in the college database.
                    A delete API has not been confirmed, so this record
                    cannot be deleted from the database through this page.
                  </>
                )}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              {modal.session.isDemo && (
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"
                >
                  Delete Session
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Backend delete information */}

      {modal?.type === "backend-delete-info" && (
        <Modal
          title="Backend API required"
          onClose={() => setModal(null)}
        >
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle size={22} />
              </span>

              <p className="text-sm leading-relaxed text-slate-600">
                The available frontend service functions do not confirm
                a delete operation for examination sessions. A backend
                delete API is required before database records can be
                deleted safely.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl bg-[#14234b] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
              >
                Got it
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast notifications */}

      <div
        className="fixed bottom-5 right-5 z-[90] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className="toast-in flex items-center gap-3 rounded-xl bg-[#14234b] px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-[#f2c200]/30"
          >
            <CheckCircle2
              size={18}
              className="shrink-0 text-[#6ee7a0]"
            />

            <span className="flex-1">
              {item.message}
            </span>

            {item.undo && (
              <button
                type="button"
                onClick={() => {
                  item.undo();
                  dismissToast(item.id);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold transition hover:bg-white/25"
              >
                <Undo2 size={13} />
                Undo
              </button>
            )}

            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Dismiss notification"
              className="text-white/60 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}