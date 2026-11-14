import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck,
  ShieldCheck,
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
import { admissionDocuments } from "../../../mocks/admissionAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const DOCUMENT_LABELS = {
  idProof: "Government ID proof",
  marksheet: "Class XII marksheet",
  leavingCertificate: "Leaving certificate",
  photo: "Passport-size photograph",
};

function verifiedCount(documents) {
  return Object.values(documents).filter(Boolean).length;
}

export default function VerifyDocuments() {
  const [rows, setRows] = useState(admissionDocuments);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewDocuments, setReviewDocuments] = useState({});
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
        row.applicationId.toLowerCase().includes(search);
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
    pending: rows.filter(
      (row) => row.status === "pending" || row.status === "under review",
    ).length,
    verified: rows.filter((row) => row.status === "verified").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    total: rows.length,
  };

  const handleExport = () => {
    downloadCsv("eromza-document-verification.csv", [
      ["Application", "Applicant", "Program", "Documents", "Status", "Verifier"],
      ...filteredRows.map((row) => [
        row.applicationId,
        row.applicant,
        row.program,
        `${verifiedCount(row.documents)}/4`,
        row.status,
        row.verifier,
      ]),
    ]);
  };

  const openReview = (application) => {
    setSelectedApplication(application);
    setReviewDocuments({ ...application.documents });
    setReviewStatus(application.status);
    setReviewNotes("");
  };

  const toggleDocument = (key) => {
    setReviewDocuments((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const saveReview = (event) => {
    event.preventDefault();

    if (!selectedApplication) return;

    setRows((current) =>
      current.map((row) =>
        row.applicationId === selectedApplication.applicationId
          ? {
              ...row,
              documents: reviewDocuments,
              status: reviewStatus,
              verifier: "Ayesha Khan",
              notes: reviewNotes.trim(),
            }
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
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.applicationId}
          </p>
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
      key: "documents",
      header: "Documents",
      render: (row) => {
        const count = verifiedCount(row.documents);
        const complete = count === Object.keys(DOCUMENT_LABELS).length;

        return (
          <Badge variant={complete ? "success" : "warning"}>
            {count}/{Object.keys(DOCUMENT_LABELS).length} verified
          </Badge>
        );
      },
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
      key: "submitted",
      header: "Submitted",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.submitted}</span>
      ),
    },
    {
      key: "verifier",
      header: "Verifier",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.verifier}</span>
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
        title="Verify Documents"
        description="Check applicant documents, record verification outcomes, and request missing files."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export verification list
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Verification"
          value={String(counts.pending)}
          icon={ClipboardCheck}
          tone="warning"
        />
        <StatCard
          label="Verified"
          value={String(counts.verified)}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Rejected"
          value={String(counts.rejected)}
          icon={XCircle}
          tone="accent"
        />
        <StatCard
          label="Total Applicants"
          value={String(counts.total)}
          icon={FileCheck}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Document verification queue"
          description="Applicants waiting for document checks in the current admission cycle"
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
              aria-label="Filter documents by program"
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
              aria-label="Filter documents by status"
              className="min-w-[160px]"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="under review">Under review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          getRowKey={(row) => row.applicationId}
          emptyTitle="No applicants found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} applicants
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
        title={selectedApplication?.applicant ?? "Document verification"}
        description={
          selectedApplication
            ? `${selectedApplication.applicationId} · ${selectedApplication.program}`
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
            <Button type="submit" form="document-review-form">
              Save verification
            </Button>
          </>
        }
      >
        {selectedApplication ? (
          <form
            id="document-review-form"
            onSubmit={saveReview}
            className="space-y-5"
          >
            <div>
              <p className="text-xs font-semibold text-eromza-text">
                Document checklist
              </p>
              <div className="mt-2 space-y-2">
                {Object.entries(DOCUMENT_LABELS).map(([key, label]) => {
                  const isVerified = Boolean(reviewDocuments[key]);
                  const Icon = isVerified ? CheckCircle2 : XCircle;

                  return (
                    <div
                      key={key}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs ${
                        isVerified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={15} />
                        {label}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleDocument(key)}
                      >
                        {isVerified ? "Mark pending" : "Mark verified"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Verification status"
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="under review">Under review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>

              <Input
                label="Verification notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Add a note for the applicant"
              />
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
