import { Award, BookOpen, Download, TrendingUp } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import { fetchResults } from "../../services/studentApi";
import { formatPercent } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

function numberOr(value, fallback) {
  return value == null || Number.isNaN(Number(value)) ? fallback : value;
}

export default function Results() {
  const { data, loading, error, reload } = useApiData(fetchResults);
  const results = Array.isArray(data) ? data : [];
  const latest = results[0] ?? null;
  const lines = latest?.lines ?? [];

  const handleExport = () => {
    downloadCsv("eromza-student-results.csv", [
      ["Subject", "Code", "Marks", "Grade", "Status"],
      ...lines.map((line) => [
        line.name,
        line.code,
        `${line.total ?? ""}/${line.max ?? ""}`,
        line.grade ?? "",
        line.status ?? "",
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
            {row.name || "Subject"}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.code || "Code not set"}
          </p>
        </div>
      ),
    },
    {
      key: "marks",
      header: "Marks",
      render: (row) => (
        <span className="text-xs text-eromza-muted">
          {row.total ?? "Not set"} / {row.max ?? "Not set"}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Grade",
      render: (row) => (
        <Badge variant={row.grade === "F" ? "error" : "info"}>
          {row.grade || "Not set"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status || "pending")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Results"
        description="Review published examination results and semester performance."
        actions={
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={lines.length === 0}
          >
            <Download size={16} />
            Export results
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Loader label="Loading results..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load results"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="SGPA"
              value={
                latest?.sgpa == null ? "Not set" : Number(latest.sgpa).toFixed(2)
              }
              tone="success"
              icon={Award}
            />
            <StatCard
              label="Credits earned"
              value={`${numberOr(latest?.creditsEarned, 0)} / ${numberOr(latest?.creditsTotal, 0)}`}
              tone="info"
              icon={BookOpen}
            />
            <StatCard
              label="Percentage"
              value={formatPercent(latest?.percentage)}
              tone="accent"
              icon={TrendingUp}
            />
            <StatCard
              label="Outcome"
              value={latest?.outcome ? formatStatus(latest.outcome) : "Not set"}
              tone={latest?.outcome === "fail" ? "warning" : "success"}
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader
              title={
                latest?.semester
                  ? `Semester ${latest.semester} results`
                  : "Latest results"
              }
              description="Published examination results"
              action={
                latest ? (
                  <Badge variant={getStatusVariant(latest.outcome)}>
                    {formatStatus(latest.outcome || "published")}
                  </Badge>
                ) : null
              }
            />
            <DataTable
              columns={columns}
              rows={lines}
              getRowKey={(row) => String(row.subjectId)}
              emptyTitle="No results published"
              emptyDescription="Published results will appear here after the examination office releases them."
            />
          </Card>

          <Card>
            <CardHeader
              title="Performance summary"
              description="Summary of your latest published result"
            />
            <CardBody className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Subjects
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {lines.length} completed
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Failed subjects
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {numberOr(latest?.failedSubjects, 0)}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Final grade
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {latest?.finalGrade || "Not set"}
                </p>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
