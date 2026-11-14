import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Printer,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { examHallTickets } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

export default function HallTickets() {
  const [rows, setRows] = useState(examHallTickets);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const sessions = useMemo(
    () => [...new Set(rows.map((row) => row.session))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.student.toLowerCase().includes(search) ||
        row.rollNo.toLowerCase().includes(search) ||
        row.seatNo.toLowerCase().includes(search);
      const matchesSession =
        sessionFilter === "all" || row.session === sessionFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesSession && matchesStatus;
    });
  }, [query, rows, sessionFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    issued: rows.filter((row) => row.status === "issued").length,
    pending: rows.filter((row) => row.status === "pending").length,
    blocked: rows.filter((row) => row.status === "blocked").length,
    total: rows.length,
  };

  const handleExport = () => {
    downloadCsv("eromza-hall-tickets.csv", [
      ["Ticket", "Student", "Roll number", "Program", "Session", "Seat", "Room", "Status"],
      ...filteredRows.map((row) => [
        row.id,
        row.student,
        row.rollNo,
        row.program,
        row.session,
        row.seatNo,
        row.room,
        row.status,
      ]),
    ]);
  };

  const issueTicket = (ticket) => {
    setRows((current) =>
      current.map((row) =>
        row.id === ticket.id
          ? { ...row, status: "issued", issuedOn: "Today" }
          : row,
      ),
    );
    setSelectedTicket((current) =>
      current ? { ...current, status: "issued", issuedOn: "Today" } : current,
    );
  };

  const generatePendingTickets = () => {
    setRows((current) =>
      current.map((row) =>
        row.status === "pending"
          ? { ...row, status: "issued", issuedOn: "Today" }
          : row,
      ),
    );
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.student}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.rollNo}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.program}</span>
      ),
    },
    {
      key: "session",
      header: "Exam session",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.session}</span>
      ),
    },
    {
      key: "seatNo",
      header: "Seat",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">{row.seatNo}</span>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.room}</span>
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
      header: "Issued on",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.issuedOn}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTicket(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Eye size={14} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Examination administration"
        title="Hall Tickets"
        description="Generate, review, and issue examination hall tickets with seat and room allocations."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export hall tickets
            </Button>
            <Button onClick={generatePendingTickets}>
              <Printer size={16} />
              Generate pending
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Issued"
          value={String(counts.issued)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Pending"
          value={String(counts.pending)}
          icon={Clock3}
          tone="warning"
        />
        <StatCard
          label="Blocked"
          value={String(counts.blocked)}
          icon={ShieldAlert}
          tone="accent"
        />
        <StatCard
          label="Total Tickets"
          value={String(counts.total)}
          icon={Ticket}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Hall ticket register"
          description="Student-wise hall ticket status for active examination sessions"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by student, roll number, or seat..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
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
              <option value="all">All status</option>
              <option value="issued">Issued</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No hall tickets found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} hall tickets
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title="Hall ticket preview"
        description={selectedTicket?.id}
        size="lg"
        footer={
          <>
            {selectedTicket?.status === "pending" ? (
              <Button onClick={() => issueTicket(selectedTicket)}>
                <Printer size={14} />
                Issue hall ticket
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
              Close
            </Button>
          </>
        }
      >
        {selectedTicket ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-eromza-sidebar p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                Examination hall ticket
              </p>
              <p className="mt-2 text-xl font-semibold">{selectedTicket.student}</p>
              <p className="mt-1 text-xs text-white/70">
                {selectedTicket.rollNo} · {selectedTicket.program}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant={getStatusVariant(selectedTicket.status)}>
                  {formatStatus(selectedTicket.status)}
                </Badge>
                <Badge variant="neutral">{selectedTicket.session}</Badge>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Seat number
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedTicket.seatNo}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Examination room
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedTicket.room}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Issued on
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedTicket.issuedOn}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Ticket reference
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedTicket.id}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg bg-eromza-bg p-3 text-xs leading-5 text-eromza-muted">
              Candidates must carry a printed hall ticket and a valid college ID
              to the examination hall. Report at least 30 minutes before the exam
              begins.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
