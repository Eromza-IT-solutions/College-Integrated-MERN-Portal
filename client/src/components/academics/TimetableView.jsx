import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Download, Users } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import DataTable from "../ui/Table";
import PageHeader from "../ui/PageHeader";
import Select from "../ui/Select";
import StatCard from "../ui/StatCard";
import { downloadCsv } from "../../utils/csv";
import { DAY_NAMES, listTimetable } from "../../services/academicsService";

// Shared by the student and teacher Timetable pages. The server decides which slots each role may see.
export default function TimetableView({ eyebrow, description, showClass = false }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dayFilter, setDayFilter] = useState("all");

  useEffect(() => {
    listTimetable()
      .then(setSlots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => slots.map((s) => ({
      id: s._id,
      dayOfWeek: s.dayOfWeek,
      day: DAY_NAMES[s.dayOfWeek] || "-",
      period: s.period,
      time: `${s.startTime || "-"} - ${s.endTime || "-"}`,
      subject: s.subjectId ? `${s.subjectId.name} (${s.subjectId.code})` : "-",
      faculty: s.teacherUserId?.fullName || "-",
      room: s.room || "-",
      klass: `Sem ${s.semester} · Div ${s.division}`,
    })),
    [slots],
  );
  const days = useMemo(() => [...new Set(rows.map((r) => r.dayOfWeek))].sort(), [rows]);
  const visible = dayFilter === "all" ? rows : rows.filter((r) => String(r.dayOfWeek) === dayFilter);

  const columns = [
    { key: "day", header: "Day", render: (r) => <span className="text-xs font-semibold text-eromza-text">{r.day}</span> },
    { key: "time", header: "Time", render: (r) => <span className="text-xs text-eromza-muted">P{r.period} · {r.time}</span> },
    { key: "subject", header: "Subject", render: (r) => <span className="text-xs text-eromza-muted">{r.subject}</span> },
    ...(showClass
      ? [{ key: "klass", header: "Class", render: (r) => <span className="text-xs text-eromza-muted">{r.klass}</span> }]
      : [{ key: "faculty", header: "Faculty", render: (r) => <span className="text-xs text-eromza-muted">{r.faculty}</span> }]),
    { key: "room", header: "Room", render: (r) => <Badge variant="neutral">{r.room}</Badge> },
  ];

  const handleExport = () => {
    downloadCsv("eromza-timetable.csv", [
      ["Day", "Period", "Time", "Subject", showClass ? "Class" : "Faculty", "Room"],
      ...rows.map((r) => [r.day, r.period, r.time, r.subject, showClass ? r.klass : r.faculty, r.room]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title="Timetable"
        description={description}
        actions={<Button variant="secondary" onClick={handleExport} disabled={!rows.length}><Download size={16} /> Export timetable</Button>}
      />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Weekly classes" value={String(rows.length)} tone="info" icon={CalendarDays} />
        <StatCard label="Teaching days" value={String(days.length)} tone="accent" icon={CalendarClock} />
        <StatCard label="Subjects" value={String(new Set(rows.map((r) => r.subject)).size)} tone="success" icon={Users} />
      </div>
      <Card>
        <CardHeader
          title="Weekly timetable"
          description="Scheduled classes"
          action={
            <Select aria-label="Filter by day" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="min-w-[160px]">
              <option value="all">All days</option>
              {days.map((d) => <option key={d} value={String(d)}>{DAY_NAMES[d]}</option>)}
            </Select>
          }
        />
        <DataTable columns={columns} rows={visible} loading={loading} getRowKey={(r) => r.id} emptyTitle="No classes scheduled" />
      </Card>
    </div>
  );
}
