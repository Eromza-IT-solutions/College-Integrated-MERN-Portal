import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Sparkles,
  Users,
  XCircle,
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
  decideExamForm,
  downloadAdminExamFormPdf,
  fetchExamForms,
  fetchExamReference,
  fetchExams,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import { downloadCsv } from "../../../utils/csv";
import {
  formDisplayName,
  formEnrollment,
  programLabel,
  subjectLabel,
} from "../../../utils/examAdmin";
import { formatDate, formatPaise } from "../../../utils/format";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

export default function SubjectsAndExamForms() {
  const exams = useApiData(() => fetchExams());
  const reference = useApiData(() => fetchExamReference());
  const [selectedExamId, setSelectedExamId] = useState("");
  const [query, setQuery] = useState("");
  const [formFilter, setFormFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedForm, setSelectedForm] = useState(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState({ approve: true, note: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const examRows = useMemo(() => exams.data ?? [], [exams.data]);
  const subjects = useMemo(() => reference.data?.subjects ?? [], [reference.data]);
  const programs = useMemo(() => reference.data?.programs ?? [], [reference.data]);
  const activeExam =
    examRows.find((exam) => String(exam._id) === String(selectedExamId)) || examRows[0];
  const forms = useApiData(
    () => (activeExam ? fetchExamForms({ examId: activeExam._id }) : Promise.resolve([])),
    activeExam?._id || "none",
  );

  const formRows = useMemo(() => forms.data ?? [], [forms.data]);

  const subjectRows = useMemo(() => {
    if (!activeExam) return [];
    return subjects.filter(
      (subject) =>
        String(subject.programId) === String(activeExam.programId) &&
        Number(subject.semester) === Number(activeExam.semester),
    );
  }, [activeExam, subjects]);

  const filteredForms = useMemo(() => {
    const search = query.trim().toLowerCase();
    return formRows.filter((form) => {
      const name = formDisplayName(form);
      const enrollment = formEnrollment(form);
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search) ||
        enrollment.toLowerCase().includes(search);
      const matchesStatus =
        formFilter === "all" || form.status === formFilter;
      return matchesSearch && matchesStatus;
    });
  }, [formFilter, formRows, query]);

  const totalPages = Math.max(1, Math.ceil(filteredForms.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredForms.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    subjects: subjectRows.length,
    forms: formRows.length,
    approved: formRows.filter((form) => form.status === "approved").length,
    pending: formRows.filter((form) => form.status === "submitted").length,
  };

  const openDecision = (form, approve) => {
    setSelectedForm(form);
    setDecision({ approve, note: "" });
    setError("");
    setDecisionOpen(true);
  };

  const closeDecision = () => {
    setDecisionOpen(false);
    setSelectedForm(null);
    setDecision({ approve: true, note: "" });
    setError("");
  };

  const handleDecision = async () => {
    if (!selectedForm) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await decideExamForm(selectedForm._id, decision);
      setMessage(decision.approve ? "Exam form approved." : "Exam form rejected.");
      closeDecision();
      forms.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv("aisc-exam-form-register.csv", [
      ["Student", "Enrollment", "Session", "Subjects", "Fee", "Status", "Submitted"],
      ...filteredForms.map((form) => [
        formDisplayName(form),
        formEnrollment(form),
        activeExam?.name || "",
        form.subjectIds?.length ?? 0,
        formatPaise(form.feeAmountPaise),
        form.status,
        form.submittedAt,
      ]),
    ]);
  };

  const formColumns = [
    {
      key: "student",
      header: "Student",
      render: (form) => (
        <div>
          <div className="aisc-table-primary">{formDisplayName(form)}</div>
          <div className="aisc-table-secondary">{formEnrollment(form)}</div>
        </div>
      ),
    },
    {
      key: "subjects",
      header: "Papers",
      render: (form) => <span className="font-bold text-[#14264B]">{form.subjectIds?.length ?? 0}</span>,
    },
    {
      key: "fee",
      header: "Fee",
      render: (form) => (
        <span className="font-semibold text-[#14264B]">{formatPaise(form.feeAmountPaise)}</span>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      render: (form) => <span className="text-xs text-slate-600">{formatDate(form.submittedAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (form) => (
        <Badge variant={getStatusVariant(form.status)}>{formatStatus(form.status)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (form) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="View exam form"
            className="aisc-action-btn"
            onClick={() => setSelectedForm(form)}
          >
            <Eye size={14} />
          </button>
          {form.status === "submitted" ? (
            <>
              <button
                type="button"
                title="Approve exam form"
                className="aisc-action-btn"
                onClick={() => openDecision(form, true)}
              >
                <CheckCircle2 size={14} />
              </button>
              <button
                type="button"
                title="Reject exam form"
                className="aisc-action-btn"
                onClick={() => openDecision(form, false)}
              >
                <XCircle size={14} />
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const stats = [
    { id: "subjects", label: "Total Subjects", value: counts.subjects, icon: BookOpen, change: "Session subjects" },
    { id: "forms", label: "Exam Forms", value: counts.forms, icon: FileText, change: "All application forms" },
    { id: "approved", label: "Approved Forms", value: counts.approved, icon: CheckCircle2, change: "Eligible for tickets" },
    { id: "pending", label: "Pending Review", value: counts.pending, icon: Users, change: "Awaiting decision" },
  ];

  return (
    <div className="aisc-premium">
      <div className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13} /> Examination Cell · Academic year 2026–27</div>
          <h1 className="aisc-page-title">Subjects & Exam Forms</h1>
          <p className="aisc-page-subtitle">
            Review subjects, student registrations and examination form decisions for the active session.
          </p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14} /> {activeExam ? `Semester ${activeExam.semester}` : "Examination Operations"}</div>
      </div>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><BookOpen size={12} /> ABEDA INAMDAR SENIOR COLLEGE</div>
          <h2 className="aisc-hero-title">Every subject. One academic record.</h2>
          <p className="aisc-hero-text">
            Subject data comes from the academic register. Exam forms are submitted by students and decided here before hall tickets are generated.
          </p>
          <div className="aisc-hero-actions">
            <button type="button" className="aisc-btn aisc-btn-primary" onClick={() => setSelectedExamId(examRows[0]?._id || "")} disabled={!examRows.length}>
              <FileText size={15} /> Review forms
            </button>
            <button type="button" className="aisc-btn aisc-btn-glass" onClick={handleExport}>
              <Download size={15} /> Export register
            </button>
          </div>
        </div>
        <div className="aisc-hero-seal"><BookOpen size={52} strokeWidth={1.2} /></div>
      </section>

      <section className="aisc-grid aisc-kpis">
        {stats.map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              className="aisc-kpi"
              key={item.id}
              style={{ "--kpi-color": "#315FCE", "--kpi-soft": "#EEF3FF", "--progress": `${Math.min(100, (item.value / Math.max(1, counts.forms)) * 100)}%`, animationDelay: `${index * 80}ms` }}
            >
              <div className="aisc-kpi-top"><div className="aisc-kpi-icon"><Icon size={19} /></div><span className="aisc-kpi-change">{item.change}</span></div>
              <div className="aisc-kpi-label">{item.label}</div>
              <div className="aisc-kpi-value">{item.value.toLocaleString("en-IN")}</div>
              <div className="aisc-kpi-note">Current examination cycle</div>
              <div className="aisc-kpi-track"><span /></div>
            </article>
          );
        })}
      </section>

      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel" style={{ gridColumn: "1 / -1" }}>
          <div className="aisc-panel-head">
            <div>
              <h3 className="aisc-panel-title">Subject & exam form register</h3>
              <p className="aisc-panel-sub">Active session subjects and the forms submitted for them</p>
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
              disabled={!examRows.length}
            >
              {examRows.length === 0 ? <option value="">No sessions available</option> : null}
              {examRows.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.name} · Semester {exam.semester}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 border-b border-slate-100 bg-[#FBF6EE] p-4 lg:grid-cols-[1fr_auto_auto]">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search student or enrollment..."
            />
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
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Badge variant="neutral">{subjectRows.length} subjects · {formRows.length} forms</Badge>
          </div>

          {exams.loading || reference.loading || forms.loading ? (
            <Loader label="Loading subjects and exam forms..." />
          ) : exams.error || reference.error || forms.error ? (
            <ErrorState
              title="Could not load the exam form register"
              description={exams.error?.message || reference.error?.message || forms.error?.message}
              onRetry={() => {
                exams.reload();
                reference.reload();
                forms.reload();
              }}
            />
          ) : (
            <>
              <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjectRows.slice(0, 6).map((subject) => (
                  <div className="aisc-detail-box" key={subject._id}>
                    <div className="aisc-table-primary">{subjectLabel(subject._id, subjectRows)}</div>
                    <div className="aisc-table-secondary">
                      {programLabel(subject.programId, programs)} · Semester {subject.semester}
                    </div>
                  </div>
                ))}
              </div>

              <DataTable
                columns={formColumns}
                rows={pageRows}
                getRowKey={(form) => form._id}
                emptyTitle="No exam forms found"
                emptyDescription="No forms match the selected session and filters."
              />
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-medium">
              {message ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={14} /> {message}</span>
              ) : null}
              {error ? <span className="text-red-600">{error}</span> : null}
              {!message && !error ? (
                <span className="text-slate-500">Showing {pageRows.length} of {filteredForms.length} exam forms</span>
              ) : null}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </article>
      </section>

      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div><h3 className="aisc-panel-title">Examination form availability</h3><p className="aisc-panel-sub">Current session overview</p></div>
            <Award size={19} color="#A8212F" />
          </div>
          <div className="aisc-progress-list">
            {[
              { label: "Approved forms", value: counts.approved, color: "#2C9271" },
              { label: "Pending review", value: counts.pending, color: "#A8212F" },
              { label: "Draft forms", value: formRows.filter((form) => form.status === "draft").length, color: "#B58A16" },
            ].map((item) => (
              <div key={item.label}>
                <div className="aisc-progress-top"><span>{item.label}</span><strong>{item.value}</strong></div>
                <div className="aisc-progress-track">
                  <span style={{ "--progress": `${counts.forms ? (item.value / counts.forms) * 100 : 0}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div><h3 className="aisc-panel-title">Subject management</h3><p className="aisc-panel-sub">Quick actions for the examination cell</p></div>
            <FileText size={19} color="#A8212F" />
          </div>
          <div className="aisc-activity">
            <div className="aisc-activity-icon"><CheckCircle2 size={15} /></div>
            <div><div className="aisc-activity-title">Approve exam forms</div><div className="aisc-activity-time">Approved forms become eligible for hall tickets</div></div>
          </div>
          <div className="aisc-activity">
            <div className="aisc-activity-icon"><Download size={15} /></div>
            <div><div className="aisc-activity-title">Export exam form register</div><div className="aisc-activity-time">Download the filtered form records</div></div>
            <button type="button" className="aisc-panel-link" onClick={handleExport}>Export</button>
          </div>
        </article>
      </section>

      <Modal
        open={Boolean(selectedForm) && !decisionOpen}
        onClose={() => setSelectedForm(null)}
        title={formDisplayName(selectedForm)}
        description={selectedForm ? `${formEnrollment(selectedForm)} · Exam form` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedForm(null)}>Close</Button>
            {selectedForm?.status === "submitted" ? (
              <Button onClick={() => openDecision(selectedForm, true)}>Approve form</Button>
            ) : null}
          </>
        }
      >
        {selectedForm ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getStatusVariant(selectedForm.status)}>{formatStatus(selectedForm.status)}</Badge>
              <Badge variant="neutral">{selectedForm.subjectIds?.length ?? 0} papers</Badge>
              <Badge variant="info">{formatPaise(selectedForm.feeAmountPaise)}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Submitted</div>
                <div className="mt-2 text-sm font-bold text-[#14264B]">{formatDate(selectedForm.submittedAt)}</div>
              </div>
              <div className="aisc-detail-box">
                <div className="aisc-kpi-label">Decision</div>
                <div className="mt-2 text-sm font-bold text-[#14264B]">{formatStatus(selectedForm.status)}</div>
              </div>
            </div>
            <Button variant="secondary" onClick={() => downloadAdminExamFormPdf(selectedForm)}>
              <Download size={14} /> Download PDF
            </Button>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={decisionOpen}
        onClose={closeDecision}
        title={decision.approve ? "Approve Exam Form" : "Reject Exam Form"}
        description={selectedForm ? `${formDisplayName(selectedForm)} · ${formEnrollment(selectedForm)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={closeDecision}>Cancel</Button>
            <Button onClick={handleDecision} disabled={saving}>
              {saving ? "Saving..." : decision.approve ? "Approve form" : "Reject form"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>
          ) : null}
          <Input
            label="Decision note"
            value={decision.note}
            onChange={(event) => setDecision((current) => ({ ...current, note: event.target.value }))}
            placeholder={decision.approve ? "Optional note" : "Reason for rejection"}
          />
          <div className="aisc-callout">
            {decision.approve ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>
              {decision.approve
                ? "The student becomes eligible for hall ticket generation once the timetable is complete."
                : "The student must correct and resubmit the form before a hall ticket can be issued."}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
