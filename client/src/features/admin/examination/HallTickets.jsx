import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  GraduationCap,
  Lock,
  Printer,
  ShieldAlert,
  Sparkles,
  Ticket,
  Unlock,
  Users,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";

import { examHallTickets } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

export default function HallTickets() {
  const [rows, setRows] = useState(examHallTickets);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const sessions = useMemo(
    () => [...new Set(rows.map((row) => row.session).filter(Boolean))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.student?.toLowerCase().includes(search) ||
        row.rollNo?.toLowerCase().includes(search) ||
        row.seatNo?.toLowerCase().includes(search) ||
        row.program?.toLowerCase().includes(search) ||
        row.id?.toLowerCase().includes(search);

      const matchesSession =
        sessionFilter === "all" || row.session === sessionFilter;

      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesSession && matchesStatus;
    });
  }, [query, rows, sessionFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const counts = {
    issued: rows.filter((row) => row.status === "issued").length,
    pending: rows.filter((row) => row.status === "pending").length,
    blocked: rows.filter((row) => row.status === "blocked").length,
    total: rows.length,
  };

  const today = new Date().toLocaleDateString("en-IN");

  const updateTicket = (ticket, updates) => {
    if (!ticket) return;

    const updatedTicket = {
      ...ticket,
      ...updates,
    };

    setRows((current) =>
      current.map((row) =>
        row.id === ticket.id ? updatedTicket : row
      )
    );

    setSelectedTicket((current) =>
      current?.id === ticket.id ? updatedTicket : current
    );
  };

  const handleExport = () => {
    downloadCsv("aisc-hall-tickets.csv", [
      [
        "Ticket",
        "Student",
        "Roll number",
        "Program",
        "Session",
        "Seat",
        "Room",
        "Status",
        "Issued on",
      ],
      ...filteredRows.map((row) => [
        row.id,
        row.student,
        row.rollNo,
        row.program,
        row.session,
        row.seatNo,
        row.room,
        row.status,
        row.issuedOn,
      ]),
    ]);
  };

  const issueTicket = (ticket) => {
    updateTicket(ticket, {
      status: "issued",
      issuedOn: today,
    });
  };

  const generatePendingTickets = () => {
    const pendingCount = rows.filter(
      (row) => row.status === "pending"
    ).length;

    if (pendingCount === 0) {
      window.alert("There are no pending hall tickets to generate.");
      return;
    }

    const confirmed = window.confirm(
      `Generate ${pendingCount} pending hall ticket(s)?`
    );

    if (!confirmed) return;

    setRows((current) =>
      current.map((row) =>
        row.status === "pending"
          ? { ...row, status: "issued", issuedOn: today }
          : row
      )
    );
  };

  const unblockTicket = (ticket) => {
    updateTicket(ticket, {
      status: "pending",
      issuedOn: "Not issued",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const stats = [
    {
      label: "Issued Tickets",
      value: counts.issued,
      change: "Successfully issued",
      icon: CheckCircle2,
      color: "#2C9271",
      soft: "#EAF7F1",
      progress: rows.length
        ? `${(counts.issued / rows.length) * 100}%`
        : "0%",
    },
    {
      label: "Pending Tickets",
      value: counts.pending,
      change: "Awaiting generation",
      icon: Clock3,
      color: "#B58A16",
      soft: "#FFF7DF",
      progress: rows.length
        ? `${(counts.pending / rows.length) * 100}%`
        : "0%",
    },
    {
      label: "Blocked Tickets",
      value: counts.blocked,
      change: "Require eligibility review",
      icon: ShieldAlert,
      color: "#A8212F",
      soft: "#F9ECEE",
      progress: rows.length
        ? `${(counts.blocked / rows.length) * 100}%`
        : "0%",
    },
    {
      label: "Total Tickets",
      value: counts.total,
      change: "Student ticket records",
      icon: Ticket,
      color: "#315FCE",
      soft: "#EEF3FF",
      progress: "100%",
    },
  ];

  const columns = [
    {
      key: "student",
      header: "Student Details",
      render: (row) => (
        <div className="min-w-[145px] py-1">
          <p className="text-xs font-bold text-[#14264B]">
            {row.student}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#A8212F]">
            {row.rollNo}
          </p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.program}
        </span>
      ),
    },
    {
      key: "session",
      header: "Exam Session",
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.session}
        </span>
      ),
    },
    {
      key: "seatNo",
      header: "Seat Number",
      render: (row) => (
        <span className="font-bold text-[#14264B]">
          {row.seatNo}
        </span>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <Lock size={13} className="text-[#A8212F]" />
          {row.room}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: "issuedOn",
      header: "Issued On",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.issuedOn || "Not issued"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="View hall ticket"
            onClick={() => setSelectedTicket(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DBE9F5] text-[#14264B] transition hover:bg-[#c6dcef]"
          >
            <Eye size={14} />
          </button>

          {row.status === "pending" && (
            <button
              type="button"
              title="Issue ticket"
              onClick={() => issueTicket(row)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7F1] text-emerald-700 transition hover:bg-emerald-100"
            >
              <CheckCircle2 size={14} />
            </button>
          )}

          {row.status === "blocked" && (
            <button
              type="button"
              title="Unblock ticket"
              onClick={() => unblockTicket(row)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F9ECEE] text-[#A8212F] transition hover:bg-[#f4d2d7]"
            >
              <Unlock size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="aisc-premium space-y-6">

      {/* Page heading */}
      <section className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow">
            <Sparkles size={13} />
            Examination Cell · Academic year 2026–27
          </div>

          <h1 className="aisc-page-title">
            Hall Tickets
          </h1>

          <p className="aisc-page-subtitle">
            Generate, review and manage student examination hall tickets,
            seat numbers and examination room allocations.
          </p>
        </div>

        <div className="aisc-date-chip">
          <CalendarDays size={14} />
          Examination Administration
        </div>
      </section>

      {/* Hero */}
      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker">
            <Sparkles size={12} />
            ABEDA INAMDAR SENIOR COLLEGE
          </div>

          <h2 className="aisc-hero-title">
            Every student, exam-ready.
          </h2>

          <p className="aisc-hero-text">
            Prepare examination passes, verify student eligibility,
            manage seat allocations and issue hall tickets through
            one organised examination workspace.
          </p>

          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={generatePendingTickets}
            >
              <Printer size={15} />
              Generate pending
            </button>

            <button
              type="button"
              className="aisc-btn aisc-btn-glass"
              onClick={handleExport}
            >
              <Download size={15} />
              Export register
            </button>
          </div>
        </div>

        <div className="aisc-hero-seal">
          <Ticket size={76} strokeWidth={1.1} />
        </div>
      </section>

      {/* Statistics */}
      <section className="aisc-grid aisc-kpis">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              className="aisc-kpi"
              key={stat.label}
              style={{
                "--kpi-color": stat.color,
                "--kpi-soft": stat.soft,
                "--progress": stat.progress,
              }}
            >
              <div className="aisc-kpi-top">
                <div className="aisc-kpi-icon">
                  <Icon size={19} />
                </div>

                <span className="aisc-kpi-change">
                  {stat.change}
                </span>
              </div>

              <div className="aisc-kpi-label">
                {stat.label}
              </div>

              <div className="aisc-kpi-value">
                {stat.value}
              </div>

              <div className="aisc-kpi-note">
                Current examination cycle
              </div>

              <div className="aisc-kpi-track">
                <span />
              </div>
            </article>
          );
        })}
      </section>

      {/* Hall Ticket Register */}
      <section className="aisc-panel">
        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">
              Hall Ticket Register
            </h3>

            <p className="aisc-panel-sub">
              Student-wise hall ticket status and examination details
            </p>
          </div>

          <span className="aisc-panel-link">
            <Users size={14} />
            {filteredRows.length} student records
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#FBF6EE] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search student, roll number or seat..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
            <Select
              value={sessionFilter}
              onChange={(event) => {
                setSessionFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter hall tickets by session"
              className="min-w-[190px]"
            >
              <option value="all">All sessions</option>
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter hall tickets by status"
              className="min-w-[150px]"
            >
              <option value="all">All statuses</option>
              <option value="issued">Issued</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="aisc-table-wrap overflow-x-auto">
          <DataTable
            columns={columns}
            rows={pageRows}
            emptyTitle="No hall tickets found"
            emptyDescription="Try adjusting the search or filters."
          />
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            Showing{" "}
            <strong className="text-[#14264B]">
              {pageRows.length}
            </strong>{" "}
            of{" "}
            <strong className="text-[#14264B]">
              {filteredRows.length}
            </strong>{" "}
            hall tickets
          </p>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </section>

      {/* Hall Ticket Preview */}
      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title="Hall Ticket Preview"
        description={selectedTicket?.id}
        size="lg"
        footer={
          <>
            {selectedTicket?.status === "pending" && (
              <Button onClick={() => issueTicket(selectedTicket)}>
                <CheckCircle2 size={14} />
                Issue ticket
              </Button>
            )}

            {selectedTicket?.status === "blocked" && (
              <Button onClick={() => unblockTicket(selectedTicket)}>
                <Unlock size={14} />
                Unblock ticket
              </Button>
            )}

            {selectedTicket?.status === "issued" && (
              <Button onClick={handlePrint}>
                <Printer size={14} />
                Print ticket
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => setSelectedTicket(null)}
            >
              Close
            </Button>
          </>
        }
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div
              id="hall-ticket-print"
              className="overflow-hidden rounded-xl border-2 border-[#14264B] bg-white"
            >
              {/* Ticket Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#14264B] to-[#A8212F] p-5 text-white">
                <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[18px] border-white/10" />

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F2C200]">
                      Abeda Inamdar Senior College
                    </p>

                    <h2 className="mt-2 text-lg font-extrabold">
                      Examination Hall Ticket
                    </h2>

                    <p className="mt-1 text-xs text-white/75">
                      Student examination pass
                    </p>
                  </div>

                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10">
                    <Ticket size={25} className="text-[#F2C200]" />
                  </div>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Student name
                    </p>

                    <p className="mt-1 text-lg font-extrabold text-[#14264B]">
                      {selectedTicket.student}
                    </p>
                  </div>

                  <Badge variant={getStatusVariant(selectedTicket.status)}>
                    {formatStatus(selectedTicket.status)}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-[#F3F7FB] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Roll number
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#14264B]">
                      {selectedTicket.rollNo}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#F3F7FB] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Program
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#14264B]">
                      {selectedTicket.program}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#F3F7FB] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Exam session
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#14264B]">
                      {selectedTicket.session}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#F3F7FB] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Ticket reference
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#14264B]">
                      {selectedTicket.id}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#F2C200]/50 bg-[#FBF6EE] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Seat number
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-[#A8212F]">
                      {selectedTicket.seatNo}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#F2C200]/50 bg-[#FBF6EE] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Examination room
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-[#A8212F]">
                      {selectedTicket.room}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-300 pt-3 text-xs text-slate-500">
                  <span>
                    Issued on: {selectedTicket.issuedOn || "Not issued"}
                  </span>

                  <span className="font-semibold text-[#14264B]">
                    AISC Examination Cell
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#DBE9F5] bg-[#DBE9F5]/40 p-4">
              <p className="text-xs font-bold text-[#14264B]">
                <GraduationCap size={15} className="mr-2 inline text-[#A8212F]" />
                Examination instructions
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Candidates must carry a printed hall ticket and a valid
                college ID to the examination hall. Report at least
                30 minutes before the examination begins.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Print-only ticket styling */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            #hall-ticket-print,
            #hall-ticket-print * {
              visibility: visible !important;
            }

            #hall-ticket-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              border: 2px solid #14264B !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}