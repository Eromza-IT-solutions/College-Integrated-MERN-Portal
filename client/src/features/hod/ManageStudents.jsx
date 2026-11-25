import { useEffect, useMemo, useState } from "react";
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
  Undo2,
  CheckCircle2,
  SearchX,
  GraduationCap,
  AlertTriangle,
  Users,
  CheckCircle,
  Clock,
  Ban,
  Award,
  FilePen,
} from "lucide-react";

import * as adminApi from "../../services/adminApi";
import { useApiData } from "../../hooks/useApiData";
import "../../assets/styles/aisc-premium.css";

/* -------------------------------------------------------
   DEMO DATA
------------------------------------------------------- */

const SEED_STUDENTS = [
  {"_id": "students-demo-001", "name": "Demo Student 01", "rollNo": "DEMO-001", "semester": "V", "email": "student01@example.com", "programName": "B.Com CA", "status": "Active", "isDemo": true},
  {"_id": "students-demo-002", "name": "Demo Student 02", "rollNo": "DEMO-002", "semester": "V", "email": "student02@example.com", "programName": "B.Com CA", "status": "Active", "isDemo": true},
  {"_id": "students-demo-003", "name": "Demo Student 03", "rollNo": "DEMO-003", "semester": "III", "email": "student03@example.com", "programName": "B.Com CA", "status": "On Leave", "isDemo": true},
  {"_id": "students-demo-004", "name": "Demo Student 04", "rollNo": "DEMO-004", "semester": "III", "email": "student04@example.com", "programName": "B.Com CA", "status": "Active", "isDemo": true},
  {"_id": "students-demo-005", "name": "Demo Student 05", "rollNo": "DEMO-005", "semester": "I", "email": "student05@example.com", "programName": "B.Com CA", "status": "Inactive", "isDemo": true},
  {"_id": "students-demo-006", "name": "Demo Student 06", "rollNo": "DEMO-006", "semester": "I", "email": "student06@example.com", "programName": "B.Com CA", "status": "Active", "isDemo": true},
  {"_id": "students-demo-007", "name": "Demo Student 07", "rollNo": "DEMO-007", "semester": "V", "email": "student07@example.com", "programName": "B.Com CA", "status": "Active", "isDemo": true},
];

const SEED_PERFORMANCE = [
  {"_id": "performance-demo-001", "name": "Demo Student 01", "rollNo": "DEMO-001", "semester": "V", "percentage": 82, "programName": "B.Com CA", "status": "On Track", "isDemo": true},
  {"_id": "performance-demo-002", "name": "Demo Student 02", "rollNo": "DEMO-002", "semester": "V", "percentage": 67, "programName": "B.Com CA", "status": "On Track", "isDemo": true},
  {"_id": "performance-demo-003", "name": "Demo Student 03", "rollNo": "DEMO-003", "semester": "V", "percentage": 38, "programName": "B.Com CA", "status": "Needs Support", "isDemo": true},
  {"_id": "performance-demo-004", "name": "Demo Student 04", "rollNo": "DEMO-004", "semester": "V", "percentage": 74, "programName": "B.Com CA", "status": "On Track", "isDemo": true},
  {"_id": "performance-demo-005", "name": "Demo Student 05", "rollNo": "DEMO-005", "semester": "V", "percentage": 41, "programName": "B.Com CA", "status": "Needs Support", "isDemo": true},
  {"_id": "performance-demo-006", "name": "Demo Student 06", "rollNo": "DEMO-006", "semester": "V", "percentage": 58, "programName": "B.Com CA", "status": "Draft", "isDemo": true},
];

/* -------------------------------------------------------
   TAB CONFIGURATION
------------------------------------------------------- */

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI"];

const CONFIG = {
  students: {
    label: "Students",
    singular: "Student",
    noun: "students",
    icon: Users,
    idPrefix: "STU",
    demoPrefix: "students-demo-",
    derive: (record) => record,
    validate: () => "",
    subtitle: (record) =>
      [record.rollNo, record.programName].filter(Boolean).join(" · "),
    filterKey: "semester",
    filterAll: "All Semesters",
    filterLabel: "Filter by semesters",
    filterText: (value) => `Semester ${value}`,
    defaultSort: { key: "rollNo", dir: "asc" },
    statuses: ["Active", "On Leave", "Inactive"],
    stats: [
      ["All", "Total Students", Users, "Show all"],
      ["Active", "Active", CheckCircle, "Filter active"],
      ["On Leave", "On Leave", Clock, "Filter on leave"],
      ["Inactive", "Inactive", Ban, "Filter inactive"],
    ],
    columns: [
      ["_id", "Student ID"],
      ["name", "Student"],
      ["rollNo", "Roll Number"],
      ["semester", "Semester"],
      ["email", "Email"],
      ["status", "Status"],
    ],
    fields: [
      {"key": "name", "label": "Student Name", "required": true, "full": true},
      {"key": "rollNo", "label": "Roll Number", "required": true},
      {"key": "semester", "label": "Semester", "required": true, "options": ["I", "II", "III", "IV", "V", "VI"]},
      {"key": "email", "label": "Email", "required": true, "type": "email"},
      {"key": "programName", "label": "Programme", "required": true},
      {"key": "status", "label": "Status", "options": ["Active", "On Leave", "Inactive"], "full": true},
    ],
    blank: {"name": "", "rollNo": "", "semester": "I", "email": "", "programName": "B.Com CA", "status": "Active"},
    details: [["Roll Number", "rollNo"], ["Semester", "semester"], ["Email", "email"], ["Programme", "programName"], ["Status", "status"]],
  },
  performance: {
    label: "Performance",
    singular: "Performance Record",
    noun: "performance records",
    icon: Award,
    idPrefix: "PRF",
    demoPrefix: "performance-demo-",
    derive: (record) => record,
    validate: () => "",
    subtitle: (record) =>
      [record.rollNo, record.programName].filter(Boolean).join(" · "),
    filterKey: "semester",
    filterAll: "All Semesters",
    filterLabel: "Filter by semesters",
    filterText: (value) => `Semester ${value}`,
    defaultSort: { key: "rollNo", dir: "asc" },
    statuses: ["On Track", "Needs Support", "Draft"],
    stats: [
      ["All", "Total Records", Award, "Show all"],
      ["On Track", "On Track", CheckCircle, "Filter on track"],
      ["Needs Support", "Needs Support", AlertTriangle, "Filter needs support"],
      ["Draft", "Draft", FilePen, "Filter draft"],
    ],
    columns: [
      ["_id", "Record ID"],
      ["name", "Student"],
      ["rollNo", "Roll Number"],
      ["semester", "Semester"],
      ["percentage", "Percentage"],
      ["status", "Status"],
    ],
    fields: [
      {"key": "name", "label": "Student Name", "required": true, "full": true},
      {"key": "rollNo", "label": "Roll Number", "required": true},
      {"key": "semester", "label": "Semester", "required": true, "options": ["I", "II", "III", "IV", "V", "VI"]},
      {"key": "percentage", "label": "Percentage", "required": true, "type": "number", "min": 0, "max": 100},
      {"key": "programName", "label": "Programme", "required": true},
      {"key": "status", "label": "Status", "options": ["On Track", "Needs Support", "Draft"], "full": true},
    ],
    blank: {"name": "", "rollNo": "", "semester": "I", "percentage": "", "programName": "B.Com CA", "status": "Draft"},
    details: [["Roll Number", "rollNo"], ["Semester", "semester"], ["Percentage", "percentage"], ["Programme", "programName"], ["Status", "status"]],
  },
};

const STATUS_STYLE = {
  "Active": "bg-emerald-50 text-emerald-700",
  "On Leave": "bg-blue-50 text-blue-700",
  "Inactive": "bg-slate-100 text-slate-600",
  "On Track": "bg-emerald-50 text-emerald-700",
  "Needs Support": "bg-rose-50 text-rose-700",
  "Draft": "bg-amber-50 text-amber-700",
};

const STATUS_DOT = {
  "Active": "bg-emerald-500",
  "On Leave": "bg-blue-500",
  "Inactive": "bg-slate-400",
  "On Track": "bg-emerald-500",
  "Needs Support": "bg-rose-500",
  "Draft": "bg-amber-500",
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const pageList = (total, current) => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const numbers = [...new Set([1, total, current - 1, current, current + 1])]
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

const displayValue = (key, value) => {
  if (value === "" || value === null || value === undefined) return "—";
  if (value === "—") return value;
  if (key === "percentage") return `${value}%`;

  if (key.endsWith("On")) {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  }

  return value;
};

const shortId = (config, id) =>
  String(id).startsWith(config.demoPrefix)
    ? `${config.idPrefix}-${String(id).slice(-3)}`
    : String(id).slice(-8);

const normalizeStatus = (type, value = "") => {
  const status = String(value).toLowerCase();
  const match = CONFIG[type].statuses.find(
    (item) => item.toLowerCase() === status
  );
  return match || "Draft";
};

const normalizeBackendRecord = (type) => (record, index) => ({
  ...record,
  _id: record._id || record.id || `backend-${type}-${index}`,
  name: record.name || record.title || record.studentName || "Untitled",
  status: normalizeStatus(type, record.status),
  isDemo: false,
});

/* Uses the API function only if it exists in adminApi */
const optionalFetch = (functionName) => {
  const api = { ...adminApi };
  return typeof api[functionName] === "function"
    ? api[functionName]()
    : Promise.resolve([]);
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
   ADD / EDIT FORM
------------------------------------------------------- */

function RecordForm({ config, initial, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (!initial) return { ...config.blank };

    return Object.fromEntries(
      Object.keys(config.blank).map((key) => [key, initial[key] ?? ""])
    );
  });

  const [error, setError] = useState("");

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  const submit = (event) => {
    event.preventDefault();

    const missing = config.fields.some(
      (field) => field.required && !String(form[field.key]).trim()
    );

    if (missing) {
      setError("Please complete all required fields.");
      return;
    }

    const invalidNumber = config.fields.some(
      (field) =>
        field.type === "number" &&
        (Number(form[field.key]) < field.min ||
          (field.max !== undefined && Number(form[field.key]) > field.max))
    );

    if (invalidNumber) {
      setError("Please enter valid numbers.");
      return;
    }

    const ruleError = config.validate(form);

    if (ruleError) {
      setError(ruleError);
      return;
    }

    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");

    const cleaned = { ...form };

    config.fields.forEach((field) => {
      if (field.type === "number") {
        cleaned[field.key] = Number(form[field.key]);
      } else if (typeof cleaned[field.key] === "string") {
        cleaned[field.key] = cleaned[field.key].trim();
      }
    });

    onSave(cleaned);
  };

  return (
    <Modal
      title={`${initial ? "Edit" : "Add"} ${config.singular}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 pb-6 pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {config.fields.map((field) => (
            <label
              key={field.key}
              className={`block ${field.full ? "sm:col-span-2" : ""}`}
            >
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">
                {field.label}
                {field.required ? " *" : ""}
              </span>

              {field.options ? (
                <select
                  className={inputClass}
                  value={form[field.key]}
                  onChange={(event) => set(field.key, event.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {field.key === "semester"
                        ? `Semester ${option}`
                        : option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  min={field.min}
                  max={field.max}
                  className={inputClass}
                  value={form[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
            {error}
          </p>
        )}

        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
          Demo {config.noun} are stored only in this page's local state. They
          are not saved to the college database.
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
            {initial ? "Save Changes" : `Add ${config.singular}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function ManageStudents() {
  const firstResource = useApiData(
    () => optionalFetch("fetchHodStudents"),
    "hod-ManageStudents-students"
  );

  const secondResource = useApiData(
    () => optionalFetch("fetchHodPerformance"),
    "hod-ManageStudents-performance"
  );

  const [tab, setTab] = useState("students");

  const [demo, setDemo] = useState(() => ({
    students: SEED_STUDENTS.map((item) => ({ ...item })),
    performance: SEED_PERFORMANCE.map((item) => ({ ...item })),
  }));

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dropdownFilter, setDropdownFilter] = useState("All");
  const [sort, setSort] = useState(CONFIG.students.defaultSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const config = CONFIG[tab];
  const TabIcon = config.icon;
  const demoRecords = demo[tab];

  const resource = tab === "students" ? firstResource : secondResource;
  const apiData = resource.data;
  const loading = resource.loading;

  const setDemoRecords = (key, updater) => {
    setDemo((current) => ({ ...current, [key]: updater(current[key]) }));
  };

  /* Normalize API records and combine demo records */

  const allRecords = useMemo(
    () => [
      ...(Array.isArray(apiData) ? apiData : []).map(
        normalizeBackendRecord(tab)
      ),
      ...demoRecords,
    ].map(config.derive),
    [apiData, demoRecords, tab, config]
  );

  /* Statistics */

  const counts = useMemo(
    () =>
      Object.fromEntries([
        ["All", allRecords.length],
        ...config.statuses.map((status) => [
          status,
          allRecords.filter((item) => item.status === status).length,
        ]),
      ]),
    [allRecords, config]
  );

  /* Dropdown options */

  const dropdownOptions = useMemo(
    () =>
      [
        ...new Set(
          allRecords
            .map((item) => String(item[config.filterKey] ?? ""))
            .filter((value) => value && value !== "—")
        ),
      ].sort((a, b) =>
        config.filterKey === "semester"
          ? SEMESTERS.indexOf(a) - SEMESTERS.indexOf(b)
          : a.localeCompare(b)
      ),
    [allRecords, config]
  );

  /* Search, filter and sorting */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = allRecords.filter((item) => {
      const statusMatch =
        statusFilter === "All" || item.status === statusFilter;

      const dropdownMatch =
        dropdownFilter === "All" ||
        String(item[config.filterKey]) === dropdownFilter;

      const searchMatch =
        !q ||
        [shortId(config, item._id), ...Object.values(item)].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );

      return statusMatch && dropdownMatch && searchMatch;
    });

    return result.sort((a, b) => {
      const comparison = String(a[sort.key] ?? "").localeCompare(
        String(b[sort.key] ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      );

      return sort.dir === "asc" ? comparison : -comparison;
    });
  }, [allRecords, query, statusFilter, dropdownFilter, sort, config]);

  /* Pagination */

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [tab, query, statusFilter, dropdownFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* Toast notifications */

  const dismissToast = (id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  const toast = (message, undo) => {
    const id = Date.now() + Math.random();

    setToasts((current) => [...current, { id, message, undo }]);

    window.setTimeout(() => dismissToast(id), 5500);
  };

  /* Filters and tabs */

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setDropdownFilter("All");
  };

  const switchTab = (key) => {
    if (key === tab) return;

    setTab(key);
    clearFilters();
    setSort(CONFIG[key].defaultSort);
    setPage(1);
    setModal(null);
  };

  const filtersActive =
    Boolean(query) || statusFilter !== "All" || dropdownFilter !== "All";

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  /* Add / Edit */

  const saveRecord = (data) => {
    const target = modal?.record;

    if (!target) {
      const nextNumber =
        demoRecords.reduce((max, item) => {
          const number = Number(
            String(item._id).match(/\d+$/)?.[0] || 0
          );
          return Math.max(max, number);
        }, 0) + 1;

      const newRecord = {
        ...data,
        _id: `${config.demoPrefix}${String(nextNumber).padStart(3, "0")}`,
        isDemo: true,
      };

      setDemoRecords(tab, (current) => [...current, newRecord]);
      toast(`${newRecord.name} was added successfully.`);
      setModal(null);
      return;
    }

    setDemoRecords(tab, (current) =>
      current.map((item) =>
        item._id === target._id ? { ...item, ...data } : item
      )
    );

    toast(`${data.name} was updated successfully.`);
    setModal(null);
  };

  /* Delete */

  const confirmDelete = () => {
    const target = modal?.record;

    if (!target?.isDemo) return;

    const key = tab;
    const index = demoRecords.findIndex((item) => item._id === target._id);

    setDemoRecords(key, (current) =>
      current.filter((item) => item._id !== target._id)
    );

    toast(`${target.name} was deleted.`, () => {
      setDemoRecords(key, (current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, target);
        return next;
      });
    });

    setModal(null);
  };

  /* Status update for demo records */

  const changeStatus = (record) => {
    if (!record.isDemo) {
      toast("Database status changes require the backend update API.");
      return;
    }

    const nextStatus =
      config.statuses[
        (config.statuses.indexOf(record.status) + 1) % config.statuses.length
      ];

    setDemoRecords(tab, (current) =>
      current.map((item) =>
        item._id === record._id ? { ...item, status: nextStatus } : item
      )
    );

    toast(`${record.name}: status changed to ${nextStatus}.`);
  };

  /* CSV Export */

  const exportCsv = () => {
    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const columns = [
      [`${config.singular} ID`, "_id"],
      [`${config.singular} Name`, "name"],
      ...config.details.map(([label, key]) => [label, key]),
    ];

    const csv = [
      [...columns.map(([label]) => label), "Record Type"]
        .map(escapeCsv)
        .join(","),

      ...filtered.map((item) =>
        [
          ...columns.map(([, key]) => item[key]),
          item.isDemo ? "Demo" : "Database",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `aisc-managestudents-${tab}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);

    toast(`Exported ${filtered.length} ${config.noun}.`);
  };

  const inputClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  /* Table cell content */

  const renderCell = (record, key) => {
    if (key === "_id") {
      return (
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xs font-bold text-white shadow ring-2 ring-white transition group-hover:scale-105">
            <TabIcon size={16} />
          </span>
          <span className="font-semibold tabular-nums text-[#14234b]">
            {shortId(config, record._id)}
          </span>
        </div>
      );
    }

    if (key === "name") {
      return (
        <>
          <span className="block max-w-[230px] truncate font-semibold text-[#14234b]">
            {record.name}
          </span>
          <span className="mt-0.5 block text-[10px] text-slate-400">
            {config.subtitle(record)}
          </span>
        </>
      );
    }

    if (key === "status") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeStatus(record)}
            title={
              record.isDemo
                ? "Click to change demo status"
                : "Database status"
            }
            className="rounded-full transition hover:scale-105"
          >
            <StatusBadge status={record.status} />
          </button>

          {record.isDemo && (
            <span className="rounded-full bg-[#f2c200]/20 px-2 py-1 text-[10px] font-bold text-[#946500]">
              DEMO
            </span>
          )}
        </div>
      );
    }

    return displayValue(key, record[key]);
  };

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
              Department · Read to Lead
            </p>

            <h1 className="font-['Playfair_Display',serif] text-3xl font-bold tracking-tight text-[#14234b] sm:text-4xl">
              Manage Students
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Add, organize and monitor student records across semesters in the department.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#f2c200]/50 bg-white/80 px-4 py-2 text-xs font-semibold text-[#14234b] shadow-sm">
            <GraduationCap size={16} className="text-[#8f0014]" />
            Department Administration
          </div>
        </header>

        {/* Students / Performance switch */}

        <div
          className="rise mb-4 inline-flex self-start rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100"
          role="group"
          aria-label="Choose section"
        >
          {Object.entries(CONFIG).map(([key, item]) => (
            <button
              type="button"
              key={key}
              onClick={() => switchTab(key)}
              aria-pressed={tab === key}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === key
                  ? "bg-gradient-to-b from-[#a30018] to-[#6d000f] text-white shadow-md shadow-[#8f0014]/30"
                  : "text-slate-500 hover:text-[#14234b]"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>

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
            aria-label={`${config.label} statistics`}
          >
            {config.stats.map(([status, label, icon, hint]) => (
              <StatItem
                key={status}
                icon={icon}
                label={label}
                value={counts[status]}
                hint={hint}
                selected={statusFilter === status}
                onClick={() =>
                  setStatusFilter(statusFilter === status ? "All" : status)
                }
              />
            ))}
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
                {["All", ...config.statuses].map((status) => (
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
                value={dropdownFilter}
                onChange={(event) => setDropdownFilter(event.target.value)}
                aria-label={config.filterLabel}
                className={`${inputClass} max-w-full sm:max-w-[210px]`}
              >
                <option value="All">{config.filterAll}</option>

                {dropdownOptions.map((value) => (
                  <option key={value} value={value}>
                    {config.filterText(value)}
                  </option>
                ))}
              </select>

              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-[#8f0014] focus-within:ring-4 focus-within:ring-[#8f0014]/10 sm:w-48 sm:flex-none">
                <Search size={16} className="shrink-0 text-slate-400" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${config.noun}...`}
                  aria-label={`Search ${config.noun}`}
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
                Add {config.singular}
              </button>
            </div>
          </div>

          {/* Table */}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="bg-[#14234b]/[0.04] text-xs tracking-wide text-[#14234b]/70 uppercase">
                  {config.columns.map(([key, label]) => (
                    <th key={key} scope="col" className="px-5 py-3.5 font-semibold">
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

                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading &&
                  Array.from({ length: pageSize }).map((_, index) => (
                    <tr key={`loading-${index}`}>
                      {Array.from({ length: config.columns.length + 1 }).map((__, cell) => (
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
                  rows.map((record, index) => (
                    <tr
                      key={`${tab}-${record._id}`}
                      className="row-in group transition hover:bg-[#14234b]/[0.03]"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      {config.columns.map(([key]) => (
                        <td key={key} className="px-5 py-3.5 text-slate-500">
                          {renderCell(record, key)}
                        </td>
                      ))}

                      {/* Actions */}

                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setModal({ type: "view", record })}
                            aria-label={`View ${record.name}`}
                            title="View"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#14234b]/10 hover:text-[#14234b]"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setModal({ type: "edit", record })}
                            aria-label={`Edit ${record.name}`}
                            title="Edit"
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#f2c200]/25 hover:text-[#946500]"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setModal({ type: "delete", record })}
                            aria-label={`Delete ${record.name}`}
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
                  No {config.noun} found
                </p>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {filtersActive
                    ? "Try a different search or clear the filters."
                    : `Use the Add ${config.singular} button to get started.`}
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
                    )} of ${filtered.length} ${config.noun}`}
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
                  <span key={number} className="px-1 text-slate-400">
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
          Demo {config.noun} are sample records for preview only. Database
          records appear when the matching API function is available.
        </p>
      </main>

      {/* Add / Edit */}

      {(modal?.type === "add" || modal?.type === "edit") &&
        (modal.type === "edit" && !modal.record.isDemo ? (
          <Modal title="Database Record" onClose={() => setModal(null)}>
            <div className="px-6 pb-6 pt-4">
              <div className="flex gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600">
                  <AlertTriangle size={22} />
                </span>

                <p className="text-sm leading-relaxed text-slate-600">
                  This record comes from the database. An update API has not
                  been confirmed in the available frontend service functions,
                  so it cannot safely be edited from this page yet.
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
        ) : (
          <RecordForm
            config={config}
            initial={modal.type === "edit" ? modal.record : null}
            onSave={saveRecord}
            onClose={() => setModal(null)}
          />
        ))}

      {/* View details */}

      {modal?.type === "view" && (
        <Modal
          title={`${config.singular} Details`}
          onClose={() => setModal(null)}
          wide
        >
          <div className="px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xl font-bold text-white shadow-lg ring-4 ring-[#f2c200]/40">
                <TabIcon size={28} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#14234b]">
                  {modal.record.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {config.subtitle(modal.record)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={modal.record.status} />

                  {modal.record.isDemo && (
                    <span className="rounded-full bg-[#f2c200]/20 px-2 py-1 text-[10px] font-bold text-[#946500]">
                      DEMO RECORD
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[[`${config.singular} ID`, "_id"], ...config.details].map(
                ([label, key]) => (
                  <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      {label}
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-[#14234b]">
                      {displayValue(key, modal.record[key])}
                    </p>
                  </div>
                )
              )}
            </div>

            {modal.record.isDemo && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                This is a sample demo record. It is not stored in the college
                database.
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
                  setModal({ type: "edit", record: modal.record })
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
          title={`Delete ${config.singular.toLowerCase()}?`}
          onClose={() => setModal(null)}
        >
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 size={22} />
              </span>

              <p className="text-sm leading-relaxed text-slate-600">
                {modal.record.isDemo ? (
                  <>
                    You are about to delete the demo record{" "}
                    <strong className="text-[#14234b]">
                      {modal.record.name}
                    </strong>
                    . You can undo this action immediately.
                  </>
                ) : (
                  <>
                    This record is stored in the college database. A delete
                    API has not been confirmed, so it cannot be deleted from
                    the database through this page.
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

              {modal.record.isDemo && (
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"
                >
                  Delete {config.singular}
                </button>
              )}
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
