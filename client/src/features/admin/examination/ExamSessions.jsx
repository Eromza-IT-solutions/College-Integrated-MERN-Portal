import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  Users,
} from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { examSessions } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 5;

export default function ExamSessions() {
  const [rows, setRows] = useState(examSessions);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [form, setForm] = useState({
    name: "",
    term: "Odd Semester 2026-27",
    startDate: "",
    endDate: "",
    status: "draft",
  });

  const terms = useMemo(
    () => [...new Set(rows.map((row) => row.term))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name.toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesTerm = termFilter === "all" || row.term === termFilter;

      return matchesSearch && matchesStatus && matchesTerm;
    });
  }, [query, rows, statusFilter, termFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    active: rows.filter((row) => row.status === "active").length,
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    completed: rows.filter((row) => row.status === "completed").length,
    draft: rows.filter((row) => row.status === "draft").length,
  };

  const handleExport = () => {
    downloadCsv("eromza-exam-sessions.csv", [
      ["Session", "Name", "Term", "Start date", "End date", "Status"],
      ...filteredRows.map((row) => [
        row.id,
        row.name,
        row.term,
        row.startDate,
        row.endDate,
        row.status,
      ]),
    ]);
  };

  const handleCreateSession = (event) => {
    event.preventDefault();

    if (!form.name.trim()) return;

    const nextRow = {
      id: `SES-${Date.now()}`,
      name: form.name.trim(),
      term: form.term,
      startDate: form.startDate.trim() || "To be announced",
      endDate: form.endDate.trim() || "To be announced",
      status: form.status,
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      name: "",
      term: "Odd Semester 2026-27",
      startDate: "",
      endDate: "",
      status: "draft",
    });
    setIsCreateOpen(false);
    setPage(1);
  };

  const columns = [
    {
      key: "name",
      header: "Session",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.name}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
        </div>
      ),
    },
    {
      key: "term",
      header: "Term",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.term}</span>
      ),
    },
    {
      key: "dates",
      header: "Dates",
      render: (row) => (
        <span className="text-xs text-eromza-muted">
          {row.startDate} – {row.endDate}
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
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedSession(row)}
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
        title="Exam Sessions"
        description="Create and manage examination cycles for each semester and term."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export sessions
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              Create session
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Sessions"
          value={String(counts.active)}
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Scheduled"
          value={String(counts.scheduled)}
          icon={CalendarClock}
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={String(counts.completed)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Drafts"
          value={String(counts.draft)}
          icon={FileText}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader
          title="Session calendar"
          description="Current, upcoming, and completed examination sessions"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by session name or ID..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={termFilter}
              onChange={(event) => {
                setTermFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by term"
              className="min-w-[190px]"
            >
              <option value="all">All terms</option>
              {terms.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by session status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No exam sessions found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} sessions
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create exam session"
        description="Set up a new examination cycle and its date range."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="session-form">
              Create session
            </Button>
          </>
        }
      >
        <form id="session-form" onSubmit={handleCreateSession} className="space-y-4">
          <Input
            label="Session name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Semester V Internal"
            required
          />

          <Select
            label="Term"
            value={form.term}
            onChange={(event) => setForm({ ...form, term: event.target.value })}
          >
            <option value="Odd Semester 2026-27">Odd Semester 2026-27</option>
            <option value="Even Semester 2025-26">Even Semester 2025-26</option>
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              value={form.startDate}
              onChange={(event) =>
                setForm({ ...form, startDate: event.target.value })
              }
              placeholder="e.g. 18 Nov 2026"
            />
            <Input
              label="End date"
              value={form.endDate}
              onChange={(event) =>
                setForm({ ...form, endDate: event.target.value })
              }
              placeholder="e.g. 25 Nov 2026"
            />
          </div>

          <Select
            label="Status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.name ?? "Exam session"}
        description={selectedSession?.id}
        footer={
          <Button variant="secondary" onClick={() => setSelectedSession(null)}>
            Close
          </Button>
        }
      >
        {selectedSession ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedSession.status)}>
                {formatStatus(selectedSession.status)}
              </Badge>
              <Badge variant="neutral">{selectedSession.term}</Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Start date
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedSession.startDate}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  End date
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedSession.endDate}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Registered students
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-eromza-text">
                  <Users size={15} className="text-eromza-subtle" />
                  1,248 students across 42 subjects
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
