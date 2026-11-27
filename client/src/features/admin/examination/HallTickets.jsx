import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, ArrowUpDown, X, Download, Undo2,
  CheckCircle2, SearchX, Ticket, TicketCheck, Clock, Ban,
  GraduationCap, RefreshCw, Printer, AlertTriangle, Users,
} from "lucide-react";

import { fetchExams, fetchExamTickets, generateHallTickets, updateHallTicket, downloadAdminHallTicketPdf } from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import "../../../assets/styles/aisc-premium.css";

const SEED_TICKETS = [
  { _id: "demo-001", fullName: "Ayesha Khan", enrollmentNumber: "AISC2024001", seatNumber: "BCA-001", room: "Room 101", status: "issued", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: "2026-11-20T10:30:00", isDemo: true },
  { _id: "demo-002", fullName: "Sana Patel", enrollmentNumber: "AISC2024002", seatNumber: "BCA-002", room: "Room 101", status: "issued", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: "2026-11-20T11:00:00", isDemo: true },
  { _id: "demo-003", fullName: "Zara Ansari", enrollmentNumber: "AISC2024003", seatNumber: "BCA-003", room: "Room 102", status: "pending", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: null, isDemo: true },
  { _id: "demo-004", fullName: "Riya Mehta", enrollmentNumber: "AISC2024004", seatNumber: "BCA-004", room: "Room 102", status: "blocked", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: null, isDemo: true },
  { _id: "demo-005", fullName: "Omar Farooq", enrollmentNumber: "AISC2024005", seatNumber: "BCA-005", room: "Room 103", status: "issued", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: "2026-11-21T09:15:00", isDemo: true },
  { _id: "demo-006", fullName: "Neha Deshmukh", enrollmentNumber: "AISC2024006", seatNumber: "BCA-006", room: "Room 103", status: "pending", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: null, isDemo: true },
  { _id: "demo-007", fullName: "Imran Qureshi", enrollmentNumber: "AISC2024007", seatNumber: "BCA-007", room: "Room 104", status: "issued", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: "2026-11-21T12:00:00", isDemo: true },
  { _id: "demo-008", fullName: "Fatima Sheikh", enrollmentNumber: "AISC2024008", seatNumber: "BCA-008", room: "Room 104", status: "blocked", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: null, isDemo: true },
  { _id: "demo-009", fullName: "Rohan Kulkarni", enrollmentNumber: "AISC2024009", seatNumber: "BCA-009", room: "Room 105", status: "issued", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: "2026-11-22T10:00:00", isDemo: true },
  { _id: "demo-010", fullName: "Aisha Siddiqui", enrollmentNumber: "AISC2024010", seatNumber: "BCA-010", room: "Room 105", status: "pending", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: null, isDemo: true },
  { _id: "demo-011", fullName: "Kabir Joshi", enrollmentNumber: "AISC2024011", seatNumber: "BCA-011", room: "Room 106", status: "issued", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: "2026-11-22T11:30:00", isDemo: true },
  { _id: "demo-012", fullName: "Iqra Shaikh", enrollmentNumber: "AISC2024012", seatNumber: "BCA-012", room: "Room 106", status: "pending", examName: "Semester V Examination", programName: "B.Com CA", semester: "V", issuedAt: null, isDemo: true },
];

const STATUS_OPTIONS = ["issued", "pending", "blocked"];

const STATUS_STYLE = {
  issued: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  blocked: "bg-rose-50 text-rose-700",
};

const initialsOf = (name = "") =>
  name.split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase();

const pageList = (total, current) => {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const numbers = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((number) => number >= 1 && number <= total)
    .sort((a, b) => a - b);
  const result = [];
  numbers.forEach((number, index) => {
    if (index && number - numbers[index - 1] > 1) result.push(`gap-${number}`);
    result.push(number);
  });
  return result;
};

const dateLabel = (value) => {
  if (!value) return "Not issued";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function StatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>
      <span className={`h-2 w-2 rounded-full ${status === "issued" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500" : "bg-rose-500"}`} />
      {label}
    </span>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="fade absolute inset-0 cursor-default bg-[#14234b]/60 backdrop-blur-sm" onClick={onClose} aria-label="Close modal" />
      <div className={`pop relative my-auto w-full ${wide ? "max-w-xl" : "max-w-md"} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#14234b]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
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
      <button type="button" onClick={onClick} aria-pressed={selected} className="group relative flex w-full items-center gap-4 bg-[#14234b]/70 px-5 py-5 text-left backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2c200] sm:px-6">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 transition duration-300 group-hover:scale-110 ${selected ? "bg-[#f2c200] text-[#14234b] ring-[#f2c200]" : "bg-white/10 text-[#f2c200] ring-white/20 group-hover:bg-[#f2c200] group-hover:text-[#14234b]"}`}>
          <Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase sm:text-[11px]">{label}</span>
          <span className="mt-1 block font-['Playfair_Display',serif] text-3xl font-bold leading-none tabular-nums text-white">{value}</span>
        </span>
        <span className="hidden text-[11px] font-medium text-white/50 xl:block">{hint}</span>
        <span className={`absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#f2c200] transition-transform duration-300 ${selected ? "scale-x-100" : "scale-x-0"}`} />
      </button>
    </li>
  );
}

function TicketForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    fullName: "",
    enrollmentNumber: "",
    seatNumber: "",
    room: "",
    status: "issued",
  });
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.enrollmentNumber.trim() || !form.seatNumber.trim() || !form.room.trim()) {
      setError("Please complete all the fields.");
      return;
    }
    setError("");
    onSave({
      ...form,
      fullName: form.fullName.trim(),
      enrollmentNumber: form.enrollmentNumber.trim(),
      seatNumber: form.seatNumber.trim(),
      room: form.room.trim(),
    });
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10";

  return (
    <Modal title={initial ? "Edit Hall Ticket" : "Add Demo Hall Ticket"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-6 pb-6 pt-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">Student name</label>
          <input className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Ayesha Khan" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">Enrollment number</label>
          <input className={inputClass} value={form.enrollmentNumber} onChange={(e) => set("enrollmentNumber", e.target.value)} placeholder="e.g. AISC2024013" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">Seat number</label>
            <input className={inputClass} value={form.seatNumber} onChange={(e) => set("seatNumber", e.target.value)} placeholder="BCA-013" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">Room</label>
            <input className={inputClass} value={form.room} onChange={(e) => set("room", e.target.value)} placeholder="Room 107" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#14234b]">Ticket status</label>
          <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
          </select>
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
          Demo records are stored only in this page's local state. They are not saved to the college database.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
          <button type="submit" className="rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/20 transition hover:brightness-110">
            {initial ? "Save Changes" : "Add Demo Ticket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function HallTickets() {
  const examsResource = useApiData(() => fetchExams(), "hall-ticket-exams");
  const exams = examsResource.data ?? [];

  const [selectedExamId, setSelectedExamId] = useState("");
  const activeExam = exams.find((exam) => String(exam._id) === String(selectedExamId)) || exams[0] || null;

  const ticketsResource = useApiData(
    () => activeExam ? fetchExamTickets(activeExam._id) : Promise.resolve([]),
    activeExam?._id || "no-active-exam"
  );

  const backendTickets = ticketsResource.data ?? [];

  const [demoTickets, setDemoTickets] = useState(SEED_TICKETS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState({ key: "fullName", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [overwrite, setOverwrite] = useState(false);
  const [generating, setGenerating] = useState(false);

  const examDemoTickets = useMemo(() => {
    if (!activeExam) return demoTickets;
    return demoTickets.map((ticket) => ({
      ...ticket,
      examName: activeExam.name || ticket.examName,
      programName: activeExam.programName || ticket.programName,
      semester: activeExam.semester ?? ticket.semester,
      examId: activeExam._id,
    }));
  }, [demoTickets, activeExam]);

  const allTickets = useMemo(() => [...backendTickets, ...examDemoTickets], [backendTickets, examDemoTickets]);

  const counts = useMemo(() => ({
    All: allTickets.length,
    issued: allTickets.filter((ticket) => ticket.status === "issued").length,
    pending: allTickets.filter((ticket) => ticket.status === "pending").length,
    blocked: allTickets.filter((ticket) => ticket.status === "blocked").length,
  }), [allTickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = allTickets.filter((ticket) => {
      const statusMatch = statusFilter === "All" || ticket.status === statusFilter;
      const searchMatch = !q || [
        ticket.fullName,
        ticket.enrollmentNumber,
        ticket.seatNumber,
        ticket.room,
        ticket.examName,
        ticket.programName,
      ].some((value) => String(value || "").toLowerCase().includes(q));
      return statusMatch && searchMatch;
    });

    return [...result].sort((a, b) => {
      const left = String(a[sort.key] ?? "");
      const right = String(b[sort.key] ?? "");
      const comparison = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
      return sort.dir === "asc" ? comparison : -comparison;
    });
  }, [allTickets, query, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  useEffect(() => setPage(1), [query, statusFilter, pageSize, activeExam?._id]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toast = (message, undo) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, undo }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5500);
  };

  const dismissToast = (id) => setToasts((current) => current.filter((item) => item.id !== id));

  const toggleSort = (key) => {
    setSort((current) => current.key === key
      ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "asc" });
  };

  const saveTicket = async (data) => {
    const target = modal?.ticket;

    if (!target) {
      const newTicket = {
        ...data,
        _id: `demo-${Date.now()}`,
        examName: activeExam?.name || "Demo Examination",
        programName: activeExam?.programName || "B.Com CA",
        semester: activeExam?.semester || "V",
        examId: activeExam?._id || "demo-exam",
        issuedAt: data.status === "issued" ? new Date().toISOString() : null,
        isDemo: true,
      };
      setDemoTickets((current) => [...current, newTicket]);
      toast(`${newTicket.fullName} demo ticket was added.`);
      setModal(null);
      return;
    }

    if (target.isDemo) {
      setDemoTickets((current) => current.map((ticket) =>
        ticket._id === target._id
          ? { ...ticket, ...data, issuedAt: data.status === "issued" ? (ticket.issuedAt || new Date().toISOString()) : null }
          : ticket
      ));
      toast(`${data.fullName} demo ticket was updated.`);
      setModal(null);
      return;
    }

    try {
      await updateHallTicket(target._id, {
        seatNumber: data.seatNumber,
        room: data.room,
        status: data.status,
      });
      await ticketsResource.reload();
      toast(`${target.fullName}'s hall ticket was updated.`);
      setModal(null);
    } catch (error) {
      toast(error?.message || "Could not update the hall ticket.");
    }
  };

  const confirmDelete = () => {
    const target = modal?.ticket;
    if (!target) return;

    if (!target.isDemo) {
      setModal({ type: "backend-delete-info", ticket: target });
      return;
    }

    const index = demoTickets.findIndex((ticket) => ticket._id === target._id);
    setDemoTickets((current) => current.filter((ticket) => ticket._id !== target._id));
    toast(`${target.fullName}'s demo ticket was deleted.`, () => {
      setDemoTickets((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, target);
        return next;
      });
    });
    setModal(null);
  };

  const generateTickets = async () => {
    if (!activeExam) return;
    setGenerating(true);
    try {
      const result = await generateHallTickets(activeExam._id, { overwrite });
      await ticketsResource.reload();
      await examsResource.reload();
      setModal(null);
      toast(`Generation complete: ${result?.created ?? 0} created, ${result?.updated ?? 0} updated, ${result?.skipped ?? 0} skipped.`);
    } catch (error) {
      toast(error?.message || "Hall ticket generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadTicket = async (ticket) => {
    if (ticket.isDemo) {
      toast("PDF download is available for database hall tickets only.");
      return;
    }
    try {
      await downloadAdminHallTicketPdf(ticket);
      toast(`Hall ticket download started for ${ticket.fullName}.`);
    } catch (error) {
      toast(error?.message || "Could not download this hall ticket.");
    }
  };

  const exportCsv = () => {
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const columns = [
      ["Student", "fullName"],
      ["Enrollment", "enrollmentNumber"],
      ["Seat", "seatNumber"],
      ["Room", "room"],
      ["Examination", "examName"],
      ["Status", "status"],
      ["Issued", "issuedAt"],
      ["Record Type", "isDemo"],
    ];
    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(","),
      ...filtered.map((ticket) => columns.map(([, key]) => escapeCsv(key === "isDemo" ? (ticket.isDemo ? "Demo" : "Database") : ticket[key])).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aisc-hall-tickets.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} hall ticket records.`);
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
  };

  const filtersActive = Boolean(query) || statusFilter !== "All";
  const loading = examsResource.loading || (Boolean(activeExam) && ticketsResource.loading);

  return (
    <div className="hall-tickets-page relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f7f3ef] font-['Poppins',sans-serif] text-slate-700">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap');
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes rowIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
        .hall-tickets-page .rise { animation: rise .55s cubic-bezier(.2,.7,.2,1) both; }
        .hall-tickets-page .row-in { animation: rowIn .35s ease both; }
        .hall-tickets-page .pop { animation: pop .25s cubic-bezier(.2,.7,.2,1) both; }
        .hall-tickets-page .fade { animation: fade .2s ease both; }
        .hall-tickets-page .toast-in { animation: toastIn .3s ease both; }
        .hall-tickets-page button:focus-visible, .hall-tickets-page input:focus-visible, .hall-tickets-page select:focus-visible { outline: 2px solid #f2c200; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .hall-tickets-page .rise, .hall-tickets-page .row-in, .hall-tickets-page .pop, .hall-tickets-page .fade, .hall-tickets-page .toast-in { animation: none; }
        }
      `}</style>

      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8f0014]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#14234b]/10 blur-3xl" aria-hidden="true" />

      <main className="relative flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Page heading */}
        <header className="rise mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[.22em] text-[#8f0014] uppercase">Examination Cell · Read to Lead</p>
    
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">Generate, manage and monitor student hall tickets for college examinations.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#f2c200]/50 bg-white/80 px-4 py-2 text-xs font-semibold text-[#14234b] shadow-sm">
            <GraduationCap size={16} className="text-[#8f0014]" />
            Examination Administration
          </div>
        </header>

        {/* Statistics */}
        <section className="rise relative overflow-hidden rounded-3xl bg-[#14234b] shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#14234b]/95 via-[#1b2f63]/90 to-[#3a1230]/90" aria-hidden="true" />
          <span className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#8f0014]/30" aria-hidden="true" />
          <ul className="relative grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4" aria-label="Hall ticket statistics">
            <StatItem icon={Ticket} label="Total Tickets" value={counts.All} hint="Show all" selected={statusFilter === "All"} onClick={() => setStatusFilter("All")} />
            <StatItem icon={TicketCheck} label="Issued Tickets" value={counts.issued} hint="Filter issued" selected={statusFilter === "issued"} onClick={() => setStatusFilter(statusFilter === "issued" ? "All" : "issued")} />
            <StatItem icon={Clock} label="Pending Tickets" value={counts.pending} hint="Filter pending" selected={statusFilter === "pending"} onClick={() => setStatusFilter(statusFilter === "pending" ? "All" : "pending")} />
            <StatItem icon={Ban} label="Blocked Tickets" value={counts.blocked} hint="Filter blocked" selected={statusFilter === "blocked"} onClick={() => setStatusFilter(statusFilter === "blocked" ? "All" : "blocked")} />
          </ul>
          <div className="relative h-1 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />
        </section>

        {/* Main table panel */}
        <section className="rise mt-6 flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100" style={{ animationDelay: "120ms" }}>
          <div className="h-1.5 bg-gradient-to-r from-[#8f0014] via-[#f2c200] to-[#8f0014]" />

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter by status">
                {["All", "issued", "pending", "blocked"].map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition sm:px-3.5 ${statusFilter === status ? "bg-white text-[#14234b] shadow" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {status === "All" ? "All" : status} <span className="ml-1 tabular-nums text-slate-400">{status === "All" ? counts.All : counts[status]}</span>
                  </button>
                ))}
              </div>
              {filtersActive && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#8f0014] transition hover:bg-[#8f0014]/10">
                  <X size={13} /> Clear filters
                </button>
              )}
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <select
                value={activeExam?._id || ""}
                onChange={(event) => setSelectedExamId(event.target.value)}
                aria-label="Select examination"
                className="min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-[#8f0014] focus:ring-4 focus:ring-[#8f0014]/10 sm:max-w-[220px]"
              >
                {exams.length === 0 && <option value="">No examinations available</option>}
                {exams.map((exam) => <option key={exam._id} value={exam._id}>{exam.name || "Untitled Examination"}</option>)}
              </select>

              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-[#8f0014] focus-within:ring-4 focus-within:ring-[#8f0014]/10 sm:w-48 sm:flex-none">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tickets..."
                  aria-label="Search hall tickets"
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-slate-400 hover:text-slate-700"><X size={14} /></button>}
              </div>

              <button type="button" onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#14234b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <Download size={16} /> Export
              </button>
              <button type="button" onClick={() => setModal({ type: "generate" })} disabled={!activeExam} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#14234b] to-[#0c1732] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#14234b]/20 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                <RefreshCw size={15} /> Generate
              </button>
              <button type="button" onClick={() => setModal({ type: "add" })} disabled={!activeExam} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#8f0014]/25 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus size={16} /> Add Demo
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="bg-[#14234b]/[0.04] text-xs tracking-wide text-[#14234b]/70 uppercase">
                  {[
                    ["fullName", "Student"],
                    ["enrollmentNumber", "Enrollment"],
                    ["examName", "Examination"],
                    ["seatNumber", "Seat / Room"],
                    ["issuedAt", "Issued"],
                    ["status", "Status"],
                  ].map(([key, label]) => (
                    <th key={key} scope="col" className="px-5 py-3.5 font-semibold">
                      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1.5 uppercase transition hover:text-[#8f0014]">
                        {label}
                        {sort.key === key
                          ? sort.dir === "asc" ? <ChevronUp size={14} className="text-[#8f0014]" /> : <ChevronDown size={14} className="text-[#8f0014]" />
                          : <ArrowUpDown size={12} className="opacity-40" />}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={`loading-${index}`}>
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${55 + ((index + cell) % 4) * 12}%` }} /></td>
                    ))}
                  </tr>
                ))}

                {!loading && rows.map((ticket, index) => (
                  <tr key={ticket._id} className="row-in group transition hover:bg-[#14234b]/[0.03]" style={{ animationDelay: `${index * 40}ms` }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xs font-bold text-white shadow ring-2 ring-white transition group-hover:scale-105">
                          {initialsOf(ticket.fullName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#14234b]">{ticket.fullName || "Unknown Student"}</span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">{ticket.programName || "Student"}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium tabular-nums text-slate-600">{ticket.enrollmentNumber || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="block max-w-[190px] truncate font-medium text-slate-700">{ticket.examName || activeExam?.name || "—"}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{ticket.semester ? `Semester ${ticket.semester}` : "Examination"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="block font-semibold text-[#14234b]">{ticket.seatNumber || "—"}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{ticket.room || "Room not assigned"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{dateLabel(ticket.issuedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={ticket.status} />
                        {ticket.isDemo && <span className="rounded-full bg-[#f2c200]/20 px-2 py-1 text-[10px] font-bold text-[#946500]">DEMO</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setModal({ type: "view", ticket })} aria-label={`View ${ticket.fullName}`} title="View" className="rounded-lg p-2 text-slate-500 transition hover:bg-[#14234b]/10 hover:text-[#14234b]"><Eye size={17} /></button>
                        <button type="button" onClick={() => setModal({ type: "edit", ticket })} aria-label={`Edit ${ticket.fullName}`} title="Edit" className="rounded-lg p-2 text-slate-500 transition hover:bg-[#f2c200]/25 hover:text-[#946500]"><Pencil size={17} /></button>
                        <button type="button" onClick={() => downloadTicket(ticket)} aria-label={`Download ${ticket.fullName}`} title="Download PDF" className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"><Printer size={17} /></button>
                        <button type="button" onClick={() => setModal({ type: "delete", ticket })} aria-label={`Delete ${ticket.fullName}`} title="Delete" className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && rows.length === 0 && (
              <div className="grid place-items-center px-6 py-16 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><SearchX size={28} /></span>
                <p className="mt-4 font-['Playfair_Display',serif] text-lg font-bold text-[#14234b]">No hall tickets found</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">{filtersActive ? "Try a different search or clear the filters." : "Generate hall tickets for this examination or add a demo ticket to preview the page."}</p>
                {filtersActive && <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Clear filters</button>}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{filtered.length === 0 ? "No results" : `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} tickets`}</span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Rows per page</span>
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-[#8f0014]/20">
                  {[5, 6, 10, 20].map((number) => <option key={number} value={number}>{number} / page</option>)}
                </select>
              </label>
            </div>
            <nav className="flex items-center gap-1.5" aria-label="Pagination">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
              {pageList(totalPages, page).map((number) => typeof number === "string"
                ? <span key={number} className="px-1 text-slate-400">…</span>
                : <button type="button" key={number} onClick={() => setPage(number)} aria-current={number === page ? "page" : undefined} className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition ${number === page ? "bg-gradient-to-b from-[#a30018] to-[#6d000f] text-white shadow-md shadow-[#8f0014]/30" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{number}</button>
              )}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
            </nav>
          </div>
        </section>

        <p className="mt-3 text-center text-[10px] text-slate-400">Demo records are sample data for preview only. Database records are managed through the examination APIs.</p>
      </main>

      {/* Add / Edit demo ticket */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <TicketForm
          initial={modal.type === "edit" ? {
            fullName: modal.ticket.fullName || "",
            enrollmentNumber: modal.ticket.enrollmentNumber || "",
            seatNumber: modal.ticket.seatNumber || "",
            room: modal.ticket.room || "",
            status: modal.ticket.status || "pending",
          } : null}
          onSave={saveTicket}
          onClose={() => setModal(null)}
        />
      )}

      {/* View details */}
      {modal?.type === "view" && (
        <Modal title="Hall Ticket Details" onClose={() => setModal(null)} wide>
          <div className="px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#14234b] to-[#4a5a86] text-xl font-bold text-white shadow-lg ring-4 ring-[#f2c200]/40">{initialsOf(modal.ticket.fullName)}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#14234b]">{modal.ticket.fullName}</h3>
                <p className="mt-1 text-sm text-slate-500">{modal.ticket.enrollmentNumber}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={modal.ticket.status} />{modal.ticket.isDemo && <span className="rounded-full bg-[#f2c200]/20 px-2 py-1 text-[10px] font-bold text-[#946500]">DEMO RECORD</span>}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Examination", modal.ticket.examName || activeExam?.name || "—"],
                ["Programme", modal.ticket.programName || "—"],
                ["Semester", modal.ticket.semester || "—"],
                ["Seat Number", modal.ticket.seatNumber || "—"],
                ["Room", modal.ticket.room || "—"],
                ["Issued Date", dateLabel(modal.ticket.issuedAt)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-[#14234b]">{value}</p>
                </div>
              ))}
            </div>
            {modal.ticket.isDemo && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">This is a sample demo record. It is not stored in the college database.</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
              <button type="button" onClick={() => setModal({ type: "edit", ticket: modal.ticket })} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"><Pencil size={15} /> Edit</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Generate confirmation */}
      {modal?.type === "generate" && (
        <Modal title="Generate Hall Tickets" onClose={() => setModal(null)}>
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#14234b]/10 text-[#14234b]"><RefreshCw size={22} /></span>
              <div>
                <p className="font-semibold text-[#14234b]">{activeExam?.name || "Selected examination"}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">Generate hall tickets for eligible students in this examination.</p>
              </div>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5">
              <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8f0014]" />
              <span><span className="block text-sm font-semibold text-[#14234b]">Overwrite existing tickets</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">Allow the generation process to update existing hall tickets where supported.</span></span>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={generating} onClick={generateTickets} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#a30018] to-[#6d000f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-60">
                <RefreshCw size={15} className={generating ? "animate-spin" : ""} /> {generating ? "Generating..." : "Generate Tickets"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete demo ticket */}
      {modal?.type === "delete" && (
        <Modal title="Delete hall ticket?" onClose={() => setModal(null)}>
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={22} /></span>
              <p className="text-sm leading-relaxed text-slate-600">
                {modal.ticket.isDemo
                  ? <>You are about to delete the demo ticket for <strong className="text-[#14234b]">{modal.ticket.fullName}</strong>. You can undo this action immediately.</>
                  : <>A delete API has not been provided for database hall tickets. This record will not be deleted from the database.</>}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              {modal.ticket.isDemo && <button type="button" onClick={confirmDelete} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700">Delete Demo</button>}
            </div>
          </div>
        </Modal>
      )}

      {/* Backend delete information */}
      {modal?.type === "backend-delete-info" && (
        <Modal title="Backend API required" onClose={() => setModal(null)}>
          <div className="px-6 pb-6 pt-4">
            <div className="flex gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600"><AlertTriangle size={22} /></span>
              <p className="text-sm leading-relaxed text-slate-600">The backend currently provides hall-ticket generation and update operations, but no delete operation. A delete API is needed before database tickets can be deleted safely.</p>
            </div>
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setModal(null)} className="rounded-xl bg-[#14234b] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110">Got it</button></div>
          </div>
        </Modal>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-[90] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className="toast-in flex items-center gap-3 rounded-xl bg-[#14234b] px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-[#f2c200]/30">
            <CheckCircle2 size={18} className="shrink-0 text-[#6ee7a0]" />
            <span className="flex-1">{item.message}</span>
            {item.undo && <button type="button" onClick={() => { item.undo(); dismissToast(item.id); }} className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold transition hover:bg-white/25"><Undo2 size={13} /> Undo</button>}
            <button type="button" onClick={() => dismissToast(item.id)} aria-label="Dismiss notification" className="text-white/60 hover:text-white"><X size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}