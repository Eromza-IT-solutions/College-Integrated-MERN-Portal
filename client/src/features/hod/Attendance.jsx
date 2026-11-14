import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Clock,
  Download,
} from "lucide-react";
import ProgressRing from "../../components/charts/ProgressRing";
import TrendChart from "../../components/charts/TrendChart";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  hodAttendanceRows,
  hodAttendanceSeries,
} from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const attendanceColumns = [
  {
    key: "className",
    header: "Class",
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {row.className}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
      </div>
    ),
  },
  {
    key: "faculty",
    header: "Faculty",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.faculty}</span>
    ),
  },
  {
    key: "students",
    header: "Students",
    render: (row) => (
      <span className="text-xs text-eromza-muted">
        {row.present}/{row.students}
      </span>
    ),
  },
  {
    key: "attendance",
    header: "Attendance",
    render: (row) => (
      <Badge variant={row.attendance >= 85 ? "success" : "warning"}>
        {row.attendance}%
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
];

export default function Attendance() {
  const average =
    Math.round(
      (hodAttendanceRows.reduce((sum, row) => sum + row.attendance, 0) /
        hodAttendanceRows.length) *
        10,
    ) / 10;
  const pending = hodAttendanceRows.filter(
    (row) => row.status === "pending",
  ).length;

  const handleExport = () => {
    downloadCsv("eromza-department-attendance.csv", [
      ["Class", "Faculty", "Students", "Present", "Attendance", "Status"],
      ...hodAttendanceRows.map((row) => [
        row.className,
        row.faculty,
        row.students,
        row.present,
        `${row.attendance}%`,
        row.status,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department attendance"
        title="Attendance"
        description="Monitor class-wise attendance, faculty submissions, and students needing support."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export attendance
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average attendance"
          value={`${average}%`}
          tone="success"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Classes reporting"
          value={`${hodAttendanceRows.length - pending}/${hodAttendanceRows.length}`}
          tone="info"
          icon={BookOpen}
        />
        <StatCard
          label="Below 75%"
          value="12"
          change="-2"
          changeLabel="vs last month"
          tone="warning"
          icon={AlertTriangle}
        />
        <StatCard
          label="Pending submissions"
          value={pending.toString()}
          tone="accent"
          icon={Clock}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Attendance trend"
            description="Average department attendance across the last six months"
            action={<Badge variant="success">+1.8%</Badge>}
          />
          <CardBody>
            <TrendChart
              labels={hodAttendanceSeries.labels}
              values={hodAttendanceSeries.values}
              color="#3279be"
              ariaLabel="Department attendance trend"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Attendance health"
            description="Current department average"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={average}
              label="Present"
              caption="Average attendance across all active department classes."
            />
            <div className="rounded-lg bg-eromza-bg p-3 text-xs leading-5 text-eromza-muted">
              12 students are below the 75% attendance threshold and need
              follow-up from their class teachers.
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Class attendance"
          description="Attendance submitted by faculty for active classes"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <DataTable
          columns={attendanceColumns}
          rows={hodAttendanceRows}
          emptyTitle="No attendance records"
        />
      </Card>
    </div>
  );
}
