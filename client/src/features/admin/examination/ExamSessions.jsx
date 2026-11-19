import { useMemo, useState } from "react";
import {
  Sparkles,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  Users,
  GraduationCap,
  Search,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";

import { examSessions } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";
import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 5;

const EMPTY_FORM = {
  name: "",
  term: "Odd Semester 2026-27",
  startDate: "",
  endDate: "",
  status: "draft",
};

const statusColors = {
  active: "#2C9271",
  scheduled: "#B58A16",
  completed: "#315FCE",
  draft: "#A8212F",
};

export default function ExamSessions() {
  const [rows, setRows] = useState(examSessions);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const terms = useMemo(
    () => [...new Set(rows.map((row) => row.term).filter(Boolean))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name?.toLowerCase().includes(search) ||
        row.id?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      const matchesTerm =
        termFilter === "all" || row.term === termFilter;

      return matchesSearch && matchesStatus && matchesTerm;
    });
  }, [query, rows, statusFilter, termFilter]);

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
    total: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    completed: rows.filter((row) => row.status === "completed").length,
    draft: rows.filter((row) => row.status === "draft").length,
  };

  const handleExport = () => {
    downloadCsv("aisc-exam-sessions.csv", [
      ["Session ID", "Session Name", "Academic Term", "Start Date", "End Date", "Status"],
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

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setForm(EMPTY_FORM);
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
    closeCreateModal();
    setPage(1);
  };

  const columns = [
    {
      key: "name",
      header: "Examination Session",
      render: (row) => (
        <div className="min-w-0">
          <div className="aisc-table-primary">{row.name}</div>
          <div className="aisc-table-secondary">
            Session ID: {row.id}
          </div>
        </div>
      ),
    },
    {
      key: "term",
      header: "Academic Term",
      render: (row) => (
        <span className="text-xs font-semibold text-[#14264B]">
          {row.term}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Examination Period",
      render: (row) => (
        <div className="text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-[#A8212F]" />
            {row.startDate}
          </div>
          <div className="aisc-table-secondary mt-1">
            To {row.endDate}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Current Status",
      render: (row) => (
        <span
          className="aisc-status"
          style={{
            borderColor: `${statusColors[row.status] || "#64748b"}35`,
            background: `${statusColors[row.status] || "#64748b"}12`,
            color: statusColors[row.status] || "#64748b",
          }}
        >
          {formatStatus(row.status)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Details",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedSession(row)}
          className="!rounded-lg !font-semibold !text-[#14264B] hover:!bg-[#DBE9F5]"
          title="View session details"
        >
          <Eye size={15} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="aisc-premium">
      {/* Page heading */}
      <div className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow">
            <Sparkles size={13} />
            Examination Cell · Academic year 2026–27
          </div>

          <h1 className="aisc-page-title">Exam Sessions</h1>

          <p className="aisc-page-subtitle">
            Create, monitor and manage examination cycles across academic
            semesters through one unified examination workspace.
          </p>
        </div>

        <div className="aisc-date-chip">
          <CalendarDays size={14} />
          Odd Semester · 2026–27
        </div>
      </div>

      {/* Hero */}
      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker">
            <GraduationCap size={13} />
            ABEDA INAMDAR SENIOR COLLEGE
          </div>

          <h2 className="aisc-hero-title">
            Every examination begins with a well-planned session.
          </h2>

          <p className="aisc-hero-text">
            Organise academic examination cycles, monitor session progress,
            manage semester schedules and keep examination administration
            running smoothly.
          </p>

          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={openCreateModal}
            >
              Create new session
              <Plus size={15} />
            </button>

            <button
              type="button"
              className="aisc-btn aisc-btn-glass"
              onClick={handleExport}
            >
              Export sessions
              <Download size={15} />
            </button>
          </div>
        </div>

        <div className="aisc-hero-seal">
          <div className="flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-white/10 text-[#F2C200]">
            <GraduationCap size={62} strokeWidth={1.2} />
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <section className="aisc-grid aisc-kpis">
        {[
          {
            label: "Total Sessions",
            value: counts.total,
            note: "All examination cycles",
            icon: CalendarDays,
            color: "#315FCE",
            soft: "#EEF3FF",
            progress: "100%",
          },
          {
            label: "Active Sessions",
            value: counts.active,
            note: "Currently ongoing",
            icon: CheckCircle2,
            color: "#2C9271",
            soft: "#EAF7F1",
            progress: `${counts.total ? (counts.active / counts.total) * 100 : 0}%`,
          },
          {
            label: "Scheduled",
            value: counts.scheduled,
            note: "Upcoming examinations",
            icon: CalendarClock,
            color: "#B58A16",
            soft: "#FFF7DF",
            progress: `${counts.total ? (counts.scheduled / counts.total) * 100 : 0}%`,
          },
          {
            label: "Completed",
            value: counts.completed,
            note: "Successfully concluded",
            icon: FileText,
            color: "#A8212F",
            soft: "#F9ECEE",
            progress: `${counts.total ? (counts.completed / counts.total) * 100 : 0}%`,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="aisc-kpi"
              key={item.label}
              style={{
                "--kpi-color": item.color,
                "--kpi-soft": item.soft,
                "--progress": item.progress,
              }}
            >
              <div className="aisc-kpi-top">
                <div className="aisc-kpi-icon">
                  <Icon size={19} />
                </div>
                <span className="aisc-kpi-change">
                  {item.progress}
                </span>
              </div>

              <div className="aisc-kpi-label">{item.label}</div>
              <div className="aisc-kpi-value">{item.value}</div>
              <div className="aisc-kpi-note">{item.note}</div>

              <div className="aisc-kpi-track">
                <span />
              </div>
            </article>
          );
        })}
      </section>

      {/* Session overview panels */}
      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div>
              <h3 className="aisc-panel-title">Session status overview</h3>
              <p className="aisc-panel-sub">
                Current distribution of examination sessions
              </p>
            </div>
            <CalendarClock size={19} color="#A8212F" />
          </div>

          <div className="aisc-progress-list">
            {[
              { label: "Active sessions", value: counts.active, color: "#14264B" },
              { label: "Scheduled sessions", value: counts.scheduled, color: "#D2A72C" },
              { label: "Completed sessions", value: counts.completed, color: "#2C9271" },
              { label: "Draft sessions", value: counts.draft, color: "#A8212F" },
            ].map((item) => (
              <div key={item.label}>
                <div className="aisc-progress-top">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="aisc-progress-track">
                  <span
                    style={{
                      "--progress": `${
                        counts.total
                          ? (item.value / counts.total) * 100
                          : 0
                      }%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

       <article className="aisc-panel">
  <div className="aisc-panel-head">
    <div>
      <h3 className="aisc-panel-title">
        Academic session summary
      </h3>
      <p className="aisc-panel-sub">
        Examination planning at a glance
      </p>
    </div>

    <GraduationCap size={20} color="#A8212F" />
  </div>

  <div className="space-y-4 p-5">
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
      <span className="min-w-0 text-sm font-medium text-slate-600">
        Academic terms
      </span>
      <strong className="shrink-0 text-2xl font-extrabold leading-none text-[#14264B]">
        {terms.length}
      </strong>
    </div>

    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
      <span className="min-w-0 text-sm font-medium text-slate-600">
        Draft sessions
      </span>
      <strong className="shrink-0 text-2xl font-extrabold leading-none text-[#A8212F]">
        {counts.draft}
      </strong>
    </div>

    <div className="flex items-center justify-between gap-4">
      <span className="min-w-0 text-sm font-medium text-slate-600">
        Completed sessions
      </span>
      <strong className="shrink-0 text-2xl font-extrabold leading-none text-[#2C9271]">
        {counts.completed}
      </strong>
    </div>
  </div>

  <div className="mx-5 mb-5 rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-3">
    <div className="flex items-start gap-2">
      <CalendarDays
        size={17}
        className="mt-0.5 shrink-0 text-[#A8212F]"
      />
      <p className="text-xs leading-5 text-[#14264B]">
        <strong>Academic year 2026–27:</strong> Review session dates
        and status regularly to keep examination schedules updated.
      </p>
    </div>
  </div>
</article>
      </section>

      {/* Session register */}
      <section className="aisc-panel">
        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">Session Calendar</h3>
            <p className="aisc-panel-sub">
              Examination cycles and academic schedules
            </p>
          </div>

          <span className="aisc-panel-link">
            {filteredRows.length} sessions found
            <ArrowUpRight size={13} />
          </span>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 bg-[#FBF6EE] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search session name or ID..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={termFilter}
              onChange={(event) => {
                setTermFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by academic term"
              className="min-w-[190px]"
            >
              <option value="all">All academic terms</option>
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
              className="min-w-[160px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        <div className="aisc-table-wrap">
          <DataTable
            columns={columns}
            rows={pageRows}
            emptyTitle="No exam sessions found"
            emptyDescription="Try changing your search term or filters to find a session."
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-[#FBF6EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            Showing{" "}
            <strong className="text-[#14264B]">{pageRows.length}</strong>
            {" "}of{" "}
            <strong className="text-[#14264B]">{filteredRows.length}</strong>
            {" "}sessions
          </p>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </section>

      {/* Create session modal */}
      <Modal
        open={isCreateOpen}
        onClose={closeCreateModal}
        title="Create Exam Session"
        description="Set up a new examination cycle and its academic date range."
        footer={
          <>
            <Button variant="secondary" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button type="submit" form="session-form">
              <Plus size={15} />
              Create session
            </Button>
          </>
        }
      >
        <form
          id="session-form"
          onSubmit={handleCreateSession}
          className="space-y-4"
        >
          <div className="aisc-callout">
            <GraduationCap size={17} />
            <span>
              <strong>Academic examination setup:</strong> Enter the session
              information and select its academic term.
            </span>
          </div>

          <Input
            label="Session name"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            placeholder="e.g. Semester V Internal Examination"
            required
          />

          <Select
            label="Academic term"
            value={form.term}
            onChange={(event) =>
              setForm({ ...form, term: event.target.value })
            }
          >
            <option value="Odd Semester 2026-27">
              Odd Semester 2026-27
            </option>
            <option value="Even Semester 2025-26">
              Even Semester 2025-26
            </option>
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
            label="Session status"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </form>
      </Modal>

      {/* View session modal */}
      <Modal
        open={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.name ?? "Exam session"}
        description={selectedSession?.id}
        footer={
          <Button
            variant="secondary"
            onClick={() => setSelectedSession(null)}
          >
            Close
          </Button>
        }
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedSession.status)}>
                {formatStatus(selectedSession.status)}
              </Badge>
              <Badge variant="neutral">{selectedSession.term}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Start date</div>
                <div className="aisc-kpi-value mt-2">
                  {selectedSession.startDate}
                </div>
              </div>

              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">End date</div>
                <div className="aisc-kpi-value mt-2">
                  {selectedSession.endDate}
                </div>
              </div>

              <div className="aisc-detail-box sm:col-span-2">
                <div className="aisc-kpi-label">Registered students</div>
                <div className="aisc-kpi-value mt-2 flex items-center gap-2">
                  <Users size={18} className="text-[#A8212F]" />
                  1,248 students across 42 subjects
                </div>
              </div>
            </div>

            <div className="aisc-callout">
              <CheckCircle2 size={17} />
              <span>
                <strong>Session information:</strong> This panel displays
                the available examination session details.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}