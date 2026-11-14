import { Award, BookOpen, Download, TrendingUp } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { studentResults, studentSemesterSummary } from "../../mocks/studentData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const columns = [
  {
    key: "subject",
    header: "Subject",
    render: (row) => (
      <span className="text-xs font-semibold text-eromza-text">
        {row.subject}
      </span>
    ),
  },
  {
    key: "marks",
    header: "Marks",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.marks}</span>
    ),
  },
  {
    key: "grade",
    header: "Grade",
    render: (row) => <Badge variant="info">{row.grade}</Badge>,
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

export default function Results() {
  const handleExport = () => {
    downloadCsv("eromza-student-results.csv", [
      ["Subject", "Marks", "Grade", "Status"],
      ...studentResults.map((row) => [
        row.subject,
        row.marks,
        row.grade,
        row.status,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Results"
        description="Review published internal assessment results and semester performance."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export results
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current GPA"
          value={studentSemesterSummary.gpa}
          tone="success"
          icon={Award}
        />
        <StatCard
          label="Credits earned"
          value={studentSemesterSummary.credits}
          tone="info"
          icon={BookOpen}
        />
        <StatCard
          label="Class rank"
          value={`#${studentSemesterSummary.rank}`}
          tone="accent"
          icon={TrendingUp}
        />
        <StatCard
          label="Attendance"
          value={studentSemesterSummary.attendance}
          tone="warning"
          icon={TrendingUp}
        />
      </div>

      <Card>
        <CardHeader
          title="Semester V results"
          description="Published internal assessment results"
          action={
            <Badge variant={getStatusVariant(studentSemesterSummary.status)}>
              {formatStatus(studentSemesterSummary.status)}
            </Badge>
          }
        />
        <DataTable
          columns={columns}
          rows={studentResults}
          emptyTitle="No results published"
        />
      </Card>

      <Card>
        <CardHeader
          title="Performance summary"
          description="How your current semester is shaping up"
        />
        <CardBody className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-eromza-bg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
              Subjects
            </p>
            <p className="mt-1 text-sm font-semibold text-eromza-text">
              {studentResults.length} completed
            </p>
          </div>
          <div className="rounded-xl bg-eromza-bg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
              Highest grade
            </p>
            <p className="mt-1 text-sm font-semibold text-eromza-text">A+</p>
          </div>
          <div className="rounded-xl bg-eromza-bg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
              Result status
            </p>
            <p className="mt-1 text-sm font-semibold text-eromza-text">
              {formatStatus(studentSemesterSummary.status)}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
