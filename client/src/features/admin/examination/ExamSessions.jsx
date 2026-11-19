import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Plus,
  Sparkles,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import ErrorState from "../../../components/ui/ErrorState";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import {
  createExam,
  fetchExamReference,
  fetchExams,
  updateExam,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import { downloadCsv } from "../../../utils/csv";
import { formatDateTime, toDateTimeLocal } from "../../../utils/examAdmin";
import { formatDate } from "../../../utils/format";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

const EMPTY_FORM = {
  name: "",
  academicYearId: "",
  programId: "",
  semester: "1",
  formOpensAt: "",
  formClosesAt: "",
  status: "draft",
};

export default function ExamSessions() {
  const exams = useApiData(() => fetchExams());
  const reference = useApiData(() => fetchExamReference());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => exams.data ?? [], [exams.data]);
  const years = useMemo(() => reference.data?.academicYears ?? [], [reference.data]);
  const programs = useMemo(() => reference.data?.programs ?? [], [reference.data]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name?.toLowerCase().includes(search) ||
        String(row.semester).includes(search);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    total: rows.length,
    open: rows.filter((row) => row.status === "open").length,
    closed: rows.filter((row) => row.status === "closed").length,
    draft: rows.filter((row) => row.status === "draft").length,
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMutationError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      academicYearId:
        years.find((year) => year.status === "current")?._id || years[0]?._id || "",
      programId: programs[0]?._id || "",
    });
    setMutationError("");
    setFormOpen(true);
  };

  const openEdit = (exam) => {
    setEditing(exam);
    setForm({
      name: exam.name || "",
      academicYearId: String(exam.academicYearId || ""),
      programId: String(exam.programId || ""),
      semester: String(exam.semester || 1),
      formOpensAt: toDateTimeLocal(exam.formOpensAt),
      formClosesAt: toDateTimeLocal(exam.formClosesAt),
      status: exam.status || "draft",
    });
    setMutationError("");
    setSelected(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setMutationError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.academicYearId ||
      !form.programId ||
      !form.formOpensAt ||
      !form.formClosesAt
    ) {
      setMutationError("Fill every required examination session field.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      academicYearId: form.academicYearId,
      programId: form.programId,
      semester: Number(form.semester),
      formOpensAt: new Date(form.formOpensAt).toISOString(),
      formClosesAt: new Date(form.formClosesAt).toISOString(),
    };

    if (payload.formClosesAt <= payload.formOpensAt) {
      setMutationError("The form must close after it opens.");
      return;
    }

    setSaving(true);
    setMutationError("");
    try {
      if (editing) {
        await updateExam(editing._id, { ...payload, status: form.status });
      } else {
        const created = await createExam(payload);
        if (form.status !== "draft") {
          await updateExam(created._id, { status: form.status });
        }
      }
      closeForm();
      exams.reload();
    } catch (err) {
      setMutationError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv("aisc-exam-sessions.csv", [
      ["Session", "Academic Year", "Program", "Semester", "Forms Open", "Forms Close", "Status"],
      ...filteredRows.map((row) => [
        row.name,
        years.find((year) => String(year._id) === String(row.academicYearId))?.label || "",
        programs.find((program) => String(program._id) === String(row.programId))?.name || "",
        row.semester,
        row.formOpensAt,
        row.formClosesAt,
        row.status,
      ]),
    ]);
  };

  const columns = [
    {
      key: "name",
      header: "Examination Session",
      render: (row) => (
        <div>
          <div className="aisc-table-primary">{row.name}</div>
          <div className="aisc-table-secondary">
            Semester {row.semester} · {formatDate(row.formClosesAt)}
          </div>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program & Year",
      render: (row) => (
        <div>
          <div className="text-xs font-semibold text-[#14264B]">
            {programs.find((program) => String(program._id) === String(row.programId))?.name || "Program"}
          </div>
          <div className="aisc-table-secondary">
            {years.find((year) => String(year._id) === String(row.academicYearId))?.label || "Academic year"}
          </div>
        </div>
      ),
    },
    {
      key: "window",
      header: "Form Window",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <div>Opens {formatDateTime(row.formOpensAt)}</div>
          <div className="aisc-table-secondary">Closes {formatDateTime(row.formClosesAt)}</div>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Papers",
      render: (row) => <span className="font-bold text-[#14264B]">{row.schedule?.length ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{formatStatus(row.status)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="View session"
            className="aisc-action-btn"
            onClick={() => setSelected(row)}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            title="Edit session"
            className="aisc-action-btn"
            onClick={() => openEdit(row)}
          >
            <FileText size={14} />
          </button>
        </div>
      ),
    },
  ];

  const stats = [
    { label: "Total Sessions", value: counts.total, icon: CalendarDays, color: "#315FCE", soft: "#EEF3FF" },
    { label: "Open Sessions", value: counts.open, icon: CheckCircle2, color: "#2C9271", soft: "#EAF7F1" },
    { label: "Closed Sessions", value: counts.closed, icon: CalendarClock, color: "#B58A16", soft: "#FFF7DF" },
    { label: "Draft Sessions", value: counts.draft, icon: FileText, color: "#A8212F", soft: "#F9ECEE" },
  ];

  return (
    <div className="aisc-premium space-y-6">
      <section className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13} /> Examination Cell</div>
          <h1 className="aisc-page-title">Exam Sessions</h1>
          <p className="aisc-page-subtitle">
            Create examination sessions, set the form window and control when students can apply.
          </p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14} /> Examination Administration</div>
      </section>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><GraduationCap size={12} /> ABEDA INAMDAR SENIOR COLLEGE</div>
          <h2 className="aisc-hero-title">Every examination begins with a well-planned session.</h2>
          <p className="aisc-hero-text">
            Open a session for the right program and semester, publish its dates, then build the paper schedule and hall tickets from the same record.
          </p>
          <div className="aisc-hero-actions">
            <button type="button" className="aisc-btn aisc-btn-primary" onClick={openCreate}>
              <Plus size={15} /> Create new session
            </button>
            <button type="button" className="aisc-btn aisc-btn-glass" onClick={handleExport}>
              <Download size={15} /> Export sessions
            </button>
          </div>
        </div>
        <div className="aisc-hero-seal"><CalendarDays size={76} strokeWidth={1.1} /></div>
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
              <div className="aisc-kpi-note">Live examination records</div>
              <div className="aisc-kpi-track"><span /></div>
            </article>
          );
        })}
      </section>

      <section className="aisc-panel">
        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">Session Calendar</h3>
            <p className="aisc-panel-sub">Examination cycles loaded from the API</p>
          </div>
          <span className="aisc-panel-link">{filteredRows.length} sessions</span>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#FBF6EE] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search session name or semester..."
              className="w-full"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter sessions by status"
            className="min-w-[170px]"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        {exams.loading || reference.loading ? (
          <Loader label="Loading examination sessions..." />
        ) : exams.error || reference.error ? (
          <ErrorState
            title="Could not load examination sessions"
            description={exams.error?.message || reference.error?.message}
            onRetry={() => {
              exams.reload();
              reference.reload();
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowKey={(row) => row._id}
            emptyTitle="No examination sessions found"
            emptyDescription="Create a session to start the examination cycle."
          />
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            Showing <strong>{pageRows.length}</strong> of <strong>{filteredRows.length}</strong> sessions
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit Examination Session" : "Create Examination Session"}
        description="Set the program, semester and student form window."
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="exam-session-form" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create session"}
            </Button>
          </>
        }
      >
        <form id="exam-session-form" onSubmit={handleSave} className="space-y-4">
          {mutationError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {mutationError}
            </div>
          ) : null}

          <Input
            label="Session name *"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. End Semester Examination"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Academic year *"
              value={form.academicYearId}
              onChange={(event) => updateField("academicYearId", event.target.value)}
              required
            >
              <option value="">Select academic year</option>
              {years.map((year) => <option key={year._id} value={year._id}>{year.label}</option>)}
            </Select>

            <Select
              label="Program *"
              value={form.programId}
              onChange={(event) => updateField("programId", event.target.value)}
              required
            >
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program._id} value={program._id}>{program.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Semester *"
              value={form.semester}
              onChange={(event) => updateField("semester", event.target.value)}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </Select>

            <Input
              label="Form opens *"
              type="datetime-local"
              value={form.formOpensAt}
              onChange={(event) => updateField("formOpensAt", event.target.value)}
              required
            />

            <Input
              label="Form closes *"
              type="datetime-local"
              value={form.formClosesAt}
              onChange={(event) => updateField("formClosesAt", event.target.value)}
              required
            />
          </div>

          <Select
            label="Session status"
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </form>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || "Examination Session"}
        description={selected ? `Semester ${selected.semester}` : undefined}
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getStatusVariant(selected.status)}>{formatStatus(selected.status)}</Badge>
              <Badge variant="neutral">{selected.schedule?.length ?? 0} papers</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Program</div>
                <div className="mt-2 text-sm font-bold text-[#14264B]">
                  {programs.find((program) => String(program._id) === String(selected.programId))?.name || "Program"}
                </div>
              </div>
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Academic year</div>
                <div className="mt-2 text-sm font-bold text-[#14264B]">
                  {years.find((year) => String(year._id) === String(selected.academicYearId))?.label || "Academic year"}
                </div>
              </div>
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Form opens</div>
                <div className="mt-2 text-sm font-bold text-[#14264B]">{formatDateTime(selected.formOpensAt)}</div>
              </div>
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Form closes</div>
                <div className="mt-2 text-sm font-bold text-[#14264B]">{formatDateTime(selected.formClosesAt)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <div className="aisc-note">
        <CheckCircle2 size={13} />
        Session records are live. Exam forms and hall tickets use the same program, semester and academic year.
      </div>
    </div>
  );
}
