import { useMemo, useState } from "react";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileCheck2,
  Pencil,
  RefreshCw,
  Send,
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
  downloadAdminResultPdf,
  enterMarks,
  fetchExamForms,
  fetchExams,
  fetchResults,
  openResult,
  publishExamResults,
  publishResult,
  unpublishResult,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import { downloadCsv } from "../../../utils/csv";
import { formatDate, formatPercent } from "../../../utils/format";
import { formatStatus, getStatusVariant } from "../../../utils/status";

import "../../../assets/styles/aisc-premium.css";

const PAGE_SIZE = 6;

const EMPTY_MARK = {
  internalMarks: "",
  externalMarks: "",
  absent: false,
  maxInternal: 40,
  maxExternal: 60,
};

function resultState(row) {
  if (!row.result) return "not-opened";
  if (row.result.isPublished) return "published";
  return row.result.isComplete ? "ready" : "draft";
}

function validMark(value, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max && Number.isInteger(number * 2);
}

export default function MarksAndResults() {
  const exams = useApiData(() => fetchExams());
  const [selectedExamId, setSelectedExamId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [marksOpen, setMarksOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(null);
  const [markEntries, setMarkEntries] = useState({});
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishExamOpen, setPublishExamOpen] = useState(false);
  const [unpublishTarget, setUnpublishTarget] = useState(null);
  const [unpublishReason, setUnpublishReason] = useState("");

  const examRows = useMemo(() => exams.data ?? [], [exams.data]);
  const activeExam =
    examRows.find((exam) => String(exam._id) === String(selectedExamId)) || examRows[0];
  const forms = useApiData(
    () => (activeExam
      ? fetchExamForms({ examId: activeExam._id, status: "approved", limit: 100 })
      : Promise.resolve([])),
    activeExam?._id || "none",
  );
  const results = useApiData(
    () => (activeExam ? fetchResults({ examId: activeExam._id }) : Promise.resolve([])),
    activeExam?._id || "none",
  );

  const rows = useMemo(() => {
    const byForm = new Map((results.data ?? []).map((result) => [String(result.examFormId), result]));
    return (forms.data ?? []).map((form) => {
      const result = byForm.get(String(form._id)) || null;
      return {
        _id: String(form._id),
        form,
        result,
        fullName: result?.fullName || form.details?.fullName || form.studentId?.fullName || "Unknown student",
        enrollmentNumber: result?.enrollmentNumber || form.details?.enrollmentNumber || form.studentId?.enrollmentNumber || "—",
        papers: result?.lines?.length || form.subjects?.length || 0,
        status: resultState({ result }),
      };
    });
  }, [forms.data, results.data]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !search
        || row.fullName.toLowerCase().includes(search)
        || row.enrollmentNumber.toLowerCase().includes(search);
      const matchesStatus = statusFilter === "all"
        || row.status === statusFilter
        || (statusFilter === "pass" && row.result?.outcome === "pass")
        || (statusFilter === "fail" && row.result?.outcome === "fail");
      return matchesSearch && matchesStatus;
    });
  }, [query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const counts = {
    forms: rows.length,
    opened: rows.filter((row) => row.result).length,
    ready: rows.filter((row) => row.status === "ready").length,
    published: rows.filter((row) => row.status === "published").length,
  };

  const reload = () => {
    forms.reload();
    results.reload();
  };

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const changeExam = (examId) => {
    setSelectedExamId(examId);
    setPage(1);
    clearFeedback();
  };

  const handleOpenSheet = async (row) => {
    setSaving(true);
    clearFeedback();
    try {
      await openResult(row.form._id);
      setMessage(`Result sheet opened for ${row.fullName}.`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openMarks = (result) => {
    const lines = Array.isArray(result.lines) ? result.lines : [];
    const entries = {};
    for (const line of lines) {
      entries[String(line.subjectId)] = {
        internalMarks: line.internalMarks ?? "",
        externalMarks: line.externalMarks ?? "",
        absent: Boolean(line.absent),
        maxInternal: line.maxInternal ?? 40,
        maxExternal: line.maxExternal ?? 60,
      };
    }
    setActiveResult(result);
    setMarkEntries(entries);
    clearFeedback();
    setMarksOpen(true);
  };

  const closeMarks = () => {
    setMarksOpen(false);
    setActiveResult(null);
    setMarkEntries({});
  };

  const updateMark = (subjectId, field, value) => {
    setMarkEntries((current) => ({
      ...current,
      [subjectId]: { ...current[subjectId], [field]: value },
    }));
  };

  const handleSaveMarks = async () => {
    if (!activeResult) return;
    clearFeedback();

    const lines = Array.isArray(activeResult.lines) ? activeResult.lines : [];
    const entries = [];
    for (const line of lines) {
      const subjectId = String(line.subjectId);
      const values = markEntries[subjectId] || EMPTY_MARK;
      const maxInternal = Number(values.maxInternal ?? line.maxInternal ?? 40);
      const maxExternal = Number(values.maxExternal ?? line.maxExternal ?? 60);
      if (values.absent) {
        entries.push({ subjectId, absent: true, maxInternal, maxExternal });
        continue;
      }
      if (values.internalMarks === "" || values.externalMarks === "") {
        setError(`Enter both internal and external marks for ${line.name || line.code || subjectId}.`);
        return;
      }
      if (!validMark(values.internalMarks, maxInternal) || !validMark(values.externalMarks, maxExternal)) {
        setError(`Marks must be between 0 and the maximum, in steps of 0.5, for ${line.name || line.code || subjectId}.`);
        return;
      }
      entries.push({
        subjectId,
        absent: false,
        internalMarks: Number(values.internalMarks),
        externalMarks: Number(values.externalMarks),
        maxInternal,
        maxExternal,
      });
    }

    if (entries.length === 0) {
      setError("This result sheet has no papers to update.");
      return;
    }

    setSaving(true);
    try {
      await enterMarks(activeResult._id, entries);
      setMessage("Marks saved. Grades and SGPA were recalculated.");
      closeMarks();
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    setSaving(true);
    clearFeedback();
    try {
      await publishResult(publishTarget._id);
      setMessage(`Published the result for ${publishTarget.fullName}.`);
      setPublishTarget(null);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishExam = async () => {
    if (!activeExam) return;
    setSaving(true);
    clearFeedback();
    try {
      const outcome = await publishExamResults(activeExam._id);
      setMessage(`Published ${outcome.published ?? 0} result(s); ${outcome.incomplete ?? 0} incomplete sheet(s) skipped.`);
      setPublishExamOpen(false);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishTarget) return;
    if (unpublishReason.trim().length < 3) {
      setError("Give a reason of at least 3 characters.");
      return;
    }
    setSaving(true);
    clearFeedback();
    try {
      await unpublishResult(unpublishTarget._id, unpublishReason.trim());
      setMessage(`Unpublished the result for ${unpublishTarget.fullName}.`);
      setUnpublishTarget(null);
      setUnpublishReason("");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadCsv("aisc-result-register.csv", [
      ["Student", "Enrollment", "Papers", "Completion", "Outcome", "Percentage", "SGPA", "Status"],
      ...filteredRows.map((row) => [
        row.fullName,
        row.enrollmentNumber,
        row.papers,
        row.result?.isComplete ? "Complete" : row.result ? "Incomplete" : "Not opened",
        row.result?.outcome || "",
        row.result?.percentage ?? "",
        row.result?.sgpa ?? "",
        formatStatus(row.status),
      ]),
    ]);
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div>
          <div className="aisc-table-primary">{row.fullName}</div>
          <div className="aisc-table-secondary">{row.enrollmentNumber}</div>
        </div>
      ),
    },
    {
      key: "papers",
      header: "Papers",
      render: (row) => <span className="font-bold text-[#14264B]">{row.papers}</span>,
    },
    {
      key: "completion",
      header: "Completion",
      render: (row) => (
        <Badge variant={row.result?.isComplete ? "success" : row.result ? "warning" : "neutral"}>
          {row.result?.isComplete ? "Complete" : row.result ? "Incomplete" : "Not opened"}
        </Badge>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (row) => (
        <div>
          <div>
            <Badge variant={getStatusVariant(row.result?.outcome || "pending")}>
              {row.result?.outcome ? formatStatus(row.result.outcome) : "Awaiting marks"}
            </Badge>
          </div>
          <div className="aisc-table-secondary">
            {formatPercent(row.result?.percentage)} · SGPA {row.result?.sgpa ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Publication",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{formatStatus(row.status)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {!row.result ? (
            <button
              type="button"
              title="Open result sheet"
              className="aisc-action-btn"
              disabled={saving}
              onClick={() => handleOpenSheet(row)}
            >
              <RefreshCw size={14} />
            </button>
          ) : null}
          {row.result && !row.result.isPublished ? (
            <>
              <button
                type="button"
                title="Enter marks"
                className="aisc-action-btn"
                onClick={() => openMarks(row.result)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                title="Publish result"
                className="aisc-action-btn"
                onClick={() => {
                  setPublishTarget({ ...row.result, fullName: row.fullName });
                  clearFeedback();
                }}
              >
                <Send size={14} />
              </button>
            </>
          ) : null}
          {row.result ? (
            <button
              type="button"
              title="Download result PDF"
              className="aisc-action-btn"
              onClick={() => downloadAdminResultPdf(row.result)}
            >
              <Download size={14} />
            </button>
          ) : null}
          {row.result?.isPublished ? (
            <button
              type="button"
              title="Unpublish result"
              className="aisc-action-btn"
              onClick={() => {
                setUnpublishTarget({ ...row.result, fullName: row.fullName });
                setUnpublishReason("");
                clearFeedback();
              }}
            >
              <XCircle size={14} />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const stats = [
    { label: "Approved Forms", value: counts.forms, icon: Users, color: "#315FCE", soft: "#EEF3FF" },
    { label: "Sheets Opened", value: counts.opened, icon: BookOpenCheck, color: "#B58A16", soft: "#FFF7DF" },
    { label: "Ready to Publish", value: counts.ready, icon: FileCheck2, color: "#2C9271", soft: "#EAF7F1" },
    { label: "Published", value: counts.published, icon: Award, color: "#A8212F", soft: "#F9ECEE" },
  ];

  return (
    <div className="aisc-premium space-y-6">
      <section className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13} /> Examination Cell</div>
          <h1 className="aisc-page-title">Marks &amp; Results</h1>
          <p className="aisc-page-subtitle">
            Examination marks register for approved forms, with calculated grades and publication control.
          </p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14} /> {formatDate(activeExam?.formClosesAt)}</div>
      </section>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><ClipboardList size={12} /> RESULT OPERATIONS</div>
          <h2 className="aisc-hero-title">One sheet per student. Every mark audited.</h2>
          <p className="aisc-hero-text">
            Open sheets from approved exam forms, enter internal and external marks, then publish complete results for the session.
          </p>
          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={() => setPublishExamOpen(true)}
              disabled={!activeExam || counts.ready === 0}
            >
              <Send size={15} /> Publish session results
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
              style={{ "--kpi-color": stat.color, "--kpi-soft": stat.soft, "--progress": counts.forms ? `${(stat.value / counts.forms) * 100}%` : "0%" }}
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
            <h3 className="aisc-panel-title">Examination marks register</h3>
            <p className="aisc-panel-sub">Approved forms and result sheets for the selected session</p>
          </div>
          <Select
            value={activeExam?._id || ""}
            onChange={(event) => changeExam(event.target.value)}
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
            className="max-w-md"
          />
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by result status"
            className="min-w-[170px]"
          >
            <option value="all">All result status</option>
            <option value="not-opened">Not opened</option>
            <option value="draft">Incomplete</option>
            <option value="ready">Ready to publish</option>
            <option value="published">Published</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
          </Select>
          <Badge variant="neutral">{rows.length} approved forms</Badge>
        </div>

        {exams.loading || forms.loading || results.loading ? (
          <Loader label="Loading marks and results..." />
        ) : exams.error || forms.error || results.error ? (
          <ErrorState
            title="Could not load marks and results"
            description={exams.error?.message || forms.error?.message || results.error?.message}
            onRetry={() => {
              exams.reload();
              reload();
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowKey={(row) => row._id}
            emptyTitle="No result sheets found"
            emptyDescription="Approve exam forms first, then open a result sheet for each student."
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
              <span className="text-slate-500">Showing {pageRows.length} of {filteredRows.length} students</span>
            ) : null}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>

      <Modal
        open={marksOpen}
        onClose={closeMarks}
        title="Enter Marks"
        description={activeResult ? `${activeResult.fullName || "Student"} · ${activeResult.enrollmentNumber || "—"}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={closeMarks}>Cancel</Button>
            <Button onClick={handleSaveMarks} disabled={saving}>
              {saving ? "Saving..." : "Save marks"}
            </Button>
          </>
        }
      >
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          ) : null}
          {(Array.isArray(activeResult?.lines) ? activeResult.lines : []).map((line) => {
            const subjectId = String(line.subjectId);
            const values = markEntries[subjectId] || EMPTY_MARK;
            return (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={subjectId}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#14264B]">{line.name || line.code || "Paper"}</div>
                    <div className="aisc-table-secondary">{line.code || "—"} · {line.credits ?? 0} credits</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={Boolean(values.absent)}
                      onChange={(event) => updateMark(subjectId, "absent", event.target.checked)}
                      className="h-4 w-4 accent-[#A8212F]"
                    />
                    Absent
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label={`Internal marks (max ${values.maxInternal})`}
                    type="number"
                    min="0"
                    max={values.maxInternal}
                    step="0.5"
                    value={values.absent ? "" : values.internalMarks}
                    disabled={values.absent}
                    onChange={(event) => updateMark(subjectId, "internalMarks", event.target.value)}
                  />
                  <Input
                    label={`External marks (max ${values.maxExternal})`}
                    type="number"
                    min="0"
                    max={values.maxExternal}
                    step="0.5"
                    value={values.absent ? "" : values.externalMarks}
                    disabled={values.absent}
                    onChange={(event) => updateMark(subjectId, "externalMarks", event.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        title="Publish Result"
        description={publishTarget ? `${publishTarget.fullName || "Student"} · ${publishTarget.enrollmentNumber || "—"}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishTarget(null)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={saving}>
              {saving ? "Publishing..." : "Publish result"}
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
            Publishing locks this sheet for normal editing. It can be unpublished later with an audited reason.
          </p>
          <div className="aisc-callout"><CheckCircle2 size={17} /> <span>Complete sheets only: every paper must have marks or an absence recorded.</span></div>
        </div>
      </Modal>

      <Modal
        open={publishExamOpen}
        onClose={() => setPublishExamOpen(false)}
        title="Publish Session Results"
        description={activeExam ? `${activeExam.name} · Semester ${activeExam.semester}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishExamOpen(false)}>Cancel</Button>
            <Button onClick={handlePublishExam} disabled={saving}>
              {saving ? "Publishing..." : "Publish all complete"}
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
            Only complete sheets are published. Incomplete sheets stay in draft and are reported in the result message.
          </p>
          <div className="aisc-callout"><FileCheck2 size={17} /> <span>{counts.ready} sheet(s) are ready to publish in this session.</span></div>
        </div>
      </Modal>

      <Modal
        open={Boolean(unpublishTarget)}
        onClose={() => {
          setUnpublishTarget(null);
          setUnpublishReason("");
        }}
        title="Unpublish Result"
        description={unpublishTarget ? `${unpublishTarget.fullName || "Student"} · ${unpublishTarget.enrollmentNumber || "—"}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUnpublishTarget(null)}>Cancel</Button>
            <Button onClick={handleUnpublish} disabled={saving}>
              {saving ? "Unpublishing..." : "Unpublish result"}
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
          <Input
            label="Reason for unpublishing *"
            value={unpublishReason}
            onChange={(event) => setUnpublishReason(event.target.value)}
            placeholder="Explain why this published result is being withdrawn"
          />
          <div className="aisc-callout"><XCircle size={17} /> <span>The reason is saved in the audit log and shown on the result record.</span></div>
        </div>
      </Modal>
    </div>
  );
}
