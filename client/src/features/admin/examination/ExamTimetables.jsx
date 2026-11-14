import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Download,
  Eye,
  MapPin,
  Plus,
  Send,
  UserRound,
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
import { examTimetables } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

export default function ExamTimetables() {
  const [rows, setRows] = useState(examTimetables);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    session: "Semester V Internal",
    program: "B.Com",
    subject: "",
    date: "",
    time: "10:00 AM",
    room: "Hall A",
    status: "draft",
  });

  const sessions = useMemo(
    () => [...new Set(rows.map((row) => row.session))],
    [rows],
  );

  const rooms = useMemo(
    () => [...new Set(rows.map((row) => row.room))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.subject.toLowerCase().includes(search) ||
        row.program.toLowerCase().includes(search) ||
        row.invigilator.toLowerCase().includes(search);
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
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    published: rows.filter((row) => row.status === "published").length,
    draft: rows.filter((row) => row.status === "draft").length,
    rooms: rooms.length,
  };

  const handleExport = () => {
    downloadCsv("eromza-exam-timetables.csv", [
      ["Session", "Program", "Subject", "Date", "Time", "Room", "Invigilator", "Status"],
      ...filteredRows.map((row) => [
        row.session,
        row.program,
        row.subject,
        row.date,
        `${row.time} - ${row.endTime}`,
        row.room,
        row.invigilator,
        row.status,
      ]),
    ]);
  };

  const handleAddExam = (event) => {
    event.preventDefault();

    if (!form.subject.trim() || !form.date.trim()) return;

    const nextRow = {
      id: `TTM-${Date.now()}`,
      session: form.session,
      program: form.program,
      semester: "To be confirmed",
      subject: form.subject.trim(),
      date: form.date.trim(),
      time: form.time,
      endTime: "To be confirmed",
      room: form.room,
      invigilator: "To be assigned",
      status: form.status,
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      session: "Semester V Internal",
      program: "B.Com",
      subject: "",
      date: "",
      time: "10:00 AM",
      room: "Hall A",
      status: "draft",
    });
    setIsAddOpen(false);
    setPage(1);
  };

  const publishExam = () => {
    if (!selectedExam) return;

    setRows((current) =>
      current.map((row) =>
        row.id === selectedExam.id ? { ...row, status: "published" } : row,
      ),
    );
    setSelectedExam((current) =>
      current ? { ...current, status: "published" } : current,
    );
  };

  const columns = [
    {
      key: "date",
      header: "Date & time",
      render: (row) => (
        <div className="min-w-0">
          <p className="text-xs font-semibold text-eromza-text">{row.date}</p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.time} – {row.endTime}
          </p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.subject}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.session}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-eromza-muted">{row.program}</p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.semester}</p>
        </div>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-eromza-muted">
          <MapPin size={13} />
          {row.room}
        </span>
      ),
    },
    {
      key: "invigilator",
      header: "Invigilator",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.invigilator}</span>
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
          onClick={() => setSelectedExam(row)}
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
        title="Exam Timetables"
        description="Schedule subject examinations, assign rooms and invigilators, and publish timetables."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export timetable
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              Add exam
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Scheduled Exams"
          value={String(counts.scheduled)}
          icon={CalendarClock}
          tone="warning"
        />
        <StatCard
          label="Published"
          value={String(counts.published)}
          icon={Send}
          tone="success"
        />
        <StatCard
          label="Drafts"
          value={String(counts.draft)}
          icon={CalendarDays}
          tone="info"
        />
        <StatCard
          label="Exam Rooms"
          value={String(counts.rooms)}
          icon={MapPin}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader
          title="Examination timetable"
          description="Scheduled and published examinations across active sessions"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by subject, program, or invigilator..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={sessionFilter}
              onChange={(event) => {
                setSessionFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter timetable by session"
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
              aria-label="Filter timetable by status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No exams found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} exams
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add examination"
        description="Schedule a subject examination in an active exam session."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="timetable-form">
              Add exam
            </Button>
          </>
        }
      >
        <form id="timetable-form" onSubmit={handleAddExam} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Session"
              value={form.session}
              onChange={(event) =>
                setForm({ ...form, session: event.target.value })
              }
            >
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </Select>

            <Select
              label="Program"
              value={form.program}
              onChange={(event) =>
                setForm({ ...form, program: event.target.value })
              }
            >
              <option value="B.Com">B.Com</option>
              <option value="B.Sc. Computer Science">B.Sc. Computer Science</option>
              <option value="BBA">BBA</option>
              <option value="BCA">BCA</option>
              <option value="M.Com">M.Com</option>
            </Select>
          </div>

          <Input
            label="Subject"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
            placeholder="e.g. Operating Systems"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Exam date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              placeholder="e.g. 26 Nov 2026"
              required
            />
            <Input
              label="Start time"
              value={form.time}
              onChange={(event) => setForm({ ...form, time: event.target.value })}
              placeholder="e.g. 10:00 AM"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Room"
              value={form.room}
              onChange={(event) => setForm({ ...form, room: event.target.value })}
            >
              {rooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </Select>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedExam)}
        onClose={() => setSelectedExam(null)}
        title={selectedExam?.subject ?? "Exam details"}
        description={
          selectedExam
            ? `${selectedExam.session} · ${selectedExam.program}`
            : undefined
        }
        footer={
          <>
            {selectedExam?.status !== "published" ? (
              <Button onClick={publishExam}>
                <Send size={14} />
                Publish timetable
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setSelectedExam(null)}>
              Close
            </Button>
          </>
        }
      >
        {selectedExam ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedExam.status)}>
                {formatStatus(selectedExam.status)}
              </Badge>
              <Badge variant="neutral">{selectedExam.semester}</Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Date
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedExam.date}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Time
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedExam.time} – {selectedExam.endTime}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Room
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-eromza-text">
                  <MapPin size={15} className="text-eromza-subtle" />
                  {selectedExam.room}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Invigilator
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-eromza-text">
                  <UserRound size={15} className="text-eromza-subtle" />
                  {selectedExam.invigilator}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
