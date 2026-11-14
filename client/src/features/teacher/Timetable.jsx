import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Download, MapPin } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { teacherWeeklyTimetable } from "../../mocks/teacherData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const columns = [
  {
    key: "day",
    header: "Day",
    render: (row) => (
      <span className="text-xs font-semibold text-eromza-text">{row.day}</span>
    ),
  },
  {
    key: "time",
    header: "Time",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.time}</span>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.subject}</span>
    ),
  },
  {
    key: "className",
    header: "Class",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.className}</span>
    ),
  },
  {
    key: "room",
    header: "Room",
    render: (row) => <Badge variant="neutral">{row.room}</Badge>,
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

export default function Timetable() {
  const [dayFilter, setDayFilter] = useState("all");

  const days = useMemo(
    () => [...new Set(teacherWeeklyTimetable.map((row) => row.day))],
    [],
  );

  const filteredRows = useMemo(
    () =>
      dayFilter === "all"
        ? teacherWeeklyTimetable
        : teacherWeeklyTimetable.filter((row) => row.day === dayFilter),
    [dayFilter],
  );

  const handleExport = () => {
    downloadCsv("eromza-teacher-timetable.csv", [
      ["Day", "Time", "Subject", "Class", "Room", "Status"],
      ...teacherWeeklyTimetable.map((row) => [
        row.day,
        row.time,
        row.subject,
        row.className,
        row.room,
        row.status,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Timetable"
        description="Review your weekly teaching schedule, rooms, and class sessions."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export timetable
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Weekly sessions"
          value={String(teacherWeeklyTimetable.length)}
          tone="info"
          icon={CalendarDays}
        />
        <StatCard
          label="Teaching days"
          value={String(days.length)}
          tone="accent"
          icon={CalendarClock}
        />
        <StatCard
          label="Subjects"
          value={String(
            new Set(teacherWeeklyTimetable.map((row) => row.subject)).size,
          )}
          tone="success"
          icon={CalendarClock}
        />
        <StatCard
          label="Rooms in use"
          value={String(
            new Set(teacherWeeklyTimetable.map((row) => row.room)).size,
          )}
          tone="warning"
          icon={MapPin}
        />
      </div>

      <Card>
        <CardHeader
          title="Weekly timetable"
          description="Your scheduled teaching sessions for the week"
          action={
            <Select
              aria-label="Filter by day"
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="min-w-[160px]"
            >
              <option value="all">All days</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
          }
        />
        <DataTable
          columns={columns}
          rows={filteredRows}
          emptyTitle="No sessions scheduled"
        />
      </Card>
    </div>
  );
}
