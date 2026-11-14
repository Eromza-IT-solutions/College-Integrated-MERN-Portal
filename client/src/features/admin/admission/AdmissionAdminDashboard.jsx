import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileCheck,
  FileText,
  Plus,
  Wallet,
} from "lucide-react";
import ActivityFeed from "../../../components/common/ActivityFeed";
import BarList from "../../../components/charts/BarList";
import TrendChart from "../../../components/charts/TrendChart";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import {
  admissionActivities,
  admissionAdminKpis,
  admissionApplicationSeries,
  admissionFunnel,
  admissionProgramDemand,
  admissionRecentApplications,
} from "../../../mocks/admissionAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const KPI_ICONS = {
  applications: ClipboardList,
  clock: Clock,
  documents: FileCheck,
  fees: Wallet,
};

const ACTIVITY_ICONS = {
  check: CheckCircle2,
  application: ClipboardList,
  fees: Wallet,
  document: FileText,
  status: BadgeCheck,
};

const applicationColumns = [
  {
    key: "applicant",
    header: "Applicant",
    render: (application) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {application.applicant}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {application.id}
        </p>
      </div>
    ),
  },
  {
    key: "program",
    header: "Program",
    render: (application) => (
      <span className="text-xs text-eromza-muted">{application.program}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (application) => (
      <Badge variant={getStatusVariant(application.status)}>
        {formatStatus(application.status)}
      </Badge>
    ),
  },
  {
    key: "score",
    header: "Score",
    render: (application) => (
      <span className="text-xs font-medium text-eromza-text">
        {application.score}
      </span>
    ),
  },
  {
    key: "submitted",
    header: "Submitted",
    render: (application) => (
      <span className="text-xs text-eromza-muted">{application.submitted}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    cellClassName: "text-right",
    render: () => (
      <Button
        as={Link}
        to="/admission-admin/applications"
        variant="ghost"
        size="sm"
        className="text-eromza-accent hover:bg-rose-50"
      >
        Review
      </Button>
    ),
  },
];

export default function AdmissionAdminDashboard() {
  const handleExport = () => {
    downloadCsv("eromza-admission-report.csv", [
      ["Metric", "Value"],
      ...admissionAdminKpis.map((kpi) => [kpi.label, kpi.value]),
      ["Latest monthly applications", admissionApplicationSeries.values.at(-1)],
      ...admissionFunnel.map((stage) => [stage.label, stage.value]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions administration"
        title="Admission Admin Dashboard"
        description="Track applications, verify documents, and move prospective students through the admission journey."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export report
            </Button>
            <Button as={Link} to="/admission-admin/applications">
              <Plus size={16} />
              Review applications
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {admissionAdminKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            tone={kpi.tone}
            icon={KPI_ICONS[kpi.icon]}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Applications received"
            description="Monthly application volume across the last six months"
            action={<Badge variant="success">+12.4%</Badge>}
          />
          <CardBody>
            <TrendChart
              labels={admissionApplicationSeries.labels}
              values={admissionApplicationSeries.values}
              color="#3279be"
              ariaLabel="Applications received over the last six months"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Admission funnel"
            description="Applicants by current stage"
          />
          <CardBody>
            <BarList
              items={admissionFunnel}
              valueFormatter={(value) => `${value} applicants`}
            />
            <div className="mt-5 rounded-lg bg-eromza-bg p-3 text-xs leading-5 text-eromza-muted">
              38 applications are waiting for review. The verification team
              cleared 22 files today.
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Recent applications"
            description="Latest submissions and decisions"
            action={
              <Button
                as={Link}
                to="/admission-admin/applications"
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={applicationColumns}
            rows={admissionRecentApplications}
            emptyTitle="No applications found"
          />
        </Card>

        <Card>
          <CardHeader
            title="Program demand"
            description="Applications by first preference"
            action={
              <Button
                as={Link}
                to="/admission-admin/status"
                variant="ghost"
                size="sm"
              >
                Status board
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <CardBody>
            <BarList
              items={admissionProgramDemand}
              color="#3279be"
              valueFormatter={(value) => `${value} applications`}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Latest admission administration actions"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody>
          <ActivityFeed items={admissionActivities} icons={ACTIVITY_ICONS} />
        </CardBody>
      </Card>
    </div>
  );
}
