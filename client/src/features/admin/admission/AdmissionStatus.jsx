import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Send,
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
import { admissionStatuses } from "../../../mocks/admissionAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const STAGES = [
  "Application submitted",
  "Document verification",
  "Merit review",
  "Offer issued",
  "Admission confirmed",
  "Closed",
];

export default function AdmissionStatus() {
  const [rows, setRows] = useState(admissionStatuses);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [form, setForm] = useState({
    stage: "Document verification",
    status: "in progress",
    remarks: "",
  });

  const stages = useMemo(
    () => [...new Set(rows.map((row) => row.stage))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.applicant.toLowerCase().includes(search) ||
        row.applicationId.toLowerCase().includes(search);
      const matchesStage = stageFilter === "all" || row.stage === stageFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [query, rows, stageFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    inProgress: rows.filter((row) => row.status === "in progress").length,
    admitted: rows.filter((row) => row.status === "admitted").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    total: rows.length,
  };

  const handleExport = () => {
    downloadCsv("eromza-admission-status.csv", [
      ["Application", "Applicant", "Program", "Stage", "Status", "Updated", "Remarks"],
      ...filteredRows.map((row) => [
        row.applicationId,
        row.applicant,
        row.program,
        row.stage,
        row.status,
        row.updated,
        row.remarks,
      ]),
    ]);
  };

  const openUpdate = (applicant) => {
    setSelectedApplicant(applicant);
    setForm({
      stage: applicant.stage,
      status: applicant.status,
      remarks: applicant.remarks,
    });
  };

  const saveStatus = (event) => {
    event.preventDefault();

    if (!selectedApplicant) return;

    setRows((current) =>
      current.map((row) =>
        row.applicationId === selectedApplicant.applicationId
          ? {
              ...row,
              stage: form.stage,
              status: form.status,
              remarks: form.remarks.trim(),
              updated: "Just now",
            }
          : row,
      ),
    );
    setSelectedApplicant(null);
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
      key: "stage",
      header: "Current stage",
      render: (row) => <Badge variant="neutral">{row.stage}</Badge>,
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
      key: "updated",
      header: "Updated",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.updated}</span>
      ),
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (row) => (
        <span className="block max-w-[220px] truncate text-xs text-eromza-muted">
          {row.remarks}
        </span>
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
          onClick={() => openUpdate(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Eye size={14} />
          Update
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions administration"
        title="Admission Status"
        description="Track each applicant through verification, merit review, offer, and admission confirmation."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export status board
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="In Progress"
          value={String(counts.inProgress)}
          icon={ClipboardList}
          tone="warning"
        />
        <StatCard
          label="Admitted"
          value={String(counts.admitted)}
          icon={CheckCircle2}
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
          icon={BadgeCheck}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Applicant status board"
          description="Current admission stage and decision for each applicant"
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
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter applicants by stage"
              className="min-w-[190px]"
            >
              <option value="all">All stages</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter applicants by status"
              className="min-w-[160px]"
            >
              <option value="all">All status</option>
              <option value="in progress">In progress</option>
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
        open={Boolean(selectedApplicant)}
        onClose={() => setSelectedApplicant(null)}
        title={selectedApplicant?.applicant ?? "Update admission status"}
        description={
          selectedApplicant
            ? `${selectedApplicant.applicationId} · ${selectedApplicant.program}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedApplicant(null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="status-form">
              <Send size={14} />
              Save status
            </Button>
          </>
        }
      >
        {selectedApplicant ? (
          <form id="status-form" onSubmit={saveStatus} className="space-y-4">
            <div className="rounded-lg bg-eromza-bg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                Current status
              </p>
              <div className="mt-1">
                <Badge variant={getStatusVariant(selectedApplicant.status)}>
                  {formatStatus(selectedApplicant.status)}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Admission stage"
                value={form.stage}
                onChange={(event) =>
                  setForm({ ...form, stage: event.target.value })
                }
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
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
                <option value="in progress">In progress</option>
                <option value="under review">Under review</option>
                <option value="verified">Verified</option>
                <option value="admitted">Admitted</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            <Input
              label="Remarks"
              value={form.remarks}
              onChange={(event) =>
                setForm({ ...form, remarks: event.target.value })
              }
              placeholder="Add a note about this decision"
            />
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
