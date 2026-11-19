import { useMemo, useState } from "react";
import {
  BookOpen,
  Users,
  Unlock,
  Lock,
  FileText,
  Sparkles,
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  ArrowUpRight,
  CheckCircle2,
  CalendarDays,
  X,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import Pagination from "../../../components/ui/Pagination";

import { examSubjects } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

const SEMESTERS = [
  "Semester I",
  "Semester II",
  "Semester III",
  "Semester IV",
  "Semester V",
  "Semester VI",
];

const EMPTY_FORM = {
  code: "",
  name: "",
  program: "B.Sc. Computer Science",
  semester: "Semester V",
  credits: "4",
  formStatus: "draft",
};

const statIcons = {
  subjects: BookOpen,
  open: Unlock,
  closed: Lock,
  registered: Users,
};

const statColors = [
  ["#315FCE", "#EEF3FF", "76%"],
  ["#2C9271", "#EAF7F1", "88%"],
  ["#A8212F", "#F9ECEE", "68%"],
  ["#B58A16", "#FFF7DF", "46%"],
];

export default function SubjectsAndExamForms() {
  const [rows, setRows] = useState(examSubjects);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const programs = useMemo(
    () => [...new Set(rows.map((row) => row.program).filter(Boolean))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name?.toLowerCase().includes(search) ||
        row.code?.toLowerCase().includes(search);

      const matchesProgram =
        programFilter === "all" || row.program === programFilter;

      const matchesForm =
        formFilter === "all" || row.formStatus === formFilter;

      return matchesSearch && matchesProgram && matchesForm;
    });
  }, [rows, query, programFilter, formFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    subjects: rows.length,
    open: rows.filter((row) => row.formStatus === "open").length,
    closed: rows.filter((row) => row.formStatus === "closed").length,
    registered: rows.reduce(
      (sum, row) => sum + (Number(row.registered) || 0),
      0,
    ),
  };

  const stats = [
    {
      id: "subjects",
      label: "Total Subjects",
      value: counts.subjects,
      change: "Academic register",
    },
    {
      id: "open",
      label: "Open Forms",
      value: counts.open,
      change: "Accepting registrations",
    },
    {
      id: "closed",
      label: "Closed Forms",
      value: counts.closed,
      change: "Registration unavailable",
    },
    {
      id: "registered",
      label: "Registrations",
      value: counts.registered,
      change: "Across all subjects",
    },
  ];

  const closeFormModal = () => {
    setIsFormOpen(false);
    setIsEditing(false);
    setForm(EMPTY_FORM);
  };

  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
      program: programs[0] || EMPTY_FORM.program,
    });
    setSelectedSubject(null);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const openEditModal = (subject) => {
    setSelectedSubject(subject);

    setForm({
      code: subject.code || "",
      name: subject.name || "",
      program: subject.program || EMPTY_FORM.program,
      semester: subject.semester || EMPTY_FORM.semester,
      credits: String(subject.credits ?? 4),
      formStatus: subject.formStatus || "draft",
    });

    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleExport = () => {
    downloadCsv("aisc-exam-subjects.csv", [
      [
        "Code",
        "Subject",
        "Program",
        "Semester",
        "Credits",
        "Exam form",
        "Registered",
      ],
      ...filteredRows.map((row) => [
        row.code,
        row.name,
        row.program,
        row.semester,
        row.credits,
        row.formStatus,
        row.registered,
      ]),
    ]);
  };

  const handleSaveSubject = (event) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim()) return;

    const subjectData = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      program: form.program,
      semester: form.semester,
      credits: Number(form.credits),
      formStatus: form.formStatus,
    };

    if (isEditing && selectedSubject) {
      const updatedSubject = {
        ...selectedSubject,
        ...subjectData,
      };

      setRows((current) =>
        current.map((row) =>
          row.id === selectedSubject.id ? updatedSubject : row,
        ),
      );

      setSelectedSubject(updatedSubject);
    } else {
      const nextRow = {
        id: `SUB-${Date.now()}`,
        ...subjectData,
        registered: 0,
        maxMarks: 100,
        session: "To be scheduled",
      };

      setRows((current) => [nextRow, ...current]);
      setPage(1);
    }

    closeFormModal();
  };

  const handleDeleteSubject = (subject) => {
    const confirmed = window.confirm(
      `Delete "${subject.name}" (${subject.code})? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setRows((current) =>
      current.filter((row) => row.id !== subject.id),
    );

    if (selectedSubject?.id === subject.id) {
      setSelectedSubject(null);
    }
  };

  const toggleForm = () => {
    if (!selectedSubject) return;

    const nextStatus =
      selectedSubject.formStatus === "open" ? "closed" : "open";

    const updatedSubject = {
      ...selectedSubject,
      formStatus: nextStatus,
    };

    setRows((current) =>
      current.map((row) =>
        row.id === selectedSubject.id ? updatedSubject : row,
      ),
    );

    setSelectedSubject(updatedSubject);
  };

  const tableRows = [
    ...pageRows,
  ];

  return (
    <div className="aisc-premium">

      {/* PAGE HEADING */}
      <div className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow">
            <Sparkles size={13} />
            Examination Cell · Academic year 2026–27
          </div>

          <h1 className="aisc-page-title">
            Subjects & Exam Forms
          </h1>

          <p className="aisc-page-subtitle">
            Manage academic subjects, semester credits, student
            registrations and examination form availability.
          </p>
        </div>

        <div className="aisc-date-chip">
          <CalendarDays size={14} />
          Odd Semester · 2026–27
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker">
            <BookOpen size={12} />
            ABEDA INAMDAR SENIOR COLLEGE
          </div>

          <h2 className="aisc-hero-title">
            Every subject. One academic record.
          </h2>

          <p className="aisc-hero-text">
            Organise academic subjects, manage semester-wise credits,
            monitor student registrations and control examination
            form availability through one central workspace.
          </p>

          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={openAddModal}
            >
              <Plus size={14} />
              Add new subject
            </button>

            <button
              type="button"
              className="aisc-btn aisc-btn-glass"
              onClick={handleExport}
            >
              <Download size={14} />
              Export register
            </button>
          </div>
        </div>

        <div className="aisc-hero-seal">
          <BookOpen size={52} strokeWidth={1.2} />
        </div>
      </section>

      {/* KPI SECTION */}
      <section className="aisc-grid aisc-kpis">
        {stats.map((item, index) => {
          const Icon = statIcons[item.id];
          const [color, soft, progress] =
            statColors[index % statColors.length];

          return (
            <article
              className="aisc-kpi"
              key={item.id}
              style={{
                "--kpi-color": color,
                "--kpi-soft": soft,
                "--progress": progress,
                animationDelay: `${index * 80}ms`,
              }}
            >
              <div className="aisc-kpi-top">
                <div className="aisc-kpi-icon">
                  <Icon size={19} />
                </div>

                <span className="aisc-kpi-change">
                  {item.change}
                </span>
              </div>

              <div className="aisc-kpi-label">
                {item.label}
              </div>

              <div className="aisc-kpi-value">
                {Number(item.value).toLocaleString("en-IN")}
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

      {/* MAIN CONTENT */}
      <section className="aisc-grid aisc-two-col">

        {/* SUBJECT REGISTER */}
        <article
          className="aisc-panel"
          style={{ gridColumn: "1 / -1" }}
        >
          <div className="aisc-panel-head">
            <div>
              <h3 className="aisc-panel-title">
                Subject & exam form register
              </h3>

              <p className="aisc-panel-sub">
                Complete subject register with semester and
                examination form information
              </p>
            </div>

            <BookOpen size={19} color="#A8212F" />
          </div>

          {/* SEARCH AND FILTERS */}
          <div
            className="flex flex-col gap-3"
            style={{
              padding: "16px 0",
              borderBottom: "1px solid #E8EDF4",
            }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full lg:max-w-sm">
                <SearchInput
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search subject or subject code..."
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={programFilter}
                  onChange={(event) => {
                    setProgramFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by program"
                  className="min-w-[190px]"
                >
                  <option value="all">All programs</option>

                  {programs.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </Select>

                <Select
                  value={formFilter}
                  onChange={(event) => {
                    setFormFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by exam form status"
                  className="min-w-[160px]"
                >
                  <option value="all">All form status</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="draft">Draft</option>
                </Select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="aisc-table-wrap">
            <table className="aisc-table">
              <thead>
                <tr>
                  <th>Subject / Code</th>
                  <th>Program</th>
                  <th>Semester</th>
                  <th>Credits</th>
                  <th>Exam form</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="aisc-table-primary">
                          {row.name}
                        </div>

                        <div className="aisc-table-secondary">
                          {row.code}
                        </div>
                      </td>

                      <td>
                        <span className="aisc-table-primary">
                          {row.program}
                        </span>
                      </td>

                      <td>{row.semester}</td>

                      <td>
                        <strong>{row.credits}</strong>
                      </td>

                      <td>
                        <span
                          className="aisc-status"
                          style={{
                            background:
                              row.formStatus === "open"
                                ? "#EAF7F1"
                                : row.formStatus === "closed"
                                  ? "#F9ECEE"
                                  : "#FFF7DF",
                            color:
                              row.formStatus === "open"
                                ? "#267A5D"
                                : row.formStatus === "closed"
                                  ? "#A8212F"
                                  : "#987700",
                          }}
                        >
                          {formatStatus(row.formStatus)}
                        </span>
                      </td>

                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={14} color="#A8212F" />
                          {row.registered ?? 0}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="aisc-action-btn"
                            title="View subject"
                            onClick={() => setSelectedSubject(row)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="aisc-action-btn"
                            title="Edit subject"
                            onClick={() => openEditModal(row)}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="aisc-action-btn"
                            title="Delete subject"
                            onClick={() => handleDeleteSubject(row)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="py-10 text-center">
                        <BookOpen
                          size={32}
                          className="mx-auto mb-3"
                          color="#A8212F"
                        />

                        <div className="aisc-table-primary">
                          No subjects found
                        </div>

                        <div className="aisc-table-secondary">
                          Try changing your search or filters, or add
                          a new subject.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="aisc-note">
              <FileText size={13} />
              Showing {pageRows.length} of {filteredRows.length} subjects
            </p>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </article>
      </section>

      {/* SUBJECT SUMMARY */}
      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div>
              <h3 className="aisc-panel-title">
                Examination form availability
              </h3>

              <p className="aisc-panel-sub">
                Current subject registration status
              </p>
            </div>

            <Unlock size={19} color="#A8212F" />
          </div>

          <div className="aisc-progress-list">
            {[
              {
                label: "Open forms",
                value: counts.open,
                color: "#2C9271",
              },
              {
                label: "Closed forms",
                value: counts.closed,
                color: "#A8212F",
              },
              {
                label: "Draft forms",
                value: rows.filter(
                  (row) => row.formStatus === "draft",
                ).length,
                color: "#B58A16",
              },
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
                        counts.subjects
                          ? (item.value / counts.subjects) * 100
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
                Subject management
              </h3>

              <p className="aisc-panel-sub">
                Quick actions for the examination cell
              </p>
            </div>

            <FileText size={19} color="#A8212F" />
          </div>

          <div className="aisc-activity">
            <div className="aisc-activity-icon">
              <Plus size={15} />
            </div>

            <div>
              <div className="aisc-activity-title">
                Add academic subject
              </div>

              <div className="aisc-activity-time">
                Create a new subject record
              </div>
            </div>

            <button
              type="button"
              className="aisc-panel-link"
              onClick={openAddModal}
            >
              Add <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="aisc-activity">
            <div className="aisc-activity-icon">
              <Download size={15} />
            </div>

            <div>
              <div className="aisc-activity-title">
                Export subject register
              </div>

              <div className="aisc-activity-time">
                Download filtered subject records
              </div>
            </div>

            <button
              type="button"
              className="aisc-panel-link"
              onClick={handleExport}
            >
              Export <ArrowUpRight size={13} />
            </button>
          </div>
        </article>
      </section>

      {/* ADD / EDIT MODAL */}
      <Modal
        open={isFormOpen}
        onClose={closeFormModal}
        title={isEditing ? "Edit subject" : "Add new subject"}
        description={
          isEditing
            ? "Update subject information and exam form settings."
            : "Add a new subject to the examination register."
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeFormModal}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="subject-form"
            >
              {isEditing ? "Save changes" : "Add subject"}
            </Button>
          </>
        }
      >
        <form
          id="subject-form"
          onSubmit={handleSaveSubject}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Subject code"
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
              placeholder="e.g. CS-503"
              required
            />

            <Input
              label="Subject name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="e.g. Operating Systems"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Program"
              value={form.program}
              onChange={(event) =>
                setForm({ ...form, program: event.target.value })
              }
            >
              {[...new Set([...programs, form.program].filter(Boolean))].map(
                (program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Semester"
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
            >
              {SEMESTERS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Credits"
              type="number"
              min="1"
              max="8"
              value={form.credits}
              onChange={(event) =>
                setForm({ ...form, credits: event.target.value })
              }
              required
            />

            <Select
              label="Exam form status"
              value={form.formStatus}
              onChange={(event) =>
                setForm({ ...form, formStatus: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
        </form>
      </Modal>

      {/* SUBJECT DETAILS MODAL */}
      <Modal
        open={Boolean(selectedSubject) && !isFormOpen}
        onClose={() => setSelectedSubject(null)}
        title={selectedSubject?.name ?? "Subject details"}
        description={
          selectedSubject
            ? `${selectedSubject.code} · ${selectedSubject.program}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={toggleForm}
              disabled={
                selectedSubject?.formStatus !== "open" &&
                selectedSubject?.formStatus !== "closed"
              }
            >
              {selectedSubject?.formStatus === "open" ? (
                <>
                  <Lock size={14} />
                  Close forms
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  Open forms
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                if (selectedSubject) {
                  openEditModal(selectedSubject);
                }
              }}
            >
              <Pencil size={14} />
              Edit
            </Button>

            <Button
              variant="secondary"
              onClick={() => setSelectedSubject(null)}
            >
              Close
            </Button>
          </>
        }
      >
        {selectedSubject && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedSubject.formStatus)}>
                {formatStatus(selectedSubject.formStatus)}
              </Badge>

              <Badge variant="neutral">
                {selectedSubject.semester}
              </Badge>

              <Badge variant="info">
                {selectedSubject.credits} credits
              </Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-3">
                <dt className="text-xs font-semibold text-slate-500">
                  Exam session
                </dt>

                <dd className="mt-1 text-sm font-bold text-[#14264B]">
                  {selectedSubject.session || "Not scheduled"}
                </dd>
              </div>

              <div className="rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-3">
                <dt className="text-xs font-semibold text-slate-500">
                  Maximum marks
                </dt>

                <dd className="mt-1 text-sm font-bold text-[#14264B]">
                  {selectedSubject.maxMarks ?? 100}
                </dd>
              </div>

              <div className="rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-3 sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-500">
                  Registered students
                </dt>

                <dd className="mt-1 flex items-center gap-2 text-sm font-bold text-[#14264B]">
                  <Users size={15} color="#A8212F" />
                  {selectedSubject.registered ?? 0} students
                </dd>
              </div>
            </dl>

            <div className="aisc-callout">
              {selectedSubject.formStatus === "open" ? (
                <CheckCircle2 size={17} />
              ) : (
                <FileText size={17} />
              )}

              <span>
                {selectedSubject.formStatus === "open"
                  ? "Exam form submission is currently open for this subject."
                  : "Exam form submission is currently unavailable for this subject."}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}