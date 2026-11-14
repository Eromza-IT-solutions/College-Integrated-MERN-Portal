import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  Eye,
  FileCheck,
  UserCheck,
  XCircle,
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
import { admissionApplications } from "../../../mocks/admissionAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const DOCUMENT_LABELS = {
  idProof: "Government ID proof",
  marksheet: "Class XII marksheet",
  leavingCertificate: "Leaving certificate",
  photo: "Passport-size photograph",
};

export default function Applications() {
  const [rows, setRows] = useState(admissionApplications);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState("");

  const programs = useMemo(
    () => [...new Set(rows.map((row) => row.program))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.applicant.toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search);
      const matchesProgram =
        programFilter === "all" || row.program === programFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesProgram && matchesStatus;
    });
  }, [programFilter, query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    total: rows.length,
    pending: rows.filter(
      (row) => row.status === "pending" || row.status === "under review",
    ).length,
    verified: rows.filter((row) => row.status === "verified").length,
    admitted: rows.filter((row) => row.status === "admitted").length,
  };

  const handleExport = () => {
    downloadCsv("eromza-admission-applications.csv", [
      ["Application", "Applicant", "Program", "Status", "Score", "Submitted"],
      ...filteredRows.map((row) => [
        row.id,
        row.applicant,
        row.program,
        row.status,
        row.score,
        row.submitted,
      ]),
    ]);
  };

  const openReview = (application) => {
    setSelectedApplication(application);
    setReviewStatus(application.status);
    setReviewNotes(application.notes ?? "");
  };

  const saveReview = (event) => {
    event.preventDefault();

    if (!selectedApplication) return;

    setRows((current) =>
      current.map((row) =>
        row.id === selectedApplication.id
          ? { ...row, status: reviewStatus, notes: reviewNotes.trim() }
          : row,
      ),
    );
    setSelectedApplication(null);
  };

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.applicant}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.program}</span>
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
      key: "score",
      header: "Score",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">{row.score}</span>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.submitted}</span>
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
          onClick={() => openReview(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Eye size={14} />
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions administration"
        title="Applications"
        description="Review submitted applications, check documents, and move candidates through admission."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export applications
            </Button>
            <Button onClick={() => setStatusFilter("pending")}>
              <ClipboardCheck size={16} />
              Review queue
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={String(counts.total)}
          icon={ClipboardList}
          tone="info"
        />
        <StatCard
          label="Pending Review"
          value={String(counts.pending)}
          icon={ClipboardCheck}
          tone="warning"
        />
        <StatCard
          label="Verified"
          value={String(counts.verified)}
          icon={FileCheck}
          tone="success"
        />
        <StatCard
          label="Admitted"
          value={String(counts.admitted)}
          icon={UserCheck}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader
          title="Application queue"
          description="All applications received for the current admission cycle"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by applicant or application ID..."
            className="w-full sm:max-w-xs"
          />

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
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by application status"
              className="min-w-[160px]"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="under review">Under review</option>
              <option value="verified">Verified</option>
              <option value="admitted">Admitted</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No applications found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} applications
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={Boolean(selectedApplication)}
        onClose={() => setSelectedApplication(null)}
        title={selectedApplication?.applicant ?? "Application review"}
        description={
          selectedApplication
            ? `${selectedApplication.id} · ${selectedApplication.program}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedApplication(null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="review-form">
              Save review
            </Button>
          </>
        }
      >
        {selectedApplication ? (
          <form id="review-form" onSubmit={saveReview} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Score
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedApplication.score}
                </p>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Submitted
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedApplication.submitted}
                </p>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Current status
                </p>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(selectedApplication.status)}>
                    {formatStatus(selectedApplication.status)}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-eromza-text">
                Document checklist
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(DOCUMENT_LABELS).map(([key, label]) => {
                  const isVerified = selectedApplication.documents?.[key];
                  const Icon = isVerified ? CheckCircle2 : XCircle;

                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
                        isVerified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      <Icon size={15} />
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Application status"
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="under review">Under review</option>
                <option value="verified">Verified</option>
                <option value="admitted">Admitted</option>
                <option value="rejected">Rejected</option>
              </Select>

              <Input
                label="Review notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Add an internal note"
              />
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
