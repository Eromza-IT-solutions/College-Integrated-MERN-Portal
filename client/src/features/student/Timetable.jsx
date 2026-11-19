import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Download, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import { fetchStudentOverview, fetchTimetable } from "../../services/studentApi";
import { formatDay, formatTime } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";

function loadTimetable() {
  return fetchStudentOverview().then((overview) =>
    fetchTimetable({
      programId: overview.program?._id,
      semester: overview.student?.currentSemester,
      division: overview.student?.division,
    }).then((slots) => ({ overview, slots })),
  );
}

function timeOf(slot) {
  if (slot.startTime && slot.endTime) {
    return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
  }
  return `Period ${slot.period}`;
}

export default function Timetable() {
  const [dayFilter, setDayFilter] = useState("all");
  const { data, loading, error, reload } = useApiData(loadTimetable);

  const overview = data?.overview;
  const rows = useMemo(
    () =>
      (data?.slots ?? []).map((slot) => ({
        id: slot._id,
        day: formatDay(slot.dayOfWeek),
        time: timeOf(slot),
        subject: slot.subjectId?.name || "Subject",
        code: slot.subjectId?.code || "",
        faculty: slot.teacherUserId?.fullName || "Not assigned",
        room: slot.room || "Not set",
      })),
    [data],
  );

  const days = useMemo(() => [...new Set(rows.map((row) => row.day))], [rows]);

  const filteredRows =
    dayFilter === "all" ? rows : rows.filter((row) => row.day === dayFilter);

  const handleExport = () => {
    downloadCsv("eromza-student-timetable.csv", [
      ["Day", "Time", "Subject", "Code", "Faculty", "Room"],
      ...rows.map((row) => [
        row.day,
        row.time,
        row.subject,
        row.code,
        row.faculty,
        row.room,
      ]),
    ]);
  };

  const columns = [
    {
      key: "day",
      header: "Day",
      render: (row) => (
        <span className="text-xs font-semibold text-eromza-text">
          {row.day}
        </span>
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
        <div className="min-w-0">
          <p className="truncate text-xs text-eromza-muted">{row.subject}</p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.code || "Code not set"}
          </p>
        </div>
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

  const subtitle = overview?.program
    ? `${overview.program.name} - Semester ${overview.student?.currentSemester}, Division ${overview.student?.division}`
    : "Your scheduled classes for the current week";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Timetable"
        description="Plan your week with your current class schedule and room allocations."
        actions={
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            <Download size={16} />
            Export timetable
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Loader label="Loading timetable..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load timetable"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Weekly classes"
              value={String(rows.length)}
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
              value={String(new Set(rows.map((row) => row.subject)).size)}
              tone="success"
              icon={Users}
            />
          </div>

          <Card>
            <CardHeader
              title="Weekly timetable"
              description={subtitle}
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
              getRowKey={(row) => row.id}
              emptyTitle="No classes scheduled"
              emptyDescription="Your timetable will appear here after the college publishes it."
            />
          </Card>
        </>
      )}
    </div>
  );
}
