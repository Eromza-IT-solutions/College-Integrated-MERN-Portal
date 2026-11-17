import { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  FileCheck,
  GraduationCap,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";

import { examMarks } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

const GRADES = ["A+", "A", "B+", "B", "C", "F"];

function getGrade(marks, maxMarks = 100) {
  const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;

  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 40) return "C";
  return "F";
}

export default function MarksAndResults() {
  const [rows, setRows] = useState(examMarks);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState(null);

  const [form, setForm] = useState({
    marks: "",
    grade: "A",
    result: "pass",
    status: "moderated",
  });

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
        row.subject?.toLowerCase().includes(search);

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

  const counts = useMemo(
    () => ({
      total: rows.length,
      submitted: rows.filter((row) => row.status === "submitted").length,
      moderated: rows.filter((row) => row.status === "moderated").length,
      published: rows.filter((row) => row.status === "published").length,
    }),
    [rows]
  );

  const publishableCount = counts.submitted + counts.moderated;

  const publishedPercentage =
    counts.total > 0
      ? Math.round((counts.published / counts.total) * 100)
      : 0;

  const handleExport = () => {
    downloadCsv("aisc-exam-marks-results.csv", [
      [
        "Student",
        "Roll number",
        "Subject",
        "Session",
        "Marks",
        "Maximum marks",
        "Grade",
        "Result",
        "Status",
      ],
      ...filteredRows.map((row) => [
        row.student,
        row.rollNo,
        row.subject,
        row.session,
        row.marks,
        row.maxMarks,
        row.grade,
        row.result,
        row.status,
      ]),
    ]);
  };

  const resetForm = () => {
    setForm({
      marks: "",
      grade: "A",
      result: "pass",
      status: "moderated",
    });
  };

  const closeEditModal = () => {
    setSelectedMark(null);
    resetForm();
  };

  const openEdit = (mark) => {
    setSelectedMark(mark);

    setForm({
      marks: String(mark.marks ?? 0),
      grade: mark.grade || "A",
      result: mark.result || "pass",
      status: mark.status || "draft",
    });
  };

  const handleMarksChange = (value) => {
    if (value === "") {
      setForm((current) => ({
        ...current,
        marks: value,
      }));
      return;
    }

    const marks = Number(value);
    const maxMarks = Number(selectedMark?.maxMarks) || 100;

    if (!Number.isFinite(marks)) return;

    setForm((current) => ({
      ...current,
      marks: value,
      grade: getGrade(marks, maxMarks),
      result: marks >= maxMarks * 0.4 ? "pass" : "fail",
    }));
  };

  const handleEditMarks = (event) => {
    event.preventDefault();

    if (!selectedMark) return;

    const marks = Number(form.marks);
    const maxMarks = Number(selectedMark.maxMarks) || 100;

    if (
      form.marks === "" ||
      !Number.isFinite(marks) ||
      marks < 0 ||
      marks > maxMarks
    ) {
      window.alert(`Enter marks between 0 and ${maxMarks}.`);
      return;
    }

    const updatedMark = {
      ...selectedMark,
      marks,
      grade: form.grade,
      result: form.result,
      status: form.status,
    };

    setRows((current) =>
      current.map((row) =>
        row.id === selectedMark.id ? updatedMark : row
      )
    );

    closeEditModal();
  };

  const handlePublishResults = () => {
    if (publishableCount === 0) {
      setIsPublishOpen(false);
      return;
    }

    const confirmed = window.confirm(
      `Publish ${publishableCount} submitted/moderated result record(s)?`
    );

    if (!confirmed) return;

    setRows((current) =>
      current.map((row) =>
        row.status === "moderated" || row.status === "submitted"
          ? { ...row, status: "published" }
          : row
      )
    );

    setIsPublishOpen(false);
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#14264B]">
            {row.student}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#A8212F]">
            {row.rollNo}
          </p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-700">
            {row.subject}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {row.session}
          </p>
        </div>
      ),
    },
    {
      key: "marks",
      header: "Marks",
      render: (row) => (
        <span className="font-bold text-[#14264B]">
          {row.marks}/{row.maxMarks}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Grade",
      render: (row) => (
        <Badge variant="neutral">{row.grade}</Badge>
      ),
    },
    {
      key: "result",
      header: "Result",
      render: (row) => (
        <Badge variant={getStatusVariant(row.result)}>
          {formatStatus(row.result)}
        </Badge>
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
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(row)}
          className="text-[#A8212F] hover:bg-rose-50"
        >
          <Edit3 size={15} />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="aisc-premium space-y-6">

      {/* PAGE HEADING */}
      <div className="aisc-page-head">
        <div>
          <p className="aisc-eyebrow">
            Examination Cell · Academic year 2026–27
          </p>

          <h1 className="aisc-page-title">
            Marks & Results
          </h1>

          <p className="aisc-page-subtitle">
            Manage student marks, review grades, moderate examination
            records and publish final academic results.
          </p>
        </div>

        <div className="aisc-date-chip">
          <GraduationCap size={16} />
          <span>Odd Semester · 2026–27</span>
        </div>
      </div>

      {/* PREMIUM HERO */}
      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker">
            <Sparkles size={14} />
            ABEDA INAMDAR SENIOR COLLEGE
          </div>

          <h2 className="aisc-hero-title">
            Accuracy in every result.
          </h2>

          <p className="aisc-hero-text">
            Maintain a reliable examination marks register, review
            student performance and ensure that results are moderated
            before official publication.
          </p>

          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={() => setIsPublishOpen(true)}
              disabled={publishableCount === 0}
            >
              <Send size={16} />
              Publish results
            </button>

            <button
              type="button"
              className="aisc-btn aisc-btn-glass"
              onClick={handleExport}
            >
              <Download size={16} />
              Export marks
            </button>
          </div>
        </div>

        <div className="aisc-hero-seal">
          <Award size={48} strokeWidth={1.5} />
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="aisc-kpis">

        <div
          className="aisc-kpi"
          style={{
            "--kpi-color": "#315FCE",
            "--kpi-bg": "#EEF3FF",
            "--kpi-progress": "100%",
          }}
        >
          <div className="aisc-kpi-top">
            <div className="aisc-kpi-icon">
              <ClipboardCheck size={20} />
            </div>
            <span className="aisc-kpi-change">
              Register
            </span>
          </div>

          <p className="aisc-kpi-label">Total Records</p>
          <h3 className="aisc-kpi-value">{counts.total}</h3>
          <p className="aisc-kpi-note">
            Student subject mark entries
          </p>

          <div className="aisc-kpi-track">
            <span />
          </div>
        </div>

        <div
          className="aisc-kpi"
          style={{
            "--kpi-color": "#B58A16",
            "--kpi-bg": "#FFF7DF",
            "--kpi-progress":
              `${counts.total ? (counts.submitted / counts.total) * 100 : 0}%`,
          }}
        >
          <div className="aisc-kpi-top">
            <div className="aisc-kpi-icon">
              <FileCheck size={20} />
            </div>
            <span className="aisc-kpi-change">
              Review
            </span>
          </div>

          <p className="aisc-kpi-label">Submitted</p>
          <h3 className="aisc-kpi-value">{counts.submitted}</h3>
          <p className="aisc-kpi-note">
            Records awaiting moderation
          </p>

          <div className="aisc-kpi-track">
            <span />
          </div>
        </div>

        <div
          className="aisc-kpi"
          style={{
            "--kpi-color": "#2C9271",
            "--kpi-bg": "#EAF7F1",
            "--kpi-progress":
              `${counts.total ? (counts.moderated / counts.total) * 100 : 0}%`,
          }}
        >
          <div className="aisc-kpi-top">
            <div className="aisc-kpi-icon">
              <CheckCircle2 size={20} />
            </div>
            <span className="aisc-kpi-change">
              Verified
            </span>
          </div>

          <p className="aisc-kpi-label">Moderated</p>
          <h3 className="aisc-kpi-value">{counts.moderated}</h3>
          <p className="aisc-kpi-note">
            Reviewed examination records
          </p>

          <div className="aisc-kpi-track">
            <span />
          </div>
        </div>

        <div
          className="aisc-kpi"
          style={{
            "--kpi-color": "#A8212F",
            "--kpi-bg": "#F9ECEE",
            "--kpi-progress": `${publishedPercentage}%`,
          }}
        >
          <div className="aisc-kpi-top">
            <div className="aisc-kpi-icon">
              <Award size={20} />
            </div>
            <span className="aisc-kpi-change">
              Official
            </span>
          </div>

          <p className="aisc-kpi-label">Published</p>
          <h3 className="aisc-kpi-value">{counts.published}</h3>
          <p className="aisc-kpi-note">
            Officially published records
          </p>

          <div className="aisc-kpi-track">
            <span />
          </div>
        </div>

      </section>

      {/* PUBLICATION OVERVIEW */}
      <section className="aisc-two-col">

        <div className="aisc-panel">
          <div className="aisc-panel-head">
            <div>
              <h3 className="aisc-panel-title">
                Result publication overview
              </h3>
              <p className="aisc-panel-sub">
                Current status of examination mark records
              </p>
            </div>

            <div className="aisc-kpi-icon">
              <ShieldCheck size={19} />
            </div>
          </div>

          <div className="space-y-5 p-5">
            {[
              {
                label: "Published",
                value: counts.published,
                color: "#2C9271",
              },
              {
                label: "Moderated",
                value: counts.moderated,
                color: "#315FCE",
              },
              {
                label: "Submitted",
                value: counts.submitted,
                color: "#B58A16",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#14264B]">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-[#14264B]">
                    {item.value}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        counts.total
                          ? (item.value / counts.total) * 100
                          : 0
                      }%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-3">
              <p className="text-xs leading-5 text-[#14264B]">
                <strong>{publishableCount}</strong> records are currently
                ready for publication. Draft records are excluded.
              </p>
            </div>
          </div>
        </div>

        <div className="aisc-panel">
          <div className="aisc-panel-head">
            <div>
              <h3 className="aisc-panel-title">
                Publication actions
              </h3>
              <p className="aisc-panel-sub">
                Manage examination result operations
              </p>
            </div>

            <div className="aisc-kpi-icon">
              <Send size={19} />
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
              <div className="rounded-lg bg-[#EEF3FF] p-2 text-[#315FCE]">
                <FileCheck size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#14264B]">
                  Review submitted marks
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Check submitted records before final moderation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
              <div className="rounded-lg bg-[#EAF7F1] p-2 text-[#2C9271]">
                <ShieldCheck size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#14264B]">
                  Moderate examination records
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Verify marks, grades and pass/fail results.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
              <div className="rounded-lg bg-[#F9ECEE] p-2 text-[#A8212F]">
                <Award size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#14264B]">
                  Publish final results
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Make moderated and submitted records published.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPublishOpen(true)}
              disabled={publishableCount === 0}
              className="aisc-btn aisc-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              Publish {publishableCount} records
            </button>
          </div>
        </div>

      </section>

      {/* MARKS REGISTER */}
      <section className="aisc-panel">

        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">
              Examination marks register
            </h3>
            <p className="aisc-panel-sub">
              Student-wise subject marks, grades and result publication status
            </p>
          </div>

          <div className="aisc-kpi-icon">
            <GraduationCap size={20} />
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#FBF6EE] p-4 lg:flex-row lg:items-center lg:justify-between">

          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search student, roll number or subject..."
            className="w-full lg:max-w-sm"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={sessionFilter}
              onChange={(event) => {
                setSessionFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by exam session"
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
              aria-label="Filter by marks status"
              className="min-w-[150px]"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="moderated">Moderated</option>
              <option value="published">Published</option>
            </Select>
          </div>
        </div>

        {/* TABLE */}
        <div className="aisc-table-wrap">
          <DataTable
            columns={columns}
            rows={pageRows}
            emptyTitle="No marks found"
            emptyDescription="Try adjusting the search or filters."
          />
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#FBF6EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            Showing {pageRows.length} of {filteredRows.length} records
          </p>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

      </section>

      {/* EDIT MARKS MODAL */}
      <Modal
        open={Boolean(selectedMark)}
        onClose={closeEditModal}
        title="Edit examination marks"
        description={
          selectedMark
            ? `${selectedMark.student} · ${selectedMark.subject}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>

            <Button type="submit" form="marks-form">
              <CheckCircle2 size={15} />
              Save changes
            </Button>
          </>
        }
      >
        {selectedMark && (
          <form
            id="marks-form"
            onSubmit={handleEditMarks}
            className="space-y-4"
          >
            <div className="rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2 text-[#14264B] shadow-sm">
                  <GraduationCap size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#14264B]">
                    {selectedMark.student}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedMark.rollNo} · {selectedMark.session}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#A8212F]">
                    {selectedMark.subject}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={`Marks (out of ${selectedMark.maxMarks})`}
                type="number"
                min="0"
                max={selectedMark.maxMarks}
                value={form.marks}
                onChange={(event) =>
                  handleMarksChange(event.target.value)
                }
                required
              />

              <Select
                label="Grade"
                value={form.grade}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    grade: event.target.value,
                  }))
                }
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Result"
                value={form.result}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    result: event.target.value,
                  }))
                }
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </Select>

              <Select
                label="Record status"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="moderated">Moderated</option>
                <option value="published">Published</option>
              </Select>
            </div>

            <div className="rounded-xl border border-[#F2C200]/40 bg-[#FBF6EE] p-3">
              <p className="text-xs leading-5 text-[#14264B]">
                Grade and pass/fail result are automatically suggested
                when marks are changed. You can adjust them manually
                if required.
              </p>
            </div>
          </form>
        )}
      </Modal>

      {/* PUBLISH CONFIRMATION MODAL */}
      <Modal
        open={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        title="Publish examination results"
        description="Review the number of records before publishing."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsPublishOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handlePublishResults}
              disabled={publishableCount === 0}
            >
              <Send size={14} />
              Confirm publish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[#DBE9F5] bg-[#F3F8FC] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <FileCheck size={15} />
              Records ready for publication
            </div>

            <p className="mt-2 text-3xl font-extrabold text-[#14264B]">
              {publishableCount}
            </p>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                Submitted: <strong>{counts.submitted}</strong>
              </span>

              <span>
                Moderated: <strong>{counts.moderated}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-600">
            Confirming will change all submitted and moderated records
            to Published. Draft records will remain unchanged.
          </p>

          {publishableCount === 0 && (
            <p className="rounded-lg bg-[#FBF6EE] p-3 text-xs text-[#A8212F]">
              There are currently no submitted or moderated records
              to publish.
            </p>
          )}
        </div>
      </Modal>

    </div>
  );
}