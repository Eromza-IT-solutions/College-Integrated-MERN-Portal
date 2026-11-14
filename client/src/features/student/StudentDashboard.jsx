import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Award,
  Bell,
  CalendarClock,
  ClipboardCheck,
  Download,
  GraduationCap,
  Wallet,
} from "lucide-react";
import BarList from "../../components/charts/BarList";
import ProgressRing from "../../components/charts/ProgressRing";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  studentAttendanceBreakdown,
  studentExamSchedule,
  studentKpis,
  studentNotices,
  studentResults,
  studentTimetable,
} from "../../mocks/studentData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const KPI_ICONS = {
  attendance: ClipboardCheck,
  gpa: GraduationCap,
  fees: Wallet,
  exams: CalendarClock,
};

const timetableColumns = [
  {
    key: "time",
    header: "Time",
    render: (entry) => (
      <span className="text-xs font-semibold text-eromza-text">
        {entry.time}
      </span>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    render: (entry) => (
      <span className="text-xs text-eromza-muted">{entry.subject}</span>
    ),
  },
  {
    key: "faculty",
    header: "Faculty",
    render: (entry) => (
      <span className="text-xs text-eromza-muted">{entry.faculty}</span>
    ),
  },
  {
    key: "room",
    header: "Room",
    render: (entry) => <Badge variant="neutral">{entry.room}</Badge>,
  },
];

const resultColumns = [
  {
    key: "subject",
    header: "Subject",
    render: (result) => (
      <span className="text-xs font-semibold text-eromza-text">
        {result.subject}
      </span>
    ),
  },
  {
    key: "marks",
    header: "Marks",
    render: (result) => (
      <span className="text-xs text-eromza-muted">{result.marks}</span>
    ),
  },
  {
    key: "grade",
    header: "Grade",
    render: (result) => <Badge variant="info">{result.grade}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (result) => (
      <Badge variant={getStatusVariant(result.status)}>
        {formatStatus(result.status)}
      </Badge>
    ),
  },
];

const examColumns = [
  {
    key: "subject",
    header: "Exam",
    render: (exam) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {exam.subject}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {exam.date} · {exam.time}
        </p>
      </div>
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
];

export default function StudentDashboard() {
  const handleExport = () => {
    downloadCsv("eromza-student-summary.csv", [
      ["Metric", "Value"],
      ...studentKpis.map((kpi) => [kpi.label, kpi.value]),
      ...studentAttendanceBreakdown.map((item) => [
        `${item.label} attendance`,
        `${item.value}%`,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Student Dashboard"
        description="Track your attendance, timetable, results, fees, and upcoming examinations."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Download summary
            </Button>
            <Button as={Link} to="/student/timetable">
              <CalendarClock size={16} />
              View timetable
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {studentKpis.map((kpi) => (
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
            title="Today's timetable"
            description="Your classes for today"
            action={
              <Button
                as={Link}
                to="/student/timetable"
                variant="ghost"
                size="sm"
              >
                Full timetable
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={timetableColumns}
            rows={studentTimetable}
            emptyTitle="No classes scheduled"
          />
        </Card>

        <Card>
          <CardHeader
            title="Attendance"
            description="Overall attendance this semester"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={88}
              label="Present"
              caption="You have attended 88% of scheduled classes this semester."
            />
            <BarList
              items={studentAttendanceBreakdown}
              valueFormatter={(value) => `${value}%`}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Recent results"
            description="Latest published internal assessment results"
            action={
              <Button
                as={Link}
                to="/student/results"
                variant="ghost"
                size="sm"
              >
                All results
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={resultColumns}
            rows={studentResults}
            emptyTitle="No results published"
          />
        </Card>

        <Card>
          <CardHeader
            title="Upcoming exams"
            description="Your next scheduled examinations"
            action={
              <Button
                as={Link}
                to="/student/examinations"
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={examColumns}
            rows={studentExamSchedule}
            emptyTitle="No upcoming exams"
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Notices"
          description="Latest announcements for your programme"
          action={
            <Button
              as={Link}
              to="/student/notices"
              variant="ghost"
              size="sm"
            >
              View all
              <ArrowUpRight size={14} />
            </Button>
          }
        />
        <CardBody className="grid gap-3 md:grid-cols-3">
          {studentNotices.map((notice) => (
            <div
              key={notice.id}
              className="rounded-xl border border-eromza-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold leading-5 text-eromza-text">
                  {notice.title}
                </p>
                <Badge
                  variant={notice.priority === "High" ? "accent" : "neutral"}
                >
                  {notice.priority}
                </Badge>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-eromza-subtle">
                <Bell size={12} />
                {notice.date}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-eromza-warning">
            <Wallet size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-eromza-text">
              ₹12,500 pending fees
            </p>
            <p className="mt-1 text-xs text-eromza-muted">
              Payment due by 30 November 2026.
            </p>
          </div>
          <Button as={Link} to="/student/fees" variant="secondary" size="sm">
            Pay fees
          </Button>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-eromza-info">
            <Award size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-eromza-text">
              Current GPA 8.7
            </p>
            <p className="mt-1 text-xs text-eromza-muted">
              Semester V performance across four subjects.
            </p>
          </div>
          <Button as={Link} to="/student/results" variant="secondary" size="sm">
            View results
          </Button>
        </Card>
      </div>
    </div>
  );
}
