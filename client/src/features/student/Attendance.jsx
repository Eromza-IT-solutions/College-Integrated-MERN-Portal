import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
} from "lucide-react";
import BarList from "../../components/charts/BarList";
import ProgressRing from "../../components/charts/ProgressRing";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import { fetchAttendanceSummary } from "../../services/studentApi";
import { formatPercent } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";

const COLORS = ["#19845b", "#3279be", "#d88a2d", "#a9233d", "#7c5cbf"];

export default function Attendance() {
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useApiData(fetchAttendanceSummary);

  const rows = useMemo(
    () =>
      (data?.subjects ?? []).map((row) => ({
        id: String(row.subjectId),
        subject: row.subject?.name || "Subject",
        code: row.subject?.code || "",
        attended: row.present ?? 0,
        total: row.held ?? 0,
        leave: row.leave ?? 0,
        percentage: Number(row.percentage) || 0,
      })),
    [data],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        !search ||
        row.subject.toLowerCase().includes(search) ||
        row.code.toLowerCase().includes(search),
    );
  }, [rows, query]);

  const totalAttended = rows.reduce((sum, row) => sum + row.attended, 0);
  const totalClasses = rows.reduce((sum, row) => sum + row.total, 0);
  const overall = totalClasses
    ? Math.round((totalAttended / totalClasses) * 100)
    : 0;
  const belowThreshold = rows.filter((row) => row.percentage < 85).length;
  const breakdown = rows.map((row, index) => ({
    label: row.subject,
    value: Math.round(row.percentage),
    color: COLORS[index % COLORS.length],
  }));

  const handleExport = () => {
    downloadCsv("eromza-student-attendance.csv", [
      ["Subject", "Code", "Attended", "Total", "Percentage"],
      ...rows.map((row) => [
        row.subject,
        row.code,
        row.attended,
        row.total,
        `${Math.round(row.percentage)}%`,
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
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.code || "Code not set"}
          </p>
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
          {formatPercent(row.percentage)}
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
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            <Download size={16} />
            Export attendance
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Loader label="Loading attendance..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load attendance"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
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
              value={String(rows.length)}
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
                description="Attendance recorded across your enrolled subjects"
              />
              <CardBody>
                <SearchInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by subject or code"
                />
              </CardBody>
              <DataTable
                columns={columns}
                rows={filteredRows}
                getRowKey={(row) => row.id}
                emptyTitle="No attendance records match your search"
              />
            </Card>

            <Card>
              <CardHeader
                title="Attendance health"
                description="Your current overall average"
              />
              <CardBody className="space-y-6">
                <ProgressRing
                  value={overall}
                  label="Present"
                  caption={`You have attended ${totalAttended} of ${totalClasses} scheduled classes.`}
                />
                <BarList
                  items={breakdown}
                  valueFormatter={(value) => `${value}%`}
                />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
