import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, Download, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { teacherClasses } from "../../mocks/teacherData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const columns = [
  {
    key: "subject",
    header: "Class",
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {row.subject}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {row.code} · Semester {row.semester}
        </p>
      </div>
    ),
  },
  {
    key: "program",
    header: "Programme",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.program}</span>
    ),
  },
  {
    key: "students",
    header: "Students",
    render: (row) => <Badge variant="neutral">{row.students}</Badge>,
  },
  {
    key: "attendance",
    header: "Attendance",
    render: (row) => (
      <Badge variant={row.attendance >= 85 ? "success" : "warning"}>
        {row.attendance}%
      </Badge>
    ),
  },
  {
    key: "schedule",
    header: "Schedule",
    render: (row) => (
      <div className="min-w-0">
        <p className="text-xs text-eromza-muted">{row.schedule}</p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{row.room}</p>
      </div>
    ),
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
  {
    key: "actions",
    header: "",
    className: "text-right",
    cellClassName: "text-right",
    render: () => (
      <Button as={Link} to="/teacher/attendance" variant="ghost" size="sm">
        <ClipboardCheck size={14} />
        Attendance
      </Button>
    ),
  },
];

export default function MyClasses() {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");

  const programs = useMemo(
    () => [...new Set(teacherClasses.map((row) => row.program))],
    [],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return teacherClasses.filter((row) => {
      const matchesSearch =
        !search ||
        row.subject.toLowerCase().includes(search) ||
        row.code.toLowerCase().includes(search) ||
        row.program.toLowerCase().includes(search);
      const matchesProgram =
        programFilter === "all" || row.program === programFilter;

      return matchesSearch && matchesProgram;
    });
  }, [programFilter, query]);

  const totalStudents = teacherClasses.reduce(
    (sum, row) => sum + row.students,
    0,
  );
  const averageAttendance = Math.round(
    teacherClasses.reduce((sum, row) => sum + row.attendance, 0) /
      teacherClasses.length,
  );

  const handleExport = () => {
    downloadCsv("eromza-teacher-classes.csv", [
      ["Code", "Subject", "Programme", "Semester", "Students", "Attendance", "Schedule", "Room"],
      ...teacherClasses.map((row) => [
        row.code,
        row.subject,
        row.program,
        row.semester,
        row.students,
        `${row.attendance}%`,
        row.schedule,
        row.room,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="My Classes"
        description="Review your assigned classes, student strength, schedules, and attendance health."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export classes
            </Button>
            <Button as={Link} to="/teacher/attendance">
              <ClipboardCheck size={16} />
              Take attendance
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned classes"
          value={String(teacherClasses.length)}
          tone="info"
          icon={BookOpen}
        />
        <StatCard
          label="Total students"
          value={String(totalStudents)}
          tone="accent"
          icon={Users}
        />
        <StatCard
          label="Average attendance"
          value={`${averageAttendance}%`}
          tone="success"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Active classes"
          value={String(
            teacherClasses.filter((row) => row.status === "active").length,
          )}
          tone="navy"
          icon={BookOpen}
        />
      </div>

      <Card>
        <CardHeader
          title="Class directory"
          description="All classes assigned to you this semester"
        />
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by subject, code, or programme"
          />
          <Select
            aria-label="Filter by programme"
            value={programFilter}
            onChange={(event) => setProgramFilter(event.target.value)}
          >
            <option value="all">All programmes</option>
            {programs.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </Select>
        </CardBody>
        <DataTable
          columns={columns}
          rows={filteredRows}
          emptyTitle="No classes match your filters"
        />
      </Card>
    </div>
  );
}
