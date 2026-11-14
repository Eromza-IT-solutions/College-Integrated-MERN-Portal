import { Download, FileBarChart, FileText, GraduationCap, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { hodReports } from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const reportColumns = [
  {
    key: "name",
    header: "Report",
    render: (report) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {report.name}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{report.id}</p>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (report) => <Badge variant="neutral">{report.type}</Badge>,
  },
  {
    key: "period",
    header: "Period",
    render: (report) => (
      <span className="text-xs text-eromza-muted">{report.period}</span>
    ),
  },
  {
    key: "generated",
    header: "Generated",
    render: (report) => (
      <span className="text-xs text-eromza-muted">{report.generated}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (report) => (
      <Badge variant={getStatusVariant(report.status)}>
        {formatStatus(report.status)}
      </Badge>
    ),
  },
];

export default function DepartmentReports() {
  const pending = hodReports.filter(
    (report) => report.status === "processing",
  ).length;

  const downloadReport = (report) => {
    downloadCsv(`${report.id.toLowerCase()}-${report.type.toLowerCase()}.csv`, [
      ["Report", report.name],
      ["Report ID", report.id],
      ["Type", report.type],
      ["Period", report.period],
      ["Generated", report.generated],
      ["Status", report.status],
    ]);
  };

  const handleExport = () => {
    downloadCsv("eromza-department-reports.csv", [
      ["ID", "Report", "Type", "Period", "Generated", "Status"],
      ...hodReports.map((report) => [
        report.id,
        report.name,
        report.type,
        report.period,
        report.generated,
        report.status,
      ]),
    ]);
  };

  const columns = [
    ...reportColumns,
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (report) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadReport(report)}
        >
          <Download size={14} />
          Download
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department reporting"
        title="Department Reports"
        description="Generate and review attendance, faculty, student, and examination reports."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export all
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reports available"
          value={hodReports.length.toString()}
          tone="info"
          icon={FileBarChart}
        />
        <StatCard
          label="Attendance reports"
          value={hodReports
            .filter((report) => report.type === "Attendance")
            .length.toString()}
          tone="success"
          icon={FileText}
        />
        <StatCard
          label="Faculty reports"
          value={hodReports
            .filter((report) => report.type === "Faculty")
            .length.toString()}
          tone="accent"
          icon={Users}
        />
        <StatCard
          label="Processing"
          value={pending.toString()}
          tone="warning"
          icon={GraduationCap}
        />
      </div>

      <Card>
        <CardHeader
          title="Department reports"
          description="Reports generated for the current department cycle"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <DataTable
          columns={columns}
          rows={hodReports}
          emptyTitle="No department reports"
        />
      </Card>
    </div>
  );
}
