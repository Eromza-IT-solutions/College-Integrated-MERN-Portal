import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Download, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { studentWeeklyTimetable } from "../../mocks/studentData";
import { downloadCsv } from "../../utils/csv";

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
    key: "faculty",
    header: "Faculty",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.faculty}</span>
    ),
  },
  {
    key: "room",
    header: "Room",
    render: (row) => <Badge variant="neutral">{row.room}</Badge>,
  },
];

export default function Timetable() {
  const [dayFilter, setDayFilter] = useState("all");

  const days = useMemo(
    () => [...new Set(studentWeeklyTimetable.map((row) => row.day))],
    [],
  );

  const filteredRows =
    dayFilter === "all"
      ? studentWeeklyTimetable
      : studentWeeklyTimetable.filter((row) => row.day === dayFilter);

  const handleExport = () => {
    downloadCsv("eromza-student-timetable.csv", [
      ["Day", "Time", "Subject", "Faculty", "Room"],
      ...studentWeeklyTimetable.map((row) => [
        row.day,
        row.time,
        row.subject,
        row.faculty,
        row.room,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Timetable"
        description="Plan your week with your current class schedule and room allocations."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export timetable
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Weekly classes"
          value={String(studentWeeklyTimetable.length)}
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
            new Set(studentWeeklyTimetable.map((row) => row.subject)).size,
          )}
          tone="success"
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader
          title="Weekly timetable"
          description="Your scheduled classes for the current week"
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
          emptyTitle="No classes scheduled"
        />
      </Card>
    </div>
  );
}
