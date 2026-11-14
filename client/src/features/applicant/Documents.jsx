import { useState } from "react";
import { CheckCircle2, Clock, FolderOpen, Upload } from "lucide-react";
import ProgressRing from "../../components/charts/ProgressRing";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { applicantDocuments } from "../../mocks/applicantData";
import { formatStatus, getStatusVariant } from "../../utils/status";

export default function Documents() {
  const [documents, setDocuments] = useState(applicantDocuments);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "Class XII marksheet",
    fileName: "",
  });

  const verified = documents.filter(
    (document) => document.status === "verified",
  ).length;
  const pending = documents.filter(
    (document) => document.status === "pending",
  ).length;
  const progress = Math.round((verified / documents.length) * 100);

  const handleUpload = (event) => {
    event.preventDefault();
    if (!form.fileName.trim()) return;

    setDocuments((current) => [
      ...current,
      {
        id: `DOC-${Date.now()}`,
        name: form.name,
        status: "pending",
        updated: "Just now",
      },
    ]);
    setForm({ name: "Class XII marksheet", fileName: "" });
    setModalOpen(false);
  };

  const handleReupload = (documentId) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, status: "pending", updated: "Re-uploaded just now" }
          : document,
      ),
    );
  };

  const columns = [
    {
      key: "name",
      header: "Document",
      render: (document) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {document.name}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{document.id}</p>
        </div>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (document) => (
        <span className="text-xs text-eromza-muted">{document.updated}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (document) => (
        <Badge variant={getStatusVariant(document.status)}>
          {formatStatus(document.status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (document) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReupload(document.id)}
        >
          <Upload size={14} />
          Re-upload
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admission portal"
        title="Documents"
        description="Upload and track the documents required for admission verification."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Upload size={16} />
            Upload document
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Required documents"
          value={String(documents.length)}
          tone="info"
          icon={FolderOpen}
        />
        <StatCard
          label="Verified"
          value={String(verified)}
          tone="success"
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending"
          value={String(pending)}
          tone="warning"
          icon={Clock}
        />
        <StatCard
          label="Completion"
          value={`${progress}%`}
          tone="accent"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Document checklist"
            description="Documents linked to your admission application"
          />
          <DataTable
            columns={columns}
            rows={documents}
            emptyTitle="No documents uploaded"
          />
        </Card>

        <Card>
          <CardHeader
            title="Verification progress"
            description="Admission document clearance"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={progress}
              label="Verified"
              caption={`${verified} of ${documents.length} documents verified by the admission office.`}
            />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-eromza-muted">
              Re-upload the Class XII marksheet with a clear scan to complete
              document verification.
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload document"
        description="Add a document to your admission file."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="applicant-document-form">
              <Upload size={16} />
              Upload
            </Button>
          </>
        }
      >
        <form
          id="applicant-document-form"
          className="space-y-4"
          onSubmit={handleUpload}
        >
          <Select
            label="Document type"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          >
            <option value="Class XII marksheet">Class XII marksheet</option>
            <option value="Government ID proof">Government ID proof</option>
            <option value="Leaving certificate">Leaving certificate</option>
            <option value="Passport-size photograph">Passport-size photograph</option>
          </Select>
          <Input
            label="File name"
            value={form.fileName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fileName: event.target.value,
              }))
            }
            placeholder="e.g. class-xii-marksheet.pdf"
            hint="Demo upload only. The file is not transmitted."
            required
          />
        </form>
      </Modal>
    </div>
  );
}
