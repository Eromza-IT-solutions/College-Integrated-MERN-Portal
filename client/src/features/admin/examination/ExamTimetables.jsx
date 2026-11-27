import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ArrowUpDown, X, Download, Undo2, CheckCircle2,
  SearchX, CalendarDays, CalendarCheck, Clock,
  CheckCircle, GraduationCap, AlertTriangle,
  BookOpen, MapPin, Save, RefreshCw,
} from "lucide-react";

import {
  fetchExamReference,
  fetchExams,
  updateExam,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import "../../../assets/styles/aisc-premium.css";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const STATUS_STYLE = {
  Upcoming: "bg-blue-50 text-blue-700",
  Today: "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const STATUS_DOT = {
  Upcoming: "bg-blue-500",
  Today: "bg-amber-500",
  Completed: "bg-emerald-500",
};

const pageList = (total, current) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const numbers = [...new Set([
    1, total, current - 1, current, current + 1,
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

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRowStatus = (date) => {
  if (!date) return "Upcoming";

  const today = getToday();
  const normalized = String(date).slice(0, 10);

  if (normalized < today) return "Completed";
  if (normalized === today) return "Today";

  return "Upcoming";
};

const getSessionId = (session) => session?._id || session?.id;

const getExamName = (exam) =>
  exam?.name || exam?.examName || exam?.title || "Untitled Examination";

const getSubjectId = (subject) =>
  subject?._id || subject?.id || subject?.subjectId || "";

const getSubjectName = (subject) =>
  subject?.name ||
  subject?.subjectName ||
  subject?.title ||
  subject?.code ||
  "";

const getArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const getReferenceSubjects = (reference) => {
  const data = reference?.data ?? reference ?? {};

  const candidates = [
    data?.subjects,
    data?.data?.subjects,
    data?.references?.subjects,
    data?.result?.subjects,
    data?.data,
  ];

  for (const candidate of candidates) {
    const items = getArray(candidate);
    if (items.length) return items;
  }

  return [];
};

const normalizeScheduleRow = (row, index) => ({
  ...row,
  _rowId: row._rowId || row._id || `schedule-row-${index}`,
  subjectId: row.subjectId?._id || row.subjectId?.id || row.subjectId || "",
  date: row.date ? String(row.date).slice(0, 10) : "",
  startTime: row.startTime || "",
  endTime: row.endTime || "",
  room: row.room || "",
});

/* -------------------------------------------------------
   DEMO TIMETABLE DATA
------------------------------------------------------- */

const createDemoSchedule = (subjects = []) => {
  const today = new Date();

  const getDate = (offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const demoSubjects = subjects.slice(0, 5);

  const sampleRows = [
    {
      date: getDate(2),
      startTime: "10:00",
      endTime: "13:00",
      room: "Room 201",
    },
    {
      date: getDate(3),
      startTime: "10:00",
      endTime: "13:00",
      room: "Room 202",
    },
    {
      date: getDate(4),
      startTime: "14:00",
      endTime: "17:00",
      room: "Computer Lab 1",
    },
    {
      date: getDate(-2),
      startTime: "10:00",
      endTime: "13:00",
      room: "Room 203",
    },
    {
      date: getDate(0),
      startTime: "14:00",
      endTime: "17:00",
      room: "Room 204",
    },
  ];

  return sampleRows.map((row, index) => ({
    ...row,
    subjectId: demoSubjects[index]
      ? String(getSubjectId(demoSubjects[index]))
      : `DEMO-SUB-${index + 1}`,
    _rowId: `demo-${index + 1}`,
    isDemo: true,
  }));
};

const getSubjectLabel = (subjectId, subjects) => {
  const subject = subjects.find(
    (item) => String(getSubjectId(item)) === String(subjectId)
  );

  return subject
    ? getSubjectName(subject) || String(subjectId)
    : String(subjectId || "Subject not specified");
};

const escapeCsv = (value) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

/* -------------------------------------------------------
   REUSABLE COMPONENTS
------------------------------------------------------- */

function StatusBadge({ status }) {
  const label = status || "Upcoming";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLE[label] || STATUS_STYLE.Upcoming
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          STATUS_DOT[label] || STATUS_DOT.Upcoming
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

function StatItem({ icon: Icon, label, value, hint, selected, onClick }) {
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
   TIMETABLE FORM
------------------------------------------------------- */

function TimetableForm({
  initial,
  subjects,
  existingRows,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(
    initial || {
      subjectId: "",
      date: "",
      startTime: "",
      endTime: "",
      room: "",
    }
  );

  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();

    if (
      !String(form.subjectId).trim() ||
      !form.date ||
      !form.startTime ||
      !form.endTime ||
      !form.room.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.endTime <= form.startTime) {
      setError("End time must be later than start time.");
      return;
    }

    const duplicate = existingRows.some(
      (row) =>
        String(row.subjectId) === String(form.subjectId) &&
        row._rowId !== initial?._rowId
    );

    if (duplicate) {
      setError("This subject is already added to the timetable.");
      return;
    }

    setError("");

    onSave({
      ...form,
      subjectId: String(form.subjectId).trim(),
      room: form.room.trim(),
    });
  };

  return (
    <Modal
      title={initial ? "Edit Timetable Entry" : "Add Timetable Entry"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-4 px-6 pb-6 pt-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
            Subject *
          </label>

          {subjects.length > 0 ? (
            <select
              className={inputClass}
              value={form.subjectId}
              onChange={(event) => set("subjectId", event.target.value)}
            >
              <option value="">Select Subject</option>

              {subjects.map((subject, index) => {
                const id = getSubjectId(subject);
                const name = getSubjectName(subject);

                return (
                  <option key={id || index} value={id}>
                    {name || `Subject ${index + 1}`}
                    {subject.code ? ` (${subject.code})` : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              className={inputClass}
              value={form.subjectId}
              onChange={(event) => set("subjectId", event.target.value)}
              placeholder="Enter subject ID"
            />
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
            Examination Date *
          </label>

          <input
            type="date"
            className={inputClass}
            value={form.date}
            onChange={(event) => set("date", event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              Start Time *
            </label>

            <input
              type="time"
              className={inputClass}
              value={form.startTime}
              onChange={(event) => set("startTime", event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
              End Time *
            </label>

            <input
              type="time"
              className={inputClass}
              min={form.startTime || undefined}
              value={form.endTime}
              onChange={(event) => set("endTime", event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
            Examination Room *
          </label>

          <input
            className={inputClass}
            value={form.room}
            onChange={(event) => set("room", event.target.value)}
            placeholder="e.g. Room 204 / Computer Lab 1"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
            {error}
          </p>
        )}

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
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/20 transition hover:brightness-110"
          >
            <CheckCircle2 size={16} />
            {initial ? "Save Changes" : "Add Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function ExamTimetables() {
  const examsResource = useApiData(
    () => fetchExams(),
    "examination-timetables"
  );

  const referenceResource = useApiData(
    () => fetchExamReference(),
    "examination-timetable-reference"
  );

  const exams = useMemo(
    () => getArray(examsResource.data),
    [examsResource.data]
  );

  const subjects = useMemo(
    () => getReferenceSubjects(referenceResource.data),
    [referenceResource.data]
  );

  const [selectedExamId, setSelectedExamId] = useState("");
  const [schedule, setSchedule] = useState([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [sort, setSort] = useState({
    key: "date",
    dir: "asc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const activeExam = useMemo(
    () =>
      exams.find(
        (exam) => String(getSessionId(exam)) === String(selectedExamId)
      ) || null,
    [exams, selectedExamId]
  );

  /* Select first available exam */

  useEffect(() => {
    if (!exams.length) {
      setSelectedExamId("");
      return;
    }

    const exists = exams.some(
      (exam) => String(getSessionId(exam)) === String(selectedExamId)
    );

    if (!exists) {
      setSelectedExamId(String(getSessionId(exams[0])));
    }
  }, [exams, selectedExamId]);

  /* Load saved schedule or demo schedule */

  useEffect(() => {
    if (!activeExam) {
      setSchedule([]);
      setIsDemo(false);
      setSaved(false);
      return;
    }

    const currentSchedule = Array.isArray(activeExam.schedule)
      ? activeExam.schedule
      : [];

    if (currentSchedule.length > 0) {
      setSchedule(currentSchedule.map(normalizeScheduleRow));
      setIsDemo(false);
      setSaved(true);
    } else {
      setSchedule(createDemoSchedule(subjects));
      setIsDemo(true);
      setSaved(false);
    }
  }, [activeExam, subjects]);

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

  /* Add / Edit entry */

  const saveEntry = (data) => {
    const target = modal?.entry;

    if (target) {
      setSchedule((current) =>
        current.map((row) =>
          row._rowId === target._rowId
            ? { ...row, ...data, isDemo: false }
            : row
        )
      );

      setIsDemo(false);
      setSaved(false);
      toast("Timetable entry updated.");
    } else {
      setSchedule((current) => [
        ...current,
        {
          ...data,
          _rowId: `new-${Date.now()}-${Math.random()}`,
          isDemo: false,
        },
      ]);

      setIsDemo(false);
      setSaved(false);
      toast("Timetable entry added.");
    }

    setModal(null);
  };

  /* Delete entry */

  const confirmDelete = () => {
    const target = modal?.entry;
    if (!target) return;

    const index = schedule.findIndex(
      (row) => row._rowId === target._rowId
    );

    setSchedule((current) =>
      current.filter((row) => row._rowId !== target._rowId)
    );

    setIsDemo(false);
    setSaved(false);

    toast("Timetable entry deleted.", () => {
      setSchedule((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, target);
        return next;
      });

      setIsDemo(false);
      setSaved(false);
    });

    setModal(null);
  };

  /* Save schedule to database */

  const saveSchedule = async () => {
    if (!activeExam) {
      toast("Please select an examination session first.");
      return;
    }

    const invalid = schedule.some(
      (row) =>
        !row.subjectId ||
        !row.date ||
        !row.startTime ||
        !row.endTime ||
        !row.room
    );

    if (invalid) {
      toast("Please complete all timetable entries before saving.");
      return;
    }

    const duplicateSubjects = schedule.filter(
      (row, index) =>
        schedule.findIndex(
          (other) =>
            String(other.subjectId) === String(row.subjectId)
        ) !== index
    );

    if (duplicateSubjects.length) {
      toast("Duplicate subjects found. Please check the timetable.");
      return;
    }

    setSaving(true);

    try {
      const payload = schedule.map(
        ({ _rowId, isDemo: _isDemo, ...row }) => ({
          subjectId: row.subjectId,
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          room: row.room,
        })
      );

      await updateExam(getSessionId(activeExam), {
        schedule: payload,
      });

      setIsDemo(false);
      setSaved(true);
      toast("Examination timetable saved successfully.");
    } catch (error) {
      console.error("Timetable save failed:", error);

      toast(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to save timetable. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* Statistics */

  const counts = useMemo(() => ({
    All: schedule.length,
    Upcoming: schedule.filter(
      (row) => getRowStatus(row.date) === "Upcoming"
    ).length,
    Today: schedule.filter(
      (row) => getRowStatus(row.date) === "Today"
    ).length,
    Completed: schedule.filter(
      (row) => getRowStatus(row.date) === "Completed"
    ).length,
  }), [schedule]);

  /* Search, filter and sorting */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = schedule.filter((row) => {
      const status = getRowStatus(row.date);

      const statusMatch =
        statusFilter === "All" || status === statusFilter;

      const subjectName = getSubjectLabel(row.subjectId, subjects);

      const searchMatch =
        !q ||
        [
          subjectName,
          row.subjectId,
          row.date,
          row.startTime,
          row.endTime,
          row.room,
          status,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );

      return statusMatch && searchMatch;
    });

    return [...result].sort((a, b) => {
      const left = String(a[sort.key] ?? "");
      const right = String(b[sort.key] ?? "");

      const comparison = left.localeCompare(
        right,
        undefined,
        { numeric: true, sensitivity: "base" }
      );

      return sort.dir === "asc" ? comparison : -comparison;
    });
  }, [schedule, query, statusFilter, sort, subjects]);

  /* Pagination */

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, selectedExamId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* Sorting */

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            dir: current.dir === "asc" ? "desc" : "asc",
          }
        : { key, dir: "asc" }
    );
  };

  /* CSV Export */

  const exportCsv = () => {
    const columns = [
      ["Subject", "subject"],
      ["Subject ID", "subjectId"],
      ["Examination Date", "date"],
      ["Start Time", "startTime"],
      ["End Time", "endTime"],
      ["Room", "room"],
      ["Status", "status"],
    ];

    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(","),
      ...filtered.map((row) =>
        columns.map(([, key]) => {
          let value = row[key];

          if (key === "subject") {
            value = getSubjectLabel(row.subjectId, subjects);
          }

          if (key === "status") {
            value = getRowStatus(row.date);
          }

          return escapeCsv(value);
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "aisc-examination-timetable.csv";
    anchor.click();

    URL.revokeObjectURL(url);

    toast(`Exported ${filtered.length} timetable entries.`);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
  };

  const filtersActive = Boolean(query) || statusFilter !== "All";

  const loading = examsResource.loading || referenceResource.loading;

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  return (
    <div className="exam-timetables-page relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f7f3ef] font-['Poppins',sans-serif] text-slate-700">
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

        .exam-timetables-page .rise {
          animation: rise .55s cubic-bezier(.2,.7,.2,1) both;
        }

        .exam-timetables-page .row-in {
          animation: rowIn .35s ease both;
        }

        .exam-timetables-page .pop {
          animation: pop .25s cubic-bezier(.2,.7,.2,1) both;
        }

        .exam-timetables-page .fade {
          animation: fade .2s ease both;
        }

        .exam-timetables-page .toast-in {
          animation: toastIn .3s ease both;
        }

        .exam-timetables-page button:focus-visible,
        .exam-timetables-page input:focus-visible,
        .exam-timetables-page select:focus-visible {
          outline: 2px solid #f2c200;
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .exam-timetables-page .rise,
          .exam-timetables-page .row-in,
          .exam-timetables-page .pop,
          .exam-timetables-page .fade,
          .exam-timetables-page .toast-in {
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
              Prepare, organize and manage subject-wise examination
              schedules, timings and examination venues.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#f2c200]/50 bg-white/80 px-4 py-2 text-xs font-semibold text-[#14234b] shadow-sm">
            <GraduationCap size={16} className="text-[#8f0014]" />
            Examination Administration
          </div>
        </header>

        {/* Statistics */}

        <section className="rise relative overflow-hidden rounded-3xl bg-[#14234b] shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#14234b]/95 via-[#1b2f63]/90 to-[#3a1230]/90" />

          <span className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#8f0014]/30" />

          <ul className="relative grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
            <StatItem
              icon={CalendarDays}
              label="Total Papers"
              value={counts.All}
              hint="Show all"
              selected={statusFilter === "All"}
              onClick={() => setStatusFilter("All")}
            />

            <StatItem
              icon={CalendarCheck}
              label="Upcoming Papers"
              value={counts.Upcoming}
              hint="Filter upcoming"
              selected={statusFilter === "Upcoming"}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "Upcoming" ? "All" : "Upcoming"
                )
              }
            />

            <StatItem
              icon={Clock}
              label="Today's Papers"
              value={counts.Today}
              hint="Filter today"
              selected={statusFilter === "Today"}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "Today" ? "All" : "Today"
                )
              }
            />

            <StatItem
              icon={CheckCircle}
              label="Completed Papers"
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

        {/* Main panel */}

        <section
          className="rise mt-6 flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100"
          style={{ animationDelay: "120ms" }}
        >
          <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />

          {/* Exam selector */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#14234b]/[0.025] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#14234b] text-[#f2c200]">
                <BookOpen size={19} />
              </span>

              <div>
                <p className="text-[10px] font-bold tracking-wider text-[#8f0014] uppercase">
                  Selected Examination
                </p>
                <p className="text-sm font-semibold text-[#14234b]">
                  Choose an examination session
                </p>
              </div>
            </div>

            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              aria-label="Select examination session"
              className={`${inputClass} w-full sm:max-w-[390px]`}
              disabled={!exams.length}
            >
              {!exams.length && (
                <option value="">No examination sessions available</option>
              )}

              {exams.map((exam, index) => {
                const id = getSessionId(exam);

                return (
                  <option key={id || index} value={id}>
                    {getExamName(exam)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected exam details */}

          {activeExam && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <p className="font-['Playfair_Display',serif] text-lg font-bold text-[#14234b]">
                  {getExamName(activeExam)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {activeExam.programName || activeExam.program || "Programme"}
                  {activeExam.semester
                    ? ` · Semester ${activeExam.semester}`
                    : ""}
                  {activeExam.term || activeExam.academicTerm
                    ? ` · ${activeExam.term || activeExam.academicTerm}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isDemo && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    Demo Preview
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    saved
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      saved ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {saved ? "Saved" : "Unsaved changes"}
                </span>
              </div>
            </div>
          )}

          {/* Toolbar */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex flex-wrap rounded-xl bg-slate-100 p-1"
                role="group"
                aria-label="Filter timetable by status"
              >
                {["All", "Upcoming", "Today", "Completed"].map((status) => (
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
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-[#8f0014] focus-within:ring-4 focus-within:ring-[#8f0014]/10 sm:w-48 sm:flex-none">
                <Search size={16} className="shrink-0 text-slate-400" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search timetable..."
                  aria-label="Search timetable"
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
                disabled={!activeExam}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/25 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                Add Paper
              </button>
            </div>
          </div>

          {/* Table */}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="bg-[#14234b]/[0.04] text-xs tracking-wide text-[#14234b]/70 uppercase">
                  {[
                    ["subjectId", "Subject"],
                    ["date", "Exam Date"],
                    ["startTime", "Start Time"],
                    ["endTime", "End Time"],
                    ["room", "Examination Room"],
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
                            <ChevronUp size={14} className="text-[#8f0014]" />
                          ) : (
                            <ChevronDown size={14} className="text-[#8f0014]" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}

                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Status
                  </th>

                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">
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
                  rows.map((row, index) => (
                    <tr
                      key={row._rowId}
                      className="row-in group transition hover:bg-[#14234b]/[0.03]"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-[#f2c200] shadow ring-2 ring-white transition group-hover:scale-105">
                            <BookOpen size={17} />
                          </span>

                          <div className="min-w-0">
                            <span className="block max-w-[220px] truncate font-semibold text-[#14234b]">
                              {getSubjectLabel(row.subjectId, subjects)}
                            </span>

                            <span className="mt-0.5 block text-[10px] text-slate-400">
                              Subject ID: {String(row.subjectId).slice(-8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[#14234b]">
                          {formatDate(row.date)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Clock size={14} className="text-[#8f0014]" />
                          {row.startTime || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {row.endTime || "—"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          <MapPin size={13} className="text-[#8f0014]" />
                          {row.room || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={getRowStatus(row.date)} />
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "view", entry: row })
                            }
                            aria-label="View timetable entry"
                            title="View"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#14234b]/10 hover:text-[#14234b]"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "edit", entry: row })
                            }
                            aria-label="Edit timetable entry"
                            title="Edit"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#f2c200]/25 hover:text-[#946500]"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "delete", entry: row })
                            }
                            aria-label="Delete timetable entry"
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
                  {schedule.length
                    ? "No timetable entries found"
                    : "No timetable entries yet"}
                </p>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {filtersActive
                    ? "Try a different search or clear the filters."
                    : "Add subject-wise examination dates and timings to create the timetable."}
                </p>

                {filtersActive ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Clear filters
                  </button>
                ) : activeExam ? (
                  <button
                    type="button"
                    onClick={() => setModal({ type: "add" })}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  >
                    <Plus size={15} />
                    Add First Paper
                  </button>
                ) : null}
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
                    )} of ${filtered.length} papers`}
              </span>

              <label className="flex items-center gap-2">
                <span className="sr-only">Rows per page</span>

                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
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

            <nav className="flex items-center gap-1.5" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {pageList(totalPages, page).map((number) =>
                typeof number === "string" ? (
                  <span key={number} className="px-1 text-slate-400">…</span>
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
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </section>

        {/* Save footer */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f2c200]/30 bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertTriangle size={15} className="shrink-0 text-[#946500]" />

            <span>
              {isDemo
                ? "You are viewing sample timetable data. Save to submit it to the database."
                : "Remember to save your timetable changes to the college database."}
            </span>
          </div>

          <button
            type="button"
            onClick={saveSchedule}
            disabled={!activeExam || saving || saved}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/20 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}

            {saving
              ? "Saving..."
              : saved
                ? "Changes Saved"
                : "Save Timetable"}
          </button>
        </div>
      </main>

      {/* Add / Edit */}

      {(modal?.type === "add" || modal?.type === "edit") && (
        <TimetableForm
          initial={modal.type === "edit" ? modal.entry : null}
          subjects={subjects}
          existingRows={schedule}
          onSave={saveEntry}
          onClose={() => setModal(null)}
        />
      )}

      {/* View details */}

      {modal?.type === "view" && (
        <Modal
          title="Examination Paper Details"
          onClose={() => setModal(null)}
          wide
        >
          <div className="px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xl font-bold text-[#f2c200] shadow-lg ring-4 ring-[#f2c200]/40">
                <BookOpen size={28} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#14234b]">
                  {getSubjectLabel(modal.entry.subjectId, subjects)}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {getExamName(activeExam || {})}
                </p>

                <div className="mt-2">
                  <StatusBadge status={getRowStatus(modal.entry.date)} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Subject ID", modal.entry.subjectId],
                ["Examination Date", formatDate(modal.entry.date)],
                ["Start Time", modal.entry.startTime],
                ["End Time", modal.entry.endTime],
                ["Examination Room", modal.entry.room],
                ["Status", getRowStatus(modal.entry.date)],
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
                  setModal({ type: "edit", entry: modal.entry })
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
              >
                <Pencil size={15} />
                Edit Entry
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}

      {modal?.type === "delete" && (
        <Modal
          title="Delete timetable entry?"
          onClose={() => setModal(null)}
        >
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 size={22} />
              </span>

              <p className="text-sm leading-relaxed text-slate-600">
                You are about to remove{" "}
                <strong className="text-[#14234b]">
                  {getSubjectLabel(modal.entry.subjectId, subjects)}
                </strong>{" "}
                from this timetable. You can undo this action immediately.
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

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"
              >
                Delete Entry
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
            <CheckCircle2 size={18} className="shrink-0 text-[#6ee7a0]" />

            <span className="flex-1">{item.message}</span>

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