import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  Plus,
  Unlock,
  Users,
} from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { examSubjects } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const SEMESTERS = [
  "Semester I",
  "Semester II",
  "Semester III",
  "Semester IV",
  "Semester V",
  "Semester VI",
];

export default function SubjectsAndExamForms() {
  const [rows, setRows] = useState(examSubjects);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    program: "B.Sc. Computer Science",
    semester: "Semester V",
    credits: "4",
    formStatus: "draft",
  });

  const programs = useMemo(
    () => [...new Set(rows.map((row) => row.program))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name.toLowerCase().includes(search) ||
        row.code.toLowerCase().includes(search);
      const matchesProgram =
        programFilter === "all" || row.program === programFilter;
      const matchesForm =
        formFilter === "all" || row.formStatus === formFilter;

      return matchesSearch && matchesProgram && matchesForm;
    });
  }, [formFilter, programFilter, query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    subjects: rows.length,
    open: rows.filter((row) => row.formStatus === "open").length,
    closed: rows.filter((row) => row.formStatus === "closed").length,
    registered: rows.reduce((sum, row) => sum + row.registered, 0),
  };

  const handleExport = () => {
    downloadCsv("eromza-exam-subjects.csv", [
      ["Code", "Subject", "Program", "Semester", "Credits", "Exam form", "Registered"],
      ...filteredRows.map((row) => [
        row.code,
        row.name,
        row.program,
        row.semester,
        row.credits,
        row.formStatus,
        row.registered,
      ]),
    ]);
  };

  const handleAddSubject = (event) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim()) return;

    const nextRow = {
      id: `SUB-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      program: form.program,
      semester: form.semester,
      credits: Number(form.credits),
      formStatus: form.formStatus,
      registered: 0,
      maxMarks: 100,
      session: "To be scheduled",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      code: "",
      name: "",
      program: "B.Sc. Computer Science",
      semester: "Semester V",
      credits: "4",
      formStatus: "draft",
    });
    setIsAddOpen(false);
    setPage(1);
  };

  const toggleForm = () => {
    if (!selectedSubject) return;

    const nextStatus =
      selectedSubject.formStatus === "open" ? "closed" : "open";

    setRows((current) =>
      current.map((row) =>
        row.id === selectedSubject.id
          ? { ...row, formStatus: nextStatus }
          : row,
      ),
    );
    setSelectedSubject((current) =>
      current ? { ...current, formStatus: nextStatus } : current,
    );
  };

  const columns = [
    {
      key: "name",
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.name}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.code}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.program}</span>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.semester}</span>
      ),
    },
    {
      key: "credits",
      header: "Credits",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">{row.credits}</span>
      ),
    },
    {
      key: "formStatus",
      header: "Exam form",
      render: (row) => (
        <Badge variant={getStatusVariant(row.formStatus)}>
          {formatStatus(row.formStatus)}
        </Badge>
      ),
    },
    {
      key: "registered",
      header: "Registered",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">
          {row.registered}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedSubject(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Eye size={14} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Examination administration"
        title="Subjects & Exam Forms"
        description="Maintain exam subjects, credits, registrations, and exam form availability."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export subjects
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              Add subject
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subjects"
          value={String(counts.subjects)}
          icon={BookOpen}
          tone="info"
        />
        <StatCard
          label="Open Forms"
          value={String(counts.open)}
          icon={Unlock}
          tone="success"
        />
        <StatCard
          label="Closed Forms"
          value={String(counts.closed)}
          icon={Lock}
          tone="warning"
        />
        <StatCard
          label="Registrations"
          value={String(counts.registered)}
          icon={Users}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader
          title="Subject and exam form register"
          description="Subject-wise exam form windows and registered students"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by subject or code..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={programFilter}
              onChange={(event) => {
                setProgramFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter subjects by program"
              className="min-w-[190px]"
            >
              <option value="all">All programs</option>
              {programs.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </Select>

            <Select
              value={formFilter}
              onChange={(event) => {
                setFormFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter subjects by exam form status"
              className="min-w-[160px]"
            >
              <option value="all">All form status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No subjects found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} subjects
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add subject"
        description="Create a subject and configure its exam form availability."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="subject-form">
              Add subject
            </Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleAddSubject} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Subject code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="e.g. CS-503"
              required
            />
            <Input
              label="Subject name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Operating Systems"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Program"
              value={form.program}
              onChange={(event) =>
                setForm({ ...form, program: event.target.value })
              }
            >
              {programs.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </Select>

            <Select
              label="Semester"
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
            >
              {SEMESTERS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Credits"
              type="number"
              min="1"
              max="8"
              value={form.credits}
              onChange={(event) =>
                setForm({ ...form, credits: event.target.value })
              }
              required
            />

            <Select
              label="Exam form status"
              value={form.formStatus}
              onChange={(event) =>
                setForm({ ...form, formStatus: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedSubject)}
        onClose={() => setSelectedSubject(null)}
        title={selectedSubject?.name ?? "Subject details"}
        description={
          selectedSubject
            ? `${selectedSubject.code} · ${selectedSubject.program}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={toggleForm}>
              {selectedSubject?.formStatus === "open" ? (
                <>
                  <Lock size={14} />
                  Close forms
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  Open forms
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedSubject(null)}>
              Close
            </Button>
          </>
        }
      >
        {selectedSubject ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedSubject.formStatus)}>
                {formatStatus(selectedSubject.formStatus)}
              </Badge>
              <Badge variant="neutral">{selectedSubject.semester}</Badge>
              <Badge variant="info">{selectedSubject.credits} credits</Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Exam session
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedSubject.session}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Maximum marks
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedSubject.maxMarks}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Registered students
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-eromza-text">
                  <Users size={15} className="text-eromza-subtle" />
                  {selectedSubject.registered} students
                </dd>
              </div>
            </dl>

            <div className="flex items-center gap-2 rounded-lg bg-eromza-bg p-3 text-xs text-eromza-muted">
              {selectedSubject.formStatus === "open" ? (
                <CheckCircle2 size={15} className="text-eromza-success" />
              ) : (
                <FileText size={15} className="text-eromza-subtle" />
              )}
              {selectedSubject.formStatus === "open"
                ? "Students can currently submit exam forms for this subject."
                : "Exam form submission is not available for this subject."}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
