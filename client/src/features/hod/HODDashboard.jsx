import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  CheckSquare,
  ClipboardCheck,
  Download,
  FileCheck,
  FileText,
  GraduationCap,
  UserCheck,
  Users,
} from "lucide-react";
import ActivityFeed from "../../components/common/ActivityFeed";
import BarList from "../../components/charts/BarList";
import ProgressRing from "../../components/charts/ProgressRing";
import TrendChart from "../../components/charts/TrendChart";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  hodActivities,
  hodAttendanceSeries,
  hodFacultyWorkload,
  hodKpis,
  hodPendingApprovals,
  hodProgramPerformance,
} from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const KPI_ICONS = {
  students: Users,
  faculty: GraduationCap,
  attendance: ClipboardCheck,
  approvals: CheckSquare,
};

const ACTIVITY_ICONS = {
  attendance: ClipboardCheck,
  approval: FileCheck,
  request: UserCheck,
  report: FileText,
};

const approvalColumns = [
  {
    key: "type",
    header: "Request",
    render: (approval) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {approval.type}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{approval.id}</p>
      </div>
    ),
  },
  {
    key: "requester",
    header: "Requester",
    render: (approval) => (
      <span className="text-xs text-eromza-muted">{approval.requester}</span>
    ),
  },
  {
    key: "detail",
    header: "Details",
    render: (approval) => (
      <span className="text-xs text-eromza-muted">{approval.detail}</span>
    ),
  },
  {
    key: "submitted",
    header: "Submitted",
    render: (approval) => (
      <span className="text-xs text-eromza-muted">{approval.submitted}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (approval) => (
      <Badge variant={getStatusVariant(approval.status)}>
        {formatStatus(approval.status)}
      </Badge>
    ),
  },
];

export default function HODDashboard() {
  const handleExport = () => {
    downloadCsv("eromza-department-report.csv", [
      ["Metric", "Value"],
      ...hodKpis.map((kpi) => [kpi.label, kpi.value]),
      ["Latest monthly attendance", `${hodAttendanceSeries.values.at(-1)}%`],
      ...hodProgramPerformance.map((item) => [item.label, `${item.value}%`]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department leadership"
        title="HOD Dashboard"
        description="Monitor department performance, faculty workload, student attendance, and pending approvals."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export report
            </Button>
            <Button as={Link} to="/hod/reports">
              <BarChart3 size={16} />
              Department reports
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hodKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeLabel="this semester"
            tone={kpi.tone}
            icon={KPI_ICONS[kpi.icon]}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Department attendance"
            description="Average student attendance across the last six months"
            action={<Badge variant="success">+1.8%</Badge>}
          />
          <CardBody>
            <TrendChart
              labels={hodAttendanceSeries.labels}
              values={hodAttendanceSeries.values}
              color="#3279be"
              ariaLabel="Department attendance over the last six months"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Department health"
            description="Attendance and programme performance"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={87}
              label="Attendance"
              caption="87% average attendance across 486 students this semester."
            />
            <BarList
              items={hodProgramPerformance}
              valueFormatter={(value) => `${value}%`}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Pending approvals"
            description="Requests awaiting department review"
            action={
              <Button
                as={Link}
                to="/hod/teachers"
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={approvalColumns}
            rows={hodPendingApprovals}
            emptyTitle="No pending approvals"
          />
        </Card>

        <Card>
          <CardHeader
            title="Faculty workload"
            description="Weekly teaching hours by faculty member"
            action={
              <Button
                as={Link}
                to="/hod/teachers"
                variant="ghost"
                size="sm"
              >
                Manage
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <CardBody>
            <BarList
              items={hodFacultyWorkload}
              valueFormatter={(value) => `${value} hrs`}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Latest department actions and requests"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody>
          <ActivityFeed items={hodActivities} icons={ACTIVITY_ICONS} />
        </CardBody>
      </Card>
    </div>
  );
}
