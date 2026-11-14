import { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  FileCheck,
  Send,
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
import { examMarks } from "../../../mocks/examAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const GRADES = ["A+", "A", "B+", "B", "C", "F"];

function getGrade(marks) {
  if (marks >= 90) return "A+";
  if (marks >= 80) return "A";
  if (marks >= 70) return "B+";
  if (marks >= 60) return "B";
  if (marks >= 40) return "C";
  return "F";
}

export default function MarksAndResults() {
  const [rows, setRows] = useState(examMarks);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState(null);
  const [form, setForm] = useState({
    marks: "",
    grade: "A",
    result: "pass",
    status: "moderated",
  });

  const sessions = useMemo(
    () => [...new Set(rows.map((row) => row.session))],
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
      const matchesSession =
        sessionFilter === "all" || row.session === sessionFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesSession && matchesStatus;
    });
  }, [query, rows, sessionFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    total: rows.length,
    submitted: rows.filter((row) => row.status === "submitted").length,
    moderated: rows.filter((row) => row.status === "moderated").length,
    published: rows.filter((row) => row.status === "published").length,
  };

  const handleExport = () => {
    downloadCsv("eromza-exam-marks.csv", [
      [
        "Student",
        "Roll number",
        "Subject",
        "Session",
        "Marks",
        "Grade",
        "Result",
        "Status",
      ],
      ...filteredRows.map((row) => [
        row.student,
        row.rollNo,
        row.subject,
        row.session,
        `${row.marks}/${row.maxMarks}`,
        row.grade,
        row.result,
        row.status,
      ]),
    ]);
  };

  const openEdit = (mark) => {
    setSelectedMark(mark);
    setForm({
      marks: String(mark.marks),
      grade: mark.grade,
      result: mark.result,
      status: mark.status,
    });
  };

  const handleEditMarks = (event) => {
    event.preventDefault();

    if (!selectedMark) return;

    const marks = Number(form.marks);

    setRows((current) =>
      current.map((row) =>
        row.id === selectedMark.id
          ? {
              ...row,
              marks,
              grade: form.grade,
              result: form.result,
              status: form.status,
            }
          : row,
      ),
    );
    setSelectedMark(null);
  };

  const handleMarksChange = (value) => {
    const marks = Number(value);
    setForm((current) => ({
      ...current,
      marks: value,
      grade: value === "" ? current.grade : getGrade(marks),
      result: value === "" ? current.result : marks >= 40 ? "pass" : "fail",
    }));
  };

  const handlePublishResults = () => {
    setRows((current) =>
      current.map((row) =>
        row.status === "moderated" || row.status === "submitted"
          ? { ...row, status: "published" }
          : row,
      ),
    );
    setIsPublishOpen(false);
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
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.rollNo}</p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-eromza-text">{row.subject}</p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.session}</p>
        </div>
      ),
    },
    {
      key: "marks",
      header: "Marks",
      render: (row) => (
        <span className="text-xs font-semibold text-eromza-text">
          {row.marks}/{row.maxMarks}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Grade",
      render: (row) => <Badge variant="neutral">{row.grade}</Badge>,
    },
    {
      key: "result",
      header: "Result",
      render: (row) => (
        <Badge variant={getStatusVariant(row.result)}>
          {formatStatus(row.result)}
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
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Edit3 size={14} />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Examination administration"
        title="Marks & Results"
        description="Review subject marks, moderate grades, and publish results for students."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export marks
            </Button>
            <Button onClick={() => setIsPublishOpen(true)}>
              <Send size={16} />
              Publish results
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Records"
          value={String(counts.total)}
          icon={ClipboardCheck}
          tone="info"
        />
        <StatCard
          label="Submitted"
          value={String(counts.submitted)}
          icon={FileCheck}
          tone="warning"
        />
        <StatCard
          label="Moderated"
          value={String(counts.moderated)}
          icon={CheckCircle2}
          tone="accent"
        />
        <StatCard
          label="Published"
          value={String(counts.published)}
          icon={Award}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader
          title="Marks register"
          description="Subject-wise marks and result status"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by student, roll number, or subject..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={sessionFilter}
              onChange={(event) => {
                setSessionFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by exam session"
              className="min-w-[190px]"
            >
              <option value="all">All sessions</option>
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by marks status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="moderated">Moderated</option>
              <option value="published">Published</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No marks found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} records
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={Boolean(selectedMark)}
        onClose={() => setSelectedMark(null)}
        title="Edit marks"
        description={
          selectedMark
            ? `${selectedMark.student} · ${selectedMark.subject}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedMark(null)}>
              Cancel
            </Button>
            <Button type="submit" form="marks-form">
              Save marks
            </Button>
          </>
        }
      >
        {selectedMark ? (
          <form id="marks-form" onSubmit={handleEditMarks} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={`Marks (out of ${selectedMark.maxMarks})`}
                type="number"
                min="0"
                max={selectedMark.maxMarks}
                value={form.marks}
                onChange={(event) => handleMarksChange(event.target.value)}
                required
              />

              <Select
                label="Grade"
                value={form.grade}
                onChange={(event) =>
                  setForm({ ...form, grade: event.target.value })
                }
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Result"
                value={form.result}
                onChange={(event) =>
                  setForm({ ...form, result: event.target.value })
                }
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </Select>

              <Select
                label="Status"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="moderated">Moderated</option>
                <option value="published">Published</option>
              </Select>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        title="Publish results"
        description="Publish all moderated and submitted marks to student result pages."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPublishOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublishResults}>
              <Send size={14} />
              Publish results
            </Button>
          </>
        }
      >
        <div className="rounded-lg bg-eromza-bg p-4 text-sm leading-6 text-eromza-muted">
          This will publish {counts.submitted + counts.moderated} result records.
          Published results can be reviewed by students immediately.
        </div>
      </Modal>
    </div>
  );
}
