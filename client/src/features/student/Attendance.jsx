import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download } from "lucide-react";
import BarList from "../../components/charts/BarList";
import ProgressRing from "../../components/charts/ProgressRing";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import StatCard from "../../components/ui/StatCard";
import {
  studentAttendanceBreakdown,
  studentAttendanceRows,
} from "../../mocks/studentData";
import { downloadCsv } from "../../utils/csv";

export default function Attendance() {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return studentAttendanceRows.filter(
      (row) =>
        !search ||
        row.subject.toLowerCase().includes(search) ||
        row.faculty.toLowerCase().includes(search),
    );
  }, [query]);

  const totalAttended = studentAttendanceRows.reduce(
    (sum, row) => sum + row.attended,
    0,
  );
  const totalClasses = studentAttendanceRows.reduce(
    (sum, row) => sum + row.total,
    0,
  );
  const overall = Math.round((totalAttended / totalClasses) * 100);
  const belowThreshold = studentAttendanceRows.filter(
    (row) => row.percentage < 85,
  ).length;

  const handleExport = () => {
    downloadCsv("eromza-student-attendance.csv", [
      ["Subject", "Faculty", "Attended", "Total", "Percentage"],
      ...studentAttendanceRows.map((row) => [
        row.subject,
        row.faculty,
        row.attended,
        row.total,
        `${row.percentage}%`,
      ]),
    ]);
  };

  const columns = [
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.subject}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.faculty}</p>
        </div>
      ),
    },
    {
      key: "attended",
      header: "Attended",
      render: (row) => (
        <span className="text-xs text-eromza-muted">
          {row.attended}/{row.total}
        </span>
      ),
    },
    {
      key: "percentage",
      header: "Attendance",
      render: (row) => (
        <Badge variant={row.percentage >= 85 ? "success" : "warning"}>
          {row.percentage}%
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.percentage >= 85 ? (
          <span className="inline-flex items-center gap-1 text-xs text-eromza-success">
            <CheckCircle2 size={14} />
            On track
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-eromza-warning">
            <AlertTriangle size={14} />
            Needs attention
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Attendance"
        description="Track subject-wise attendance and stay above the college threshold."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export attendance
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall attendance"
          value={`${overall}%`}
          tone="success"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Classes attended"
          value={`${totalAttended}/${totalClasses}`}
          tone="info"
          icon={CheckCircle2}
        />
        <StatCard
          label="Subjects tracked"
          value={String(studentAttendanceRows.length)}
          tone="accent"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Below 85%"
          value={String(belowThreshold)}
          tone="warning"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Subject attendance"
            description="Attendance recorded across your Semester V subjects"
          />
          <CardBody>
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by subject or faculty"
            />
          </CardBody>
          <DataTable
            columns={columns}
            rows={filteredRows}
            emptyTitle="No attendance records match your search"
          />
        </Card>

        <Card>
          <CardHeader
            title="Attendance health"
            description="Your current semester average"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={overall}
              label="Present"
              caption={`You have attended ${totalAttended} of ${totalClasses} scheduled classes.`}
            />
            <BarList
              items={studentAttendanceBreakdown}
              valueFormatter={(value) => `${value}%`}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
