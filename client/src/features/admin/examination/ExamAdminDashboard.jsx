import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Download,
  Plus,
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
import DataTable from "../../../components/ui/Table";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import {
  examActivities,
  examAdminKpis,
  examResultsProgress,
  examSessions,
  examSubmissionSeries,
  examUpcomingExams,
} from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

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
        {exam.date} · {exam.time}
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
    header: "",
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
        {session.startDate} – {session.endDate}
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
    header: "",
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

export default function ExamAdminDashboard() {
  const handleExport = () => {
    downloadCsv("eromza-examination-report.csv", [
      ["Metric", "Value"],
      ...examAdminKpis.map((kpi) => [kpi.label, kpi.value]),
      ["Latest monthly marks submitted", examSubmissionSeries.values.at(-1)],
      ...examResultsProgress.map((item) => [item.label, item.value]),
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
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export report
            </Button>
            <Button as={Link} to="/exam-admin/sessions">
              <Plus size={16} />
              Create session
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {examAdminKpis.map((kpi) => (
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
            title="Marks submitted"
            description="Monthly marks entry across the last six months"
            action={<Badge variant="success">+9.3%</Badge>}
          />
          <CardBody>
            <TrendChart
              labels={examSubmissionSeries.labels}
              values={examSubmissionSeries.values}
              color="#19845b"
              ariaLabel="Marks submitted over the last six months"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Hall ticket readiness"
            description="Issued for the active examination session"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={88}
              label="Issued"
              caption="1,102 of 1,248 registered students have received hall tickets."
            />
            <div className="rounded-lg bg-eromza-bg p-3 text-xs leading-5 text-eromza-muted">
              146 students still need eligibility clearance before hall tickets
              can be generated.
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Upcoming exams"
            description="Next scheduled papers across active sessions"
            action={
              <Button
                as={Link}
                to="/exam-admin/timetables"
                variant="ghost"
                size="sm"
              >
                View timetable
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={examColumns}
            rows={examUpcomingExams}
            emptyTitle="No upcoming exams"
          />
        </Card>

        <Card>
          <CardHeader
            title="Results progress"
            description="Marks and result processing status"
            action={
              <Button
                as={Link}
                to="/exam-admin/marks"
                variant="ghost"
                size="sm"
              >
                Open marks
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <CardBody>
            <BarList
              items={examResultsProgress}
              valueFormatter={(value) => `${value.toLocaleString("en-IN")} records`}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Exam sessions"
          description="Current and upcoming examination cycles"
          action={
            <Button
              as={Link}
              to="/exam-admin/sessions"
              variant="ghost"
              size="sm"
            >
              View all
              <ArrowUpRight size={14} />
            </Button>
          }
        />
        <DataTable
          columns={sessionColumns}
          rows={examSessions}
          emptyTitle="No exam sessions"
        />
      </Card>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Latest examination administration actions"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody>
          <ActivityFeed items={examActivities} icons={ACTIVITY_ICONS} />
        </CardBody>
      </Card>
    </div>
  );
}
