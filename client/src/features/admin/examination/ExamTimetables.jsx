import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Save,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";

import { examTimetables } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

const EMPTY_FORM = {
  session: "Semester V Internal",
  program: "B.Com",
  semester: "Semester V",
  subject: "",
  date: "",
  time: "10:00",
  endTime: "13:00",
  room: "Hall A",
  invigilator: "",
  status: "draft",
};

export default function ExamTimetables() {
  const [rows, setRows] = useState(examTimetables);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [selectedExam, setSelectedExam] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const sessions = useMemo(
    () => [...new Set(rows.map((row) => row.session).filter(Boolean))],
    [rows]
  );

  const rooms = useMemo(
    () => [...new Set(rows.map((row) => row.room).filter(Boolean))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.subject?.toLowerCase().includes(search) ||
        row.program?.toLowerCase().includes(search) ||
        row.invigilator?.toLowerCase().includes(search) ||
        row.session?.toLowerCase().includes(search) ||
        row.room?.toLowerCase().includes(search);

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
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    published: rows.filter((row) => row.status === "published").length,
    draft: rows.filter((row) => row.status === "draft").length,
    rooms: rooms.length,
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFormError("");
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      session: sessions[0] || EMPTY_FORM.session,
      room: rooms[0] || EMPTY_FORM.room,
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (exam) => {
    setEditingId(exam.id);
    setForm({
      session: exam.session || "",
      program: exam.program || "",
      semester: exam.semester || "",
      subject: exam.subject || "",
      date: exam.date || "",
      time: exam.time || "",
      endTime: exam.endTime || "",
      room: exam.room || "",
      invigilator: exam.invigilator || "",
      status: exam.status || "draft",
    });
    setFormError("");
    setSelectedExam(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSaveExam = (event) => {
    event.preventDefault();

    if (
      !form.session.trim() ||
      !form.program.trim() ||
      !form.semester.trim() ||
      !form.subject.trim() ||
      !form.date ||
      !form.time ||
      !form.endTime ||
      !form.room.trim()
    ) {
      setFormError("Please fill all required examination details.");
      return;
    }

    if (form.endTime <= form.time) {
      setFormError("End time must be later than the start time.");
      return;
    }

    const nextExam = {
      id: editingId || `TTM-${Date.now()}`,
      session: form.session.trim(),
      program: form.program.trim(),
      semester: form.semester.trim(),
      subject: form.subject.trim(),
      date: form.date,
      time: form.time,
      endTime: form.endTime,
      room: form.room.trim(),
      invigilator: form.invigilator.trim() || "To be assigned",
      status: form.status,
    };

    if (editingId) {
      setRows((current) =>
        current.map((row) =>
          row.id === editingId ? nextExam : row
        )
      );
    } else {
      setRows((current) => [nextExam, ...current]);
    }

    closeForm();
    setPage(1);
  };

  const handleDeleteExam = (exam) => {
    const confirmed = window.confirm(
      `Delete the examination timetable for "${exam.subject}"?`
    );

    if (!confirmed) return;

    setRows((current) =>
      current.filter((row) => row.id !== exam.id)
    );

    setSelectedExam(null);
    setPage(1);
  };

  const publishExam = (exam) => {
    setRows((current) =>
      current.map((row) =>
        row.id === exam.id
          ? { ...row, status: "published" }
          : row
      )
    );

    setSelectedExam((current) =>
      current?.id === exam.id
        ? { ...current, status: "published" }
        : current
    );
  };

  const handleExport = () => {
    downloadCsv("aisc-exam-timetables.csv", [
      [
        "Session",
        "Program",
        "Semester",
        "Subject",
        "Date",
        "Start Time",
        "End Time",
        "Room",
        "Invigilator",
        "Status",
      ],
      ...filteredRows.map((row) => [
        row.session,
        row.program,
        row.semester,
        row.subject,
        row.date,
        row.time,
        row.endTime,
        row.room,
        row.invigilator,
        row.status,
      ]),
    ]);
  };

  const stats = [
    {
      label: "Scheduled Exams",
      value: counts.scheduled,
      change: "Upcoming examinations",
      icon: CalendarClock,
      color: "#315FCE",
      soft: "#EEF3FF",
      progress: rows.length
        ? `${(counts.scheduled / rows.length) * 100}%`
        : "0%",
    },
    {
      label: "Published",
      value: counts.published,
      change: "Officially released",
      icon: Send,
      color: "#2C9271",
      soft: "#EAF7F1",
      progress: rows.length
        ? `${(counts.published / rows.length) * 100}%`
        : "0%",
    },
    {
      label: "Draft Timetables",
      value: counts.draft,
      change: "Awaiting publication",
      icon: ClipboardList,
      color: "#A8212F",
      soft: "#F9ECEE",
      progress: rows.length
        ? `${(counts.draft / rows.length) * 100}%`
        : "0%",
    },
    {
      label: "Examination Rooms",
      value: counts.rooms,
      change: "Unique rooms in use",
      icon: MapPin,
      color: "#B58A16",
      soft: "#FFF7DF",
      progress: "100%",
    },
  ];

  const columns = [
    {
      key: "date",
      header: "Date & Time",
      render: (row) => (
        <div className="min-w-[125px] py-1">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="shrink-0 text-[#A8212F]" />
            <p className="text-xs font-bold text-[#14264B]">
              {row.date}
            </p>
          </div>
          <p className="mt-1 pl-5 text-[11px] text-slate-500">
            {row.time} – {row.endTime}
          </p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Examination Subject",
      render: (row) => (
        <div className="min-w-[150px] py-1">
          <p className="text-xs font-bold text-[#14264B]">
            {row.subject}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {row.session}
          </p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {row.program}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {row.semester}
          </p>
        </div>
      ),
    },
    {
      key: "room",
      header: "Exam Venue",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <MapPin size={14} className="text-[#A8212F]" />
          {row.room}
        </span>
      ),
    },
    {
      key: "invigilator",
      header: "Invigilator",
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.invigilator || "To be assigned"}
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
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="View examination"
            onClick={() => setSelectedExam(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DBE9F5] text-[#14264B] transition hover:bg-[#c6dcef]"
          >
            <Eye size={14} />
          </button>

          <button
            type="button"
            title="Edit examination"
            onClick={() => openEditForm(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4D1] text-[#795600] transition hover:bg-[#f9e6a8]"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            title="Delete examination"
            onClick={() => handleDeleteExam(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBE9EB] text-[#A8212F] transition hover:bg-[#f4d2d7]"
          >
            <Trash2 size={14} />
          </button>
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
            Exam Timetables
          </h1>

          <p className="aisc-page-subtitle">
            Create, manage and publish examination schedules, venues
            and invigilation assignments in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="aisc-date-chip">
            <CalendarDays size={14} />
            Odd Semester · 2026–27
          </div>
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
            Every examination, perfectly scheduled.
          </h2>

          <p className="aisc-hero-text">
            Organise subject-wise examination dates, allocate rooms,
            coordinate invigilators and publish the official timetable
            through your examination workspace.
          </p>

          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={openAddForm}
            >
              <Plus size={15} />
              Add examination
            </button>

            <button
              type="button"
              className="aisc-btn aisc-btn-glass"
              onClick={handleExport}
            >
              <Download size={15} />
              Export timetable
            </button>
          </div>
        </div>

        <div className="aisc-hero-seal">
          <CalendarDays size={76} strokeWidth={1.1} />
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

      {/* Examination Schedule */}
      <section className="aisc-panel">
        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">
              Examination Schedule
            </h3>
            <p className="aisc-panel-sub">
              Add, edit, review and manage subject-wise examination timetables
            </p>
          </div>

          <span className="aisc-panel-link">
            <CalendarDays size={14} />
            {filteredRows.length} examinations
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#FBF6EE] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search subject, program or invigilator..."
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
              aria-label="Filter timetable by session"
              className="min-w-[190px]"
            >
              <option value="all">All examination sessions</option>
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
              className="min-w-[160px]"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="aisc-table-wrap overflow-x-auto">
          <DataTable
            columns={columns}
            rows={pageRows}
            emptyTitle="No examinations found"
            emptyDescription="Try adjusting the search term or filters."
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
            examinations
          </p>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </section>

      {/* Add / Edit Examination Modal */}
      <Modal
        open={isFormOpen}
        onClose={closeForm}
        title={
          editingId
            ? "Edit Examination Timetable"
            : "Create Examination Timetable"
        }
        description={
          editingId
            ? "Update the examination schedule details below."
            : "Enter the subject, date, timing, venue and invigilator details."
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeForm}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="timetable-form"
            >
              {editingId ? <Save size={15} /> : <Plus size={15} />}
              {editingId ? "Save changes" : "Create timetable"}
            </Button>
          </>
        }
      >
        <form
          id="timetable-form"
          onSubmit={handleSaveExam}
          className="space-y-4"
        >
          <div className="rounded-xl border border-[#DBE9F5] bg-[#DBE9F5]/40 p-3">
            <p className="text-xs font-bold text-[#14264B]">
              <GraduationCap size={16} className="mr-2 inline text-[#A8212F]" />
              Examination information
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Enter the academic session, program, subject and schedule.
            </p>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          <Input
            label="Examination session *"
            value={form.session}
            onChange={(event) => updateField("session", event.target.value)}
            placeholder="e.g. Semester V Internal Examination"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Program *"
              value={form.program}
              onChange={(event) => updateField("program", event.target.value)}
              placeholder="e.g. B.Com"
              required
            />

            <Input
              label="Semester *"
              value={form.semester}
              onChange={(event) => updateField("semester", event.target.value)}
              placeholder="e.g. Semester V"
              required
            />
          </div>

          <Input
            label="Subject name *"
            value={form.subject}
            onChange={(event) => updateField("subject", event.target.value)}
            placeholder="Enter examination subject"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Examination date *"
              inputType="date"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
              required
            />

            <Input
              label="Examination room *"
              value={form.room}
              onChange={(event) => updateField("room", event.target.value)}
              placeholder="e.g. Hall A / Room 204"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start time *"
              inputType="time"
              value={form.time}
              onChange={(event) => updateField("time", event.target.value)}
              required
            />

            <Input
              label="End time *"
              inputType="time"
              value={form.endTime}
              onChange={(event) => updateField("endTime", event.target.value)}
              required
            />
          </div>

          <Input
            label="Invigilator name"
            value={form.invigilator}
            onChange={(event) => updateField("invigilator", event.target.value)}
            placeholder="Enter invigilator name"
          />

          <Select
            label="Timetable status"
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </Select>
        </form>
      </Modal>

      {/* View Examination Details */}
      <Modal
        open={Boolean(selectedExam)}
        onClose={() => setSelectedExam(null)}
        title={selectedExam?.subject ?? "Examination Details"}
        description={
          selectedExam
            ? `${selectedExam.session} · ${selectedExam.program}`
            : undefined
        }
        footer={
          <>
            {selectedExam && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => openEditForm(selectedExam)}
                >
                  <Pencil size={14} />
                  Edit
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleDeleteExam(selectedExam)}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>

                {selectedExam.status !== "published" && (
                  <Button onClick={() => publishExam(selectedExam)}>
                    <Send size={14} />
                    Publish
                  </Button>
                )}
              </>
            )}

            <Button
              variant="secondary"
              onClick={() => setSelectedExam(null)}
            >
              Close
            </Button>
          </>
        }
      >
        {selectedExam && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedExam.status)}>
                {formatStatus(selectedExam.status)}
              </Badge>

              <Badge variant="neutral">
                {selectedExam.semester}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-[#FBF6EE] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Examination date
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#14264B]">
                  <CalendarDays size={16} className="text-[#A8212F]" />
                  {selectedExam.date}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#FBF6EE] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Examination time
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#14264B]">
                  <Clock3 size={16} className="text-[#A8212F]" />
                  {selectedExam.time} – {selectedExam.endTime}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#FBF6EE] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Examination room
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#14264B]">
                  <MapPin size={16} className="text-[#A8212F]" />
                  {selectedExam.room}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#FBF6EE] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Invigilator
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#14264B]">
                  <UserRound size={16} className="text-[#A8212F]" />
                  {selectedExam.invigilator || "To be assigned"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#DBE9F5] bg-[#DBE9F5]/40 p-4">
              <p className="text-xs font-bold text-[#14264B]">
                <ClipboardList size={15} className="mr-2 inline text-[#A8212F]" />
                Examination information
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Review the subject, academic session, venue and
                invigilation information before publishing the timetable.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}