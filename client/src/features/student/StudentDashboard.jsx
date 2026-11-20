import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Award,
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
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import {
  fetchAttendanceSummary,
  fetchAvailableExams,
  fetchResults,
  fetchStudentOverview,
  fetchTimetable,
} from "../../services/studentApi";
import {
  formatDate,
  formatDay,
  formatPaise,
  formatTime,
} from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const COLORS = ["#19845b", "#3279be", "#d88a2d", "#a9233d", "#7c5cbf"];

const KPI_ICONS = {
  attendance: ClipboardCheck,
  gpa: GraduationCap,
  fees: Wallet,
  exams: CalendarClock,
};

function loadDashboard() {
  return fetchStudentOverview().then((overview) =>
    Promise.all([
      fetchAttendanceSummary(),
      fetchTimetable({
        programId: overview.program?._id,
        semester: overview.student?.currentSemester,
        division: overview.student?.division,
      }),
      fetchResults(),
      fetchAvailableExams(),
    ]).then(([attendance, timetable, results, available]) => ({
      overview,
      attendance,
      timetable,
      results,
      available,
    })),
  );
}

function timeOf(slot) {
  if (slot.startTime && slot.endTime) {
    return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
  }
  return `Period ${slot.period}`;
}

export default function StudentDashboard() {
  const { data, loading, error, reload } = useApiData(loadDashboard);

  const attendanceRows = (data?.attendance?.subjects ?? []).map((row, index) => ({
    id: String(row.subjectId),
    subject: row.subject?.name || "Subject",
    attended: row.present ?? 0,
    total: row.held ?? 0,
    percentage: Number(row.percentage) || 0,
    color: COLORS[index % COLORS.length],
  }));
  const totalAttended = attendanceRows.reduce(
    (sum, row) => sum + row.attended,
    0,
  );
  const totalClasses = attendanceRows.reduce((sum, row) => sum + row.total, 0);
  const overallAttendance = totalClasses
    ? Math.round((totalAttended / totalClasses) * 100)
    : 0;
  const breakdown = attendanceRows.map((row) => ({
    label: row.subject,
    value: Math.round(row.percentage),
    color: row.color,
  }));

  const latestResult = (data?.results ?? [])[0] ?? null;
  const resultLines = latestResult?.lines ?? [];

  const timetableRows = (data?.timetable ?? []).map((slot) => ({
    id: slot._id,
    dayOfWeek: slot.dayOfWeek,
    time: timeOf(slot),
    subject: slot.subjectId?.name || "Subject",
    faculty: slot.teacherUserId?.fullName || "Not assigned",
    room: slot.room || "Not set",
  }));
  const jsDay = new Date().getDay();
  const today = jsDay === 0 ? 7 : jsDay;
  const todayRows = timetableRows.filter((row) => row.dayOfWeek === today);

  const subjectOf = new Map(
    (data?.overview?.enrollments ?? []).map((enrollment) => [
      String(enrollment.subjectId?._id),
      enrollment.subjectId,
    ]),
  );
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const scheduleRows = (data?.available ?? [])
    .flatMap((exam) =>
      (exam.schedule ?? []).map((item) => {
        const subject = subjectOf.get(String(item.subjectId));
        return {
          id: `${exam._id}-${item.subjectId}`,
          subject: subject?.name || "Subject",
          dateValue: item.date,
          date: formatDate(item.date),
          time: `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`,
          room: item.room || "Not set",
          status: exam.status,
        };
      }),
    )
    .filter((row) => new Date(row.dateValue) >= startOfToday)
    .sort((a, b) => new Date(a.dateValue) - new Date(b.dateValue));

  const pendingForms = (data?.available ?? []).filter(
    (exam) => exam.form?.status === "pendingPayment",
  );
  const pendingExamFees = pendingForms.reduce(
    (sum, exam) => sum + (exam.form?.feeAmountPaise ?? 0),
    0,
  );

  const kpis = [
    {
      id: "attendance",
      label: "Overall Attendance",
      value: `${overallAttendance}%`,
      change: `${attendanceRows.filter((row) => row.percentage < 85).length} below 85%`,
      tone: "success",
      icon: "attendance",
    },
    {
      id: "gpa",
      label: "Current SGPA",
      value:
        latestResult?.sgpa == null
          ? "Not set"
          : Number(latestResult.sgpa).toFixed(2),
      change: latestResult?.outcome
        ? formatStatus(latestResult.outcome)
        : "No result yet",
      tone: "info",
      icon: "gpa",
    },
    {
      id: "fees",
      label: "Exam Fees Due",
      value: formatPaise(pendingExamFees, "0"),
      change: pendingForms.length
        ? `${pendingForms.length} form awaiting payment`
        : "No payment due",
      tone: "warning",
      icon: "fees",
    },
    {
      id: "exams",
      label: "Upcoming Exams",
      value: String(scheduleRows.length),
      change: scheduleRows[0]
        ? `Next ${formatDate(scheduleRows[0].dateValue)}`
        : "No exams scheduled",
      tone: "accent",
      icon: "exams",
    },
  ];

  const handleExport = () => {
    downloadCsv("eromza-student-summary.csv", [
      ["Metric", "Value"],
      ...kpis.map((kpi) => [kpi.label, kpi.value]),
      ...breakdown.map((item) => [
        `${item.label} attendance`,
        `${item.value}%`,
      ]),
    ]);
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
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {result.name || "Subject"}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {result.code || "Code not set"}
          </p>
        </div>
      ),
    },
    {
      key: "marks",
      header: "Marks",
      render: (result) => (
        <span className="text-xs text-eromza-muted">
          {result.total ?? "Not set"} / {result.max ?? "Not set"}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Grade",
      render: (result) => <Badge variant="info">{result.grade || "Not set"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (result) => (
        <Badge variant={getStatusVariant(result.status)}>
          {formatStatus(result.status || "pending")}
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
            {exam.date} - {exam.time}
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

      {loading ? (
        <Card>
          <Loader label="Loading dashboard..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load dashboard"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <StatCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                change={kpi.change}
                changeLabel="current semester"
                tone={kpi.tone}
                icon={KPI_ICONS[kpi.icon]}
              />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader
                title="Today's timetable"
                description={`Your classes for ${formatDay(today)}`}
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
                rows={todayRows}
                getRowKey={(row) => row.id}
                emptyTitle="No classes scheduled"
                emptyDescription="You have no classes on the timetable for today."
              />
            </Card>

            <Card>
              <CardHeader
                title="Attendance"
                description="Overall attendance this semester"
              />
              <CardBody className="space-y-6">
                <ProgressRing
                  value={overallAttendance}
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader
                title="Recent results"
                description="Latest published examination result"
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
                rows={resultLines.slice(0, 4)}
                getRowKey={(row) => String(row.subjectId)}
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
                rows={scheduleRows.slice(0, 4)}
                getRowKey={(row) => row.id}
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
            <EmptyState
              title="No notices published"
              description="Announcements for your programme will appear here."
            />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-eromza-warning">
                <Wallet size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-eromza-text">
                  {formatPaise(pendingExamFees, "0")} exam fees pending
                </p>
                <p className="mt-1 text-xs text-eromza-muted">
                  {pendingForms.length
                    ? "Complete payment to submit your exam form."
                    : "No exam form payment is pending."}
                </p>
              </div>
              <Button as={Link} to="/student/fees" variant="secondary" size="sm">
                View fees
              </Button>
            </Card>

            <Card className="flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-eromza-info">
                <Award size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-eromza-text">
                  Current SGPA{" "}
                  {latestResult?.sgpa == null
                    ? "not set"
                    : Number(latestResult.sgpa).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-eromza-muted">
                  {latestResult
                    ? `${resultLines.length} subjects in your latest published result.`
                    : "Your result will appear here once published."}
                </p>
              </div>
              <Button as={Link} to="/student/results" variant="secondary" size="sm">
                View results
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
