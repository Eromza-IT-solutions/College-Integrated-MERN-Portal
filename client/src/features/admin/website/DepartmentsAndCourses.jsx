import { useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Download,
  Eye,
  GraduationCap,
  Plus,
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
import { websiteDepartments } from "../../../mocks/websiteAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

export default function DepartmentsAndCourses() {
  const [rows, setRows] = useState(websiteDepartments);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    hod: "",
    status: "draft",
  });

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name.toLowerCase().includes(search) ||
        row.code.toLowerCase().includes(search) ||
        row.hod.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    departments: rows.length,
    courses: rows.reduce((sum, row) => sum + row.courses.length, 0),
    faculty: rows.reduce((sum, row) => sum + row.faculty, 0),
    students: rows.reduce((sum, row) => sum + row.students, 0),
  };

  const handleExport = () => {
    downloadCsv("eromza-website-departments.csv", [
      ["Department", "Code", "HOD", "Courses", "Faculty", "Students", "Status"],
      ...filteredRows.map((row) => [
        row.name,
        row.code,
        row.hod,
        row.courses.join("; "),
        row.faculty,
        row.students,
        row.status,
      ]),
    ]);
  };

  const handleAddDepartment = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.code.trim()) return;

    const nextRow = {
      id: `DEP-${Date.now()}`,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      hod: form.hod.trim() || "To be assigned",
      courses: ["New programme"],
      faculty: 0,
      students: 0,
      status: form.status,
      established: "2026",
      summary:
        "This department profile is ready for programme details and public website content.",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({ name: "", code: "", hod: "", status: "draft" });
    setIsAddOpen(false);
    setPage(1);
  };

  const columns = [
    {
      key: "name",
      header: "Department",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-eromza-bg text-eromza-accent">
            <Building2 size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-eromza-text">
              {row.name}
            </p>
            <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "courses",
      header: "Courses",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.courses.map((course) => (
            <Badge key={course} variant="neutral">
              {course}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "hod",
      header: "Head of department",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.hod}</span>
      ),
    },
    {
      key: "faculty",
      header: "Faculty",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">{row.faculty}</span>
      ),
    },
    {
      key: "students",
      header: "Students",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">{row.students}</span>
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
          onClick={() => setSelectedDepartment(row)}
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
        eyebrow="Website administration"
        title="Departments & Courses"
        description="Maintain public department profiles, programme listings, and academic leadership details."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export departments
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              Add department
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Departments"
          value={String(counts.departments)}
          icon={Building2}
          tone="accent"
        />
        <StatCard
          label="Courses"
          value={String(counts.courses)}
          icon={BookOpen}
          tone="info"
        />
        <StatCard
          label="Faculty"
          value={String(counts.faculty)}
          icon={GraduationCap}
          tone="success"
        />
        <StatCard
          label="Students"
          value={String(counts.students)}
          icon={Users}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader
          title="Department directory"
          description="Published and draft department pages on the college website"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by department, code, or HOD..."
            className="w-full sm:max-w-xs"
          />

          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter departments by status"
            className="sm:w-40"
          >
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="review">In review</option>
            <option value="draft">Draft</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No departments found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} departments
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
        title="Add department"
        description="Create a new department profile for the public website."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="department-form">
              Add department
            </Button>
          </>
        }
      >
        <form id="department-form" onSubmit={handleAddDepartment} className="space-y-4">
          <Input
            label="Department name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Department of Physics"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Department code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="e.g. PHY"
              required
            />

            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
            </Select>
          </div>

          <Input
            label="Head of department"
            value={form.hod}
            onChange={(event) => setForm({ ...form, hod: event.target.value })}
            placeholder="e.g. Dr. A. Rahman"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedDepartment)}
        onClose={() => setSelectedDepartment(null)}
        title={selectedDepartment?.name ?? "Department profile"}
        description={
          selectedDepartment
            ? `${selectedDepartment.code} · Established ${selectedDepartment.established}`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedDepartment(null)}>
            Close
          </Button>
        }
      >
        {selectedDepartment ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedDepartment.status)}>
                {formatStatus(selectedDepartment.status)}
              </Badge>
              <Badge variant="neutral">{selectedDepartment.hod}</Badge>
            </div>

            <div className="rounded-lg bg-eromza-bg p-4 text-sm leading-6 text-eromza-muted">
              {selectedDepartment.summary}
            </div>

            <div>
              <p className="text-xs font-semibold text-eromza-text">
                Courses offered
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedDepartment.courses.map((course) => (
                  <Badge key={course} variant="info">
                    {course}
                  </Badge>
                ))}
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Faculty
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedDepartment.faculty}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Students
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedDepartment.students}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Department code
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedDepartment.code}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
