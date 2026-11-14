import { useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Download, Plus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { teacherAttendanceRecords, teacherClasses } from "../../mocks/teacherData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const classLabel = (row) => `${row.program} · Semester ${row.semester}`;

export default function Attendance() {
  const [records, setRecords] = useState(teacherAttendanceRecords);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    classId: teacherClasses[0]?.id ?? "",
    date: "",
    present: "",
  });

  const selectedClass = teacherClasses.find((row) => row.id === form.classId);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    return records.filter((row) => {
      const matchesSearch =
        !search ||
        row.className.toLowerCase().includes(search) ||
        row.subject.toLowerCase().includes(search) ||
        row.date.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [query, records, statusFilter]);

  const average = Math.round(
    records.reduce((sum, row) => sum + (row.present / row.total) * 100, 0) /
      records.length,
  );
  const pending = records.filter((row) => row.status === "pending").length;
  const absent = records.reduce((sum, row) => sum + row.absent, 0);

  const handleExport = () => {
    downloadCsv("eromza-teacher-attendance.csv", [
      ["Date", "Class", "Subject", "Present", "Absent", "Total", "Status"],
      ...records.map((row) => [
        row.date,
        row.className,
        row.subject,
        row.present,
        row.absent,
        row.total,
        row.status,
      ]),
    ]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedClass) return;

    const present = Number(form.present);
    if (!Number.isFinite(present) || present < 0 || present > selectedClass.students) {
      return;
    }

    setRecords((current) => [
      {
        id: `ATT-${Date.now()}`,
        className: classLabel(selectedClass),
        subject: selectedClass.subject,
        date: form.date || "Today",
        present,
        absent: selectedClass.students - present,
        total: selectedClass.students,
        status: "submitted",
      },
      ...current,
    ]);
    setForm({
      classId: teacherClasses[0]?.id ?? "",
      date: "",
      present: "",
    });
    setModalOpen(false);
  };

  const markSubmitted = (recordId) => {
    setRecords((current) =>
      current.map((row) =>
        row.id === recordId ? { ...row, status: "submitted" } : row,
      ),
    );
  };

  const columns = [
    {
      key: "className",
      header: "Class",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.subject}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.className}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.date}</span>
      ),
    },
    {
      key: "students",
      header: "Students",
      render: (row) => (
        <span className="text-xs text-eromza-muted">
          {row.present}/{row.total} present
        </span>
      ),
    },
    {
      key: "absent",
      header: "Absent",
      render: (row) => <Badge variant={row.absent > 3 ? "warning" : "neutral"}>{row.absent}</Badge>,
    },
    {
      key: "percentage",
      header: "Attendance",
      render: (row) => (
        <Badge variant={row.present / row.total >= 0.85 ? "success" : "warning"}>
          {Math.round((row.present / row.total) * 100)}%
        </Badge>
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
      render: (row) =>
        row.status === "pending" ? (
          <Button variant="ghost" size="sm" onClick={() => markSubmitted(row.id)}>
            <CheckCircle2 size={14} />
            Submit
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Attendance"
        description="Record attendance for your classes and monitor submission status."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export attendance
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              Record attendance
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average attendance"
          value={`${average}%`}
          tone="success"
          icon={CalendarCheck}
        />
        <StatCard
          label="Submitted records"
          value={String(records.length - pending)}
          tone="info"
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending submissions"
          value={String(pending)}
          tone="warning"
          icon={AlertTriangle}
        />
        <StatCard
          label="Absent today"
          value={String(absent)}
          tone="accent"
          icon={AlertTriangle}
        />
      </div>

      <Card>
        <CardHeader
          title="Attendance register"
          description="Recent attendance submissions across your classes"
        />
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by class, subject, or date"
          />
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="pending">Pending</option>
          </Select>
        </CardBody>
        <DataTable
          columns={columns}
          rows={filteredRecords}
          emptyTitle="No attendance records match your filters"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record attendance"
        description="Submit attendance for one of your assigned classes."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="teacher-attendance-form">
              <CheckCircle2 size={16} />
              Submit attendance
            </Button>
          </>
        }
      >
        <form
          id="teacher-attendance-form"
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <Select
            label="Class"
            value={form.classId}
            onChange={(event) =>
              setForm((current) => ({ ...current, classId: event.target.value }))
            }
          >
            {teacherClasses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.subject} · {classLabel(row)}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
            />
            <Input
              label="Students present"
              type="number"
              min="0"
              max={selectedClass?.students ?? 0}
              value={form.present}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  present: event.target.value,
                }))
              }
              hint={
                selectedClass
                  ? `Class strength: ${selectedClass.students}`
                  : undefined
              }
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
