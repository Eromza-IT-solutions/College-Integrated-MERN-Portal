import { useMemo, useState } from "react";
import { Award, ClipboardList, Download, Pencil, TrendingUp } from "lucide-react";
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
import { teacherStudentMarks } from "../../mocks/teacherData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const gradeFor = (total) => {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B+";
  if (total >= 60) return "B";
  return "C";
};

export default function Marks() {
  const [rows, setRows] = useState(teacherStudentMarks);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ internal: "", external: "" });

  const subjects = useMemo(
    () => [...new Set(rows.map((row) => row.subject))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.student.toLowerCase().includes(search) ||
        row.rollNo.toLowerCase().includes(search) ||
        row.subject.toLowerCase().includes(search);
      const matchesSubject =
        subjectFilter === "all" || row.subject === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [query, rows, subjectFilter]);

  const average = Math.round(
    rows.reduce((sum, row) => sum + row.total, 0) / rows.length,
  );
  const pending = rows.filter((row) => row.status === "pending").length;
  const topGrade = rows.filter((row) => row.grade === "A+").length;

  const openEdit = (row) => {
    setSelected(row);
    setForm({ internal: String(row.internal), external: String(row.external) });
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!selected) return;

    const internal = Number(form.internal);
    const external = Number(form.external);
    if (
      !Number.isFinite(internal) ||
      !Number.isFinite(external) ||
      internal < 0 ||
      external < 0
    ) {
      return;
    }

    const total = internal + external;
    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              internal,
              external,
              total,
              grade: gradeFor(total),
              status: "published",
            }
          : row,
      ),
    );
    setSelected(null);
  };

  const handleExport = () => {
    downloadCsv("eromza-teacher-marks.csv", [
      ["Roll no.", "Student", "Class", "Subject", "Internal", "External", "Total", "Grade", "Status"],
      ...rows.map((row) => [
        row.rollNo,
        row.student,
        row.className,
        row.subject,
        row.internal,
        row.external,
        row.total,
        row.grade,
        row.status,
      ]),
    ]);
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.student}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.rollNo} · {row.className}
          </p>
        </div>
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
      key: "internal",
      header: "Internal",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.internal}/30</span>
      ),
    },
    {
      key: "external",
      header: "External",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.external}/70</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => (
        <span className="text-xs font-semibold text-eromza-text">
          {row.total}/100
        </span>
      ),
    },
    {
      key: "grade",
      header: "Grade",
      render: (row) => <Badge variant="info">{row.grade}</Badge>,
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
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
          <Pencil size={14} />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Marks"
        description="Enter internal and external marks, review grades, and publish student results."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export marks
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Marks recorded"
          value={String(rows.length)}
          tone="info"
          icon={ClipboardList}
        />
        <StatCard
          label="Average score"
          value={`${average}/100`}
          tone="success"
          icon={TrendingUp}
        />
        <StatCard
          label="Pending entry"
          value={String(pending)}
          tone="warning"
          icon={ClipboardList}
        />
        <StatCard
          label="A+ grades"
          value={String(topGrade)}
          tone="accent"
          icon={Award}
        />
      </div>

      <Card>
        <CardHeader
          title="Student marks"
          description="Internal assessment records for your classes"
        />
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by student, roll number, or subject"
          />
          <Select
            aria-label="Filter by subject"
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </Select>
        </CardBody>
        <DataTable
          columns={columns}
          rows={filteredRows}
          emptyTitle="No marks match your filters"
        />
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Edit marks"
        description={
          selected
            ? `${selected.student} · ${selected.subject}`
            : "Update internal and external marks."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button type="submit" form="teacher-marks-form">
              Save marks
            </Button>
          </>
        }
      >
        <form id="teacher-marks-form" className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Internal marks"
              type="number"
              min="0"
              max="30"
              value={form.internal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  internal: event.target.value,
                }))
              }
              required
            />
            <Input
              label="External marks"
              type="number"
              min="0"
              max="70"
              value={form.external}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  external: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="rounded-xl bg-eromza-bg p-3 text-xs text-eromza-muted">
            Total:{" "}
            <span className="font-semibold text-eromza-text">
              {Number(form.internal || 0) + Number(form.external || 0)}/100
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
