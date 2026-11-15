import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Download,
  Ticket,
  Users,
} from "lucide-react";
import ActivityFeed from "../../../components/common/ActivityFeed";
import BarList from "../../../components/charts/BarList";
import ProgressRing from "../../../components/charts/ProgressRing";
import TrendChart from "../../../components/charts/TrendChart";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import ErrorState from "../../../components/ui/ErrorState";
import Loader from "../../../components/ui/Loader";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import DataTable from "../../../components/ui/Table";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";
import DemoModeBanner from "./components/DemoModeBanner";
import useExamAdminDashboard from "./hooks/useExamAdminDashboard";
import { DATA_SOURCE } from "./services/dataSource";
import { buildDashboardViewModel, formatCount } from "./utils/dashboardMetrics";

const MIDDLE_DOT = "\u00b7";
const EN_DASH = "\u2013";

const KPI_ICONS = {
  sessions: CalendarDays,
  students: Users,
  tickets: Ticket,
  results: Award,
};

const ACTIVITY_ICONS = {
  ticket: Ticket,
  calendar: CalendarDays,
  marks: ClipboardCheck,
  results: Award,
  subject: BookOpen,
};

const examColumns = [
  {
    key: "exam",
    header: "Exam",
    render: (exam) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {exam.exam}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{exam.id}</p>
      </div>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    render: (exam) => (
      <span className="text-xs text-eromza-muted">{exam.subject}</span>
    ),
  },
  {
    key: "date",
    header: "Date",
    render: (exam) => (
      <span className="text-xs text-eromza-muted">
        {exam.date} {MIDDLE_DOT} {exam.time}
      </span>
    ),
  },
  {
    key: "room",
    header: "Room",
    render: (exam) => <Badge variant="neutral">{exam.room}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (exam) => (
      <Badge variant={getStatusVariant(exam.status)}>
        {formatStatus(exam.status)}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "Action",
    className: "text-right",
    cellClassName: "text-right",
    render: () => (
      <Button
        as={Link}
        to="/exam-admin/timetables"
        variant="ghost"
        size="sm"
        className="text-eromza-accent hover:bg-rose-50"
      >
        Open
      </Button>
    ),
  },
];

const sessionColumns = [
  {
    key: "name",
    header: "Session",
    render: (session) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {session.name}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{session.term}</p>
      </div>
    ),
  },
  {
    key: "dates",
    header: "Dates",
    render: (session) => (
      <span className="text-xs text-eromza-muted">
        {session.startDate} {EN_DASH} {session.endDate}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (session) => (
      <Badge variant={getStatusVariant(session.status)}>
        {formatStatus(session.status)}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "Action",
    className: "text-right",
    cellClassName: "text-right",
    render: () => (
      <Button
        as={Link}
        to="/exam-admin/sessions"
        variant="ghost"
        size="sm"
        className="text-eromza-accent hover:bg-rose-50"
      >
        Manage
      </Button>
    ),
  },
];

function ViewAllLink({ to, children }) {
  return (
    <Button as={Link} to={to} variant="ghost" size="sm">
      {children}
      <ArrowUpRight size={14} />
    </Button>
  );
}

function DashboardContent({ data, view, isDemo }) {
  const { readiness } = view;

  return (
    <>
      <DemoModeBanner source={isDemo ? DATA_SOURCE.DEMO : DATA_SOURCE.API} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {view.kpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            tone={kpi.tone}
            icon={KPI_ICONS[kpi.icon]}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Marks submitted"
            description="Monthly marks entry across the last six months"
            action={
              view.marksChange ? (
                <Badge variant="neutral">
                  {view.marksChange} vs previous month
                </Badge>
              ) : null
            }
          />
          <CardBody>
            {data.submissionSeries?.values?.length ? (
              <TrendChart
                labels={data.submissionSeries.labels}
                values={data.submissionSeries.values}
                color="#19845b"
                ariaLabel="Marks submitted per month"
              />
            ) : (
              <EmptyState
                title="No marks submitted yet"
                description="Monthly totals will appear here once marks are entered."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Hall ticket readiness"
            description="Registered students who have a hall ticket issued"
          />
          <CardBody className="space-y-6">
            {readiness.percent === null ? (
              <EmptyState
                title="Figures unavailable"
                description="Registered student numbers are needed to work out hall ticket coverage."
              />
            ) : (
              <>
                <ProgressRing
                  value={readiness.percent}
                  label="Issued"
                  caption={`${formatCount(readiness.issued)} of ${formatCount(readiness.registered)} registered students have a hall ticket issued.`}
                />
                <div className="rounded-lg bg-eromza-bg p-3 text-xs leading-5 text-eromza-muted">
                  {readiness.notYetIssued > 0
                    ? `${formatCount(readiness.notYetIssued)} registered students do not have a hall ticket issued yet.`
                    : "Every registered student has a hall ticket issued."}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Upcoming exams"
            description="Next scheduled papers across active sessions"
            action={
              <ViewAllLink to="/exam-admin/timetables">
                View timetable
              </ViewAllLink>
            }
          />
          <DataTable
            columns={examColumns}
            rows={data.upcomingExams}
            emptyTitle="No upcoming exams"
            emptyDescription="Scheduled papers will appear here once a timetable is created."
          />
        </Card>

        <Card>
          <CardHeader
            title="Results progress"
            description="Marks and result processing status"
            action={<ViewAllLink to="/exam-admin/marks">Open marks</ViewAllLink>}
          />
          <CardBody>
            {data.resultsProgress?.length ? (
              <BarList
                items={data.resultsProgress}
                valueFormatter={(value) => `${formatCount(value)} records`}
              />
            ) : (
              <EmptyState
                title="No results data"
                description="Result processing figures will appear here."
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Exam sessions"
          description="Current and upcoming examination cycles"
          action={<ViewAllLink to="/exam-admin/sessions">View all</ViewAllLink>}
        />
        <DataTable
          columns={sessionColumns}
          rows={data.sessions}
          emptyTitle="No exam sessions"
          emptyDescription="Create a session to start planning an examination cycle."
        />
      </Card>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Latest examination administration actions"
          action={isDemo ? <Badge variant="warning">Demo data</Badge> : null}
        />
        <CardBody>
          {data.activities?.length ? (
            <ActivityFeed items={data.activities} icons={ACTIVITY_ICONS} />
          ) : (
            <EmptyState
              title="No recent activity"
              description="Examination actions will be listed here."
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}

export default function ExamAdminDashboard() {
  const { status, source, data, error, reload } = useExamAdminDashboard();
  const view = useMemo(() => (data ? buildDashboardViewModel(data) : null), [data]);
  const isDemo = source === DATA_SOURCE.DEMO;

  const handleExport = () => {
    if (!view) return;

    const { readiness } = view;
    downloadCsv("eromza-examination-report.csv", [
      ["Metric", "Value"],
      [
        "Data source",
        isDemo ? "Demo data (sample values, not real college records)" : "Server",
      ],
      ["Exported on", new Date().toISOString().slice(0, 10)],
      ...view.kpis.map((kpi) => [kpi.label, kpi.value]),
      [
        "Hall ticket coverage",
        readiness.percent === null ? "Not available" : `${readiness.percent}%`,
      ],
      ["Latest monthly marks submitted", view.latestMarks ?? "Not available"],
      ...(data.resultsProgress ?? []).map((item) => [item.label, item.value]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Examination administration"
        title="Exam Admin Dashboard"
        description="Plan exam sessions, publish timetables, issue hall tickets, and keep results moving."
        actions={
          <>
            {status === "success" ? (
              <Button variant="secondary" onClick={handleExport}>
                <Download size={16} />
                Export report
              </Button>
            ) : null}
            <Button as={Link} to="/exam-admin/sessions">
              <CalendarDays size={16} />
              Manage sessions
            </Button>
          </>
        }
      />

      {status === "loading" ? (
        <Loader label="Loading examination dashboard..." />
      ) : null}

      {status === "error" ? (
        <Card>
          <ErrorState
            title={error.title}
            description={error.description}
            onRetry={error.canRetry ? reload : undefined}
          />
        </Card>
      ) : null}

      {status === "success" ? (
        <DashboardContent data={data} view={view} isDemo={isDemo} />
      ) : null}
    </div>
  );
}
