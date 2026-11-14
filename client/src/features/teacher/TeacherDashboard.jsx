import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Users,
} from "lucide-react";
import ActivityFeed from "../../components/common/ActivityFeed";
import BarList from "../../components/charts/BarList";
import ProgressRing from "../../components/charts/ProgressRing";
import TrendChart from "../../components/charts/TrendChart";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  teacherAttendanceSeries,
  teacherClassPerformance,
  teacherKpis,
  teacherPendingTasks,
  teacherTimetable,
  teacherUpdates,
} from "../../mocks/teacherData";
import { formatStatus, getStatusVariant } from "../../utils/status";

const KPI_ICONS = {
  classes: BookOpen,
  students: Users,
  attendance: ClipboardCheck,
  marks: ClipboardList,
};

const ACTIVITY_ICONS = {
  attendance: ClipboardCheck,
  marks: ClipboardList,
  calendar: CalendarClock,
  notice: Bell,
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
    key: "className",
    header: "Class",
    render: (entry) => (
      <span className="text-xs text-eromza-muted">{entry.className}</span>
    ),
  },
  {
    key: "room",
    header: "Room",
    render: (entry) => <Badge variant="neutral">{entry.room}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (entry) => (
      <Badge variant={getStatusVariant(entry.status)}>
        {formatStatus(entry.status)}
      </Badge>
    ),
  },
];

const taskColumns = [
  {
    key: "task",
    header: "Task",
    render: (task) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {task.task}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {task.className}
        </p>
      </div>
    ),
  },
  {
    key: "due",
    header: "Due",
    render: (task) => (
      <span className="text-xs text-eromza-muted">{task.due}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (task) => (
      <Badge variant={getStatusVariant(task.status)}>
        {formatStatus(task.status)}
      </Badge>
    ),
  },
];

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Teacher Dashboard"
        description="Stay on top of today's classes, attendance, marks entry, and student progress."
        actions={
          <>
            <Button as={Link} to="/teacher/attendance" variant="secondary">
              <ClipboardCheck size={16} />
              Take attendance
            </Button>
            <Button as={Link} to="/teacher/marks">
              <ClipboardList size={16} />
              Enter marks
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {teacherKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeLabel={kpi.id === "classes" ? "" : "vs last week"}
            tone={kpi.tone}
            icon={KPI_ICONS[kpi.icon]}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Today's timetable"
            description="Your scheduled classes for today"
            action={
              <Button
                as={Link}
                to="/teacher/timetable"
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
            rows={teacherTimetable}
            emptyTitle="No classes scheduled"
          />
        </Card>

        <Card>
          <CardHeader
            title="Weekly attendance"
            description="Attendance marked across your classes"
            action={<Badge variant="success">92% today</Badge>}
          />
          <CardBody className="space-y-6">
            <TrendChart
              labels={teacherAttendanceSeries.labels}
              values={teacherAttendanceSeries.values}
              color="#19845b"
              ariaLabel="Weekly attendance across your classes"
            />
            <ProgressRing
              value={92}
              label="Present"
              caption="171 of 186 students marked present today."
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Pending tasks"
            description="Attendance and marks that need your attention"
            action={
              <Button
                as={Link}
                to="/teacher/classes"
                variant="ghost"
                size="sm"
              >
                My classes
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={taskColumns}
            rows={teacherPendingTasks}
            emptyTitle="No pending tasks"
          />
        </Card>

        <Card>
          <CardHeader
            title="Class performance"
            description="Average attendance by class"
          />
          <CardBody>
            <BarList
              items={teacherClassPerformance}
              valueFormatter={(value) => `${value}%`}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent updates"
          description="Latest activity across your teaching workspace"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody>
          <ActivityFeed items={teacherUpdates} icons={ACTIVITY_ICONS} />
        </CardBody>
      </Card>
    </div>
  );
}
