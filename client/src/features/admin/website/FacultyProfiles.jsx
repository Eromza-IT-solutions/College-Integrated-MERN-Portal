import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
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
import { websiteFaculty } from "../../../mocks/websiteAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

function initials(name) {
  return name
    .replace(/^(Dr\.|Prof\.)\s+/, "")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export default function FacultyProfiles() {
  const [rows, setRows] = useState(websiteFaculty);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    department: "Computer Science",
    designation: "Assistant Professor",
    email: "",
    status: "draft",
  });

  const departments = useMemo(
    () => [...new Set(rows.map((row) => row.department))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.name.toLowerCase().includes(search) ||
        row.email.toLowerCase().includes(search) ||
        row.designation.toLowerCase().includes(search);
      const matchesDepartment =
        departmentFilter === "all" || row.department === departmentFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    total: rows.length,
    published: rows.filter((row) => row.status === "published").length,
    review: rows.filter((row) => row.status === "review").length,
    departments: departments.length,
  };

  const handleExport = () => {
    downloadCsv("eromza-website-faculty.csv", [
      ["Faculty", "Department", "Designation", "Email", "Qualification", "Status"],
      ...filteredRows.map((row) => [
        row.name,
        row.department,
        row.designation,
        row.email,
        row.qualification,
        row.status,
      ]),
    ]);
  };

  const handleAddFaculty = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim()) return;

    const nextRow = {
      id: `FAC-${Date.now()}`,
      name: form.name.trim(),
      department: form.department,
      designation: form.designation,
      email: form.email.trim(),
      phone: "To be updated",
      qualification: "To be updated",
      experience: "New profile",
      courses: ["To be assigned"],
      status: form.status,
      joined: "2026",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      name: "",
      department: "Computer Science",
      designation: "Assistant Professor",
      email: "",
      status: "draft",
    });
    setIsAddOpen(false);
    setPage(1);
  };

  const columns = [
    {
      key: "name",
      header: "Faculty",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-eromza-sidebar text-[11px] font-semibold text-white">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-eromza-text">
              {row.name}
            </p>
            <p className="mt-1 text-[11px] text-eromza-subtle">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.department}</span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.designation}</span>
      ),
    },
    {
      key: "courses",
      header: "Subjects",
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
          onClick={() => setSelectedFaculty(row)}
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
        title="Faculty Profiles"
        description="Publish faculty biographies, qualifications, subjects, and department contact details."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export faculty
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              Add faculty
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Faculty"
          value={String(counts.total)}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Published Profiles"
          value={String(counts.published)}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label="In Review"
          value={String(counts.review)}
          icon={BookOpen}
          tone="warning"
        />
        <StatCard
          label="Departments"
          value={String(counts.departments)}
          icon={GraduationCap}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader
          title="Faculty directory"
          description="Public faculty profiles grouped across academic departments"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or designation..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter faculty by department"
              className="min-w-[190px]"
            >
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter faculty by status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="review">In review</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No faculty profiles found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} faculty profiles
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
        title="Add faculty profile"
        description="Create a public profile for a faculty member."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="faculty-form">
              Add faculty
            </Button>
          </>
        }
      >
        <form id="faculty-form" onSubmit={handleAddFaculty} className="space-y-4">
          <Input
            label="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. Dr. A. Rahman"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Department"
              value={form.department}
              onChange={(event) =>
                setForm({ ...form, department: event.target.value })
              }
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>

            <Select
              label="Designation"
              value={form.designation}
              onChange={(event) =>
                setForm({ ...form, designation: event.target.value })
              }
            >
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Professor">Professor</option>
              <option value="Visiting Faculty">Visiting Faculty</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="name@abeda.ac.in"
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
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedFaculty)}
        onClose={() => setSelectedFaculty(null)}
        title={selectedFaculty?.name ?? "Faculty profile"}
        description={
          selectedFaculty
            ? `${selectedFaculty.designation} · ${selectedFaculty.department}`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedFaculty(null)}>
            Close
          </Button>
        }
      >
        {selectedFaculty ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(selectedFaculty.status)}>
                {formatStatus(selectedFaculty.status)}
              </Badge>
              <Badge variant="neutral">{selectedFaculty.qualification}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Email
                </p>
                <p className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedFaculty.email}
                </p>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Phone
                </p>
                <p className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedFaculty.phone}
                </p>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Experience
                </p>
                <p className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedFaculty.experience}
                </p>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Joined
                </p>
                <p className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedFaculty.joined}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-eromza-text">
                Subjects taught
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFaculty.courses.map((course) => (
                  <Badge key={course} variant="info">
                    {course}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
