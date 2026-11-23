import { useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Download,
  Pencil,
  Printer,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import ErrorState from "../../../components/ui/ErrorState";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import Modal from "../../../components/ui/Modal";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import {
  downloadAdminHallTicketPdf,
  fetchExamTickets,
  fetchExams,
  generateHallTickets,
  updateHallTicket,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import { downloadCsv } from "../../../utils/csv";
import { formatDateTime } from "../../../utils/examAdmin";
import { formatDate } from "../../../utils/format";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const EMPTY_EDIT = {
  seatNumber: "",
  room: "",
  status: "issued",
};

export default function HallTickets() {
  const exams = useApiData(() => fetchExams());
  const [selectedExamId, setSelectedExamId] = useState("");
  const [query, setQuery] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = exams.data ?? [];
  const activeExam =
    rows.find((exam) => String(exam._id) === String(selectedExamId)) || rows[0];
  const tickets = useApiData(
    () => (activeExam ? fetchExamTickets(activeExam._id) : Promise.resolve([])),
    activeExam?._id || "none",
  );

  const ticketRows = useMemo(() => {
    const list = tickets.data ?? [];
    const search = query.trim().toLowerCase();
    if (!search) return list;
    return list.filter((ticket) =>
      [ticket.fullName, ticket.enrollmentNumber, ticket.seatNumber, ticket.room]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [query, tickets.data]);

  const counts = {
    total: (tickets.data ?? []).length,
    issued: (tickets.data ?? []).filter((ticket) => ticket.status === "issued").length,
    pending: (tickets.data ?? []).filter((ticket) => ticket.status === "pending").length,
    blocked: (tickets.data ?? []).filter((ticket) => ticket.status === "blocked").length,
  };

  const openEdit = (ticket) => {
    setEditing(ticket);
    setEditForm({
      seatNumber: ticket.seatNumber || "",
      room: ticket.room || "",
      status: ticket.status || "issued",
    });
    setError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setEditForm(EMPTY_EDIT);
    setError("");
  };

  const handleGenerate = async () => {
    if (!activeExam) return;
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await generateHallTickets(activeExam._id, { overwrite });
      setMessage(
        `Generated ${result.created ?? 0} ticket(s), updated ${result.updated ?? 0}, skipped ${result.skipped ?? 0}.`,
      );
      setGenerateOpen(false);
      setOverwrite(false);
      tickets.reload();
      exams.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editForm.seatNumber.trim() || !editForm.room.trim()) {
      setError("Seat number and room are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateHallTicket(editing._id, {
        seatNumber: editForm.seatNumber.trim(),
        room: editForm.room.trim(),
        status: editForm.status,
      });
      setMessage("Hall ticket updated.");
      closeEdit();
      tickets.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv("aisc-hall-tickets.csv", [
      ["Student", "Enrollment", "Seat", "Room", "Status", "Issued"],
      ...ticketRows.map((ticket) => [
        ticket.fullName,
        ticket.enrollmentNumber,
        ticket.seatNumber,
        ticket.room,
        ticket.status,
        ticket.issuedAt,
      ]),
    ]);
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (ticket) => (
        <div>
          <div className="aisc-table-primary">{ticket.fullName}</div>
          <div className="aisc-table-secondary">{ticket.enrollmentNumber}</div>
        </div>
      ),
    },
    {
      key: "exam",
      header: "Examination",
      render: (ticket) => (
        <div>
          <div className="text-xs font-semibold text-[#14264B]">{ticket.examName}</div>
          <div className="aisc-table-secondary">
            {ticket.programName || "Program"} · Semester {ticket.semester}
          </div>
        </div>
      ),
    },
    {
      key: "seat",
      header: "Seat / Room",
      render: (ticket) => (
        <div>
          <div className="font-bold text-[#14264B]">{ticket.seatNumber || "Not allotted"}</div>
          <div className="aisc-table-secondary">{ticket.room || "Room not set"}</div>
        </div>
      ),
    },
    {
      key: "issued",
      header: "Issued",
      render: (ticket) => (
        <span className="text-xs text-slate-600">
          {ticket.issuedAt ? formatDate(ticket.issuedAt) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (ticket) => (
        <Badge variant={getStatusVariant(ticket.status)}>{formatStatus(ticket.status)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (ticket) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Download hall ticket"
            className="aisc-action-btn"
            onClick={() => downloadAdminHallTicketPdf(ticket)}
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            title="Edit seating"
            className="aisc-action-btn"
            onClick={() => openEdit(ticket)}
          >
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
  ];

  const stats = [
    { label: "Total Tickets", value: counts.total, icon: Users, color: "#315FCE", soft: "#EEF3FF" },
    { label: "Issued", value: counts.issued, icon: CheckCircle2, color: "#2C9271", soft: "#EAF7F1" },
    { label: "Pending", value: counts.pending, icon: CalendarDays, color: "#B58A16", soft: "#FFF7DF" },
    { label: "Blocked", value: counts.blocked, icon: Award, color: "#A8212F", soft: "#F9ECEE" },
  ];

  return (
    <div className="aisc-premium space-y-6">
      <section className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13} /> Examination Cell</div>
          <h1 className="aisc-page-title">Hall Tickets</h1>
          <p className="aisc-page-subtitle">
            Generate and manage hall tickets for approved examination forms.
          </p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14} /> {formatDate(activeExam?.formClosesAt)}</div>
      </section>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><Printer size={12} /> EXAMINATION OPERATIONS</div>
          <h2 className="aisc-hero-title">Hall Ticket Register</h2>
          <p className="aisc-hero-text">
            Generate tickets from approved forms and a complete timetable. Seat numbers are unique per examination and can be adjusted here.
          </p>
          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={() => setGenerateOpen(true)}
              disabled={!activeExam}
            >
              <RefreshCw size={15} /> Generate hall tickets
            </button>
            <button type="button" className="aisc-btn aisc-btn-glass" onClick={handleExport}>
              <Download size={15} /> Export register
            </button>
          </div>
        </div>
        <div className="aisc-hero-seal"><Award size={76} strokeWidth={1.1} /></div>
      </section>

      <section className="aisc-grid aisc-kpis">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              className="aisc-kpi"
              key={stat.label}
              style={{ "--kpi-color": stat.color, "--kpi-soft": stat.soft, "--progress": counts.total ? `${(stat.value / counts.total) * 100}%` : "0%" }}
            >
              <div className="aisc-kpi-top"><div className="aisc-kpi-icon"><Icon size={19} /></div></div>
              <div className="aisc-kpi-label">{stat.label}</div>
              <div className="aisc-kpi-value">{stat.value}</div>
              <div className="aisc-kpi-note">Current examination session</div>
              <div className="aisc-kpi-track"><span /></div>
            </article>
          );
        })}
      </section>

      <section className="aisc-panel">
        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">Issued Hall Tickets</h3>
            <p className="aisc-panel-sub">Issued tickets and seating for the selected session</p>
          </div>
          <Select
            value={activeExam?._id || ""}
            onChange={(event) => {
              setSelectedExamId(event.target.value);
              setMessage("");
              setError("");
            }}
            aria-label="Choose examination session"
            className="min-w-[260px]"
            disabled={!rows.length}
          >
            {rows.length === 0 ? <option value="">No sessions available</option> : null}
            {rows.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.name} · Semester {exam.semester}
              </option>
            ))}
          </Select>
        </div>

        <div className="border-b border-slate-100 bg-[#FBF6EE] p-4">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student, enrollment, seat or room..."
            className="max-w-md"
          />
        </div>

        {exams.loading || tickets.loading ? (
          <Loader label="Loading hall tickets..." />
        ) : exams.error || tickets.error ? (
          <ErrorState
            title="Could not load hall tickets"
            description={exams.error?.message || tickets.error?.message}
            onRetry={() => {
              exams.reload();
              tickets.reload();
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={ticketRows}
            getRowKey={(ticket) => ticket._id}
            emptyTitle="No hall tickets found"
            emptyDescription="Generate tickets once exam forms are approved and the timetable is complete."
          />
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium">
            {message ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 size={14} /> {message}
              </span>
            ) : null}
            {error ? <span className="text-red-600">{error}</span> : null}
            {!message && !error ? (
              <span className="text-slate-500">
                {ticketRows.length} ticket{ticketRows.length === 1 ? "" : "s"} shown
              </span>
            ) : null}
          </div>
          <Badge variant="neutral">
            {activeExam ? formatDateTime(activeExam.formOpensAt) : "No session"}
          </Badge>
        </div>
      </section>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate Hall Tickets"
        description={activeExam ? `${activeExam.name} · Semester ${activeExam.semester}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate tickets"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          ) : null}
          <p className="text-sm leading-6 text-slate-600">
            Tickets are generated for approved forms. Every form subject must have a paper in the timetable.
          </p>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#A8212F]"
            />
            <span>
              <span className="block text-sm font-semibold text-[#14264B]">Replace existing tickets</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Rebuild seats and rooms for every approved form in this session.
              </span>
            </span>
          </label>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={closeEdit}
        title="Edit Hall Ticket"
        description={editing ? `${editing.fullName} · ${editing.enrollmentNumber}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save ticket"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Seat number *"
              value={editForm.seatNumber}
              onChange={(event) => {
                setEditForm((current) => ({ ...current, seatNumber: event.target.value }));
                setError("");
              }}
            />
            <Input
              label="Room *"
              value={editForm.room}
              onChange={(event) => {
                setEditForm((current) => ({ ...current, room: event.target.value }));
                setError("");
              }}
            />
          </div>

          <Select
            label="Status"
            value={editForm.status}
            onChange={(event) => {
              setEditForm((current) => ({ ...current, status: event.target.value }));
              setError("");
            }}
          >
            <option value="pending">Pending</option>
            <option value="issued">Issued</option>
            <option value="blocked">Blocked</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}
