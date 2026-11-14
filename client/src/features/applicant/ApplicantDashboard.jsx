import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Upload,
} from "lucide-react";
import ProgressRing from "../../components/charts/ProgressRing";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  applicantDocuments,
  applicantKpis,
  applicantNotices,
  applicantPayment,
  applicantProfile,
  applicantTimeline,
} from "../../mocks/applicantData";
import { formatStatus, getStatusVariant } from "../../utils/status";

const KPI_ICONS = {
  status: BadgeCheck,
  documents: FolderOpen,
  payment: CreditCard,
  notifications: Bell,
};

const TIMELINE_ICONS = {
  completed: CheckCircle2,
  "in progress": Clock,
  pending: Circle,
};

const TIMELINE_TONES = {
  completed: "bg-emerald-50 text-eromza-success",
  "in progress": "bg-amber-50 text-eromza-warning",
  pending: "bg-slate-100 text-eromza-subtle",
};

const documentColumns = [
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
];

export default function ApplicantDashboard() {
  const verifiedDocuments = applicantDocuments.filter(
    (document) => document.status === "verified",
  ).length;
  const documentProgress = Math.round(
    (verifiedDocuments / applicantDocuments.length) * 100,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admission portal"
        title="Applicant Dashboard"
        description="Track your application, upload documents, complete fee payment, and follow admission updates."
        actions={
          <>
            <Button as={Link} to="/applicant/application" variant="secondary">
              <FileText size={16} />
              View application
            </Button>
            <Button as={Link} to="/applicant/documents">
              <Upload size={16} />
              Upload documents
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {applicantKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeLabel=""
            tone={kpi.tone}
            icon={KPI_ICONS[kpi.icon]}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Application summary"
            description="Your current admission application"
            action={
              <Badge variant={getStatusVariant(applicantProfile.status)}>
                {formatStatus(applicantProfile.status)}
              </Badge>
            }
          />
          <CardBody className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Application ID
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {applicantProfile.applicationId}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Programme
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {applicantProfile.program}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Submitted
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {applicantProfile.submitted}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Counselor
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {applicantProfile.counselor}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-eromza-warning">
                Next step
              </p>
              <p className="mt-1 text-xs leading-5 text-eromza-muted">
                {applicantProfile.nextStep}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Documents"
            description="Verification checklist"
            action={
              <Button
                as={Link}
                to="/applicant/documents"
                variant="ghost"
                size="sm"
              >
                Manage
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={documentProgress}
              label="Verified"
              caption={`${verifiedDocuments} of ${applicantDocuments.length} documents verified.`}
            />
            <div className="space-y-2">
              {applicantDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-eromza-border px-3 py-2"
                >
                  <span className="text-xs text-eromza-text">
                    {document.name}
                  </span>
                  <Badge variant={getStatusVariant(document.status)}>
                    {formatStatus(document.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Application progress"
            description="Where your application stands today"
            action={
              <Button
                as={Link}
                to="/applicant/status"
                variant="ghost"
                size="sm"
              >
                Full status
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <CardBody className="space-y-4">
            {applicantTimeline.map((step, index) => {
              const Icon = TIMELINE_ICONS[step.status] ?? Circle;
              const isLast = index === applicantTimeline.length - 1;

              return (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full ${TIMELINE_TONES[step.status] ?? TIMELINE_TONES.pending}`}
                    >
                      <Icon size={15} />
                    </span>
                    {!isLast ? (
                      <span className="mt-1 h-full w-px bg-eromza-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-4">
                    <p className="text-xs font-semibold text-eromza-text">
                      {step.label}
                    </p>
                    <p className="mt-1 text-[11px] text-eromza-subtle">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Admission fee"
              description="Payment for the current application"
              action={
                <Badge variant={getStatusVariant(applicantPayment.status)}>
                  {formatStatus(applicantPayment.status)}
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-eromza-text">
                  ₹{applicantPayment.amount.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-eromza-muted">
                  Due by {applicantPayment.dueDate}
                </p>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3 text-[11px] text-eromza-muted">
                Reference: {applicantPayment.reference}
              </div>
              <Button as={Link} to="/applicant/payments" className="w-full">
                <CreditCard size={16} />
                Pay admission fee
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Notifications"
              description="Latest admission updates"
              action={
                <Button
                  as={Link}
                  to="/applicant/notifications"
                  variant="ghost"
                  size="sm"
                >
                  View all
                </Button>
              }
            />
            <CardBody className="space-y-3">
              {applicantNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-xl border border-eromza-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-5 text-eromza-text">
                      {notice.title}
                    </p>
                    <Badge
                      variant={notice.priority === "High" ? "accent" : "neutral"}
                    >
                      {notice.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-eromza-subtle">
                    <Bell size={12} />
                    {notice.date}
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Uploaded documents"
          description="Documents linked to this application"
          action={
            <Button
              as={Link}
              to="/applicant/documents"
              variant="ghost"
              size="sm"
            >
              Open documents
              <ArrowUpRight size={14} />
            </Button>
          }
        />
        <DataTable
          columns={documentColumns}
          rows={applicantDocuments}
          emptyTitle="No documents uploaded"
        />
      </Card>
    </div>
  );
}
