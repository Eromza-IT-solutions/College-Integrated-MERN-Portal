import { useMemo, useState } from "react";
import { Download, UserPlus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import { hodTeachers } from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const EMPTY_FORM = {
  name: "",
  email: "",
  designation: "Assistant Professor",
  subjects: "",
};

const teacherColumns = [
  {
    key: "name",
    header: "Teacher",
    render: (teacher) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {teacher.name}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{teacher.email}</p>
      </div>
    ),
  },
  {
    key: "designation",
    header: "Designation",
    render: (teacher) => (
      <span className="text-xs text-eromza-muted">{teacher.designation}</span>
    ),
  },
  {
    key: "subjects",
    header: "Subject",
    render: (teacher) => (
      <span className="text-xs text-eromza-muted">{teacher.subjects}</span>
    ),
  },
  {
    key: "classes",
    header: "Classes",
    render: (teacher) => <Badge variant="neutral">{teacher.classes}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (teacher) => (
      <Badge variant={getStatusVariant(teacher.status)}>
        {formatStatus(teacher.status)}
      </Badge>
    ),
  },
  {
    key: "joined",
    header: "Joined",
    render: (teacher) => (
      <span className="text-xs text-eromza-muted">{teacher.joined}</span>
    ),
  },
];

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState(hodTeachers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredTeachers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const matchesSearch =
        !search ||
        teacher.name.toLowerCase().includes(search) ||
        teacher.email.toLowerCase().includes(search) ||
        teacher.subjects.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" || teacher.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [query, statusFilter, teachers]);

  const handleExport = () => {
    downloadCsv("eromza-department-teachers.csv", [
      ["ID", "Name", "Email", "Designation", "Subject", "Classes", "Status"],
      ...teachers.map((teacher) => [
        teacher.id,
        teacher.name,
        teacher.email,
        teacher.designation,
        teacher.subjects,
        teacher.classes,
        teacher.status,
      ]),
    ]);
  };

  const handleAddTeacher = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setTeachers((current) => [
      {
        id: `TCH-${207 + current.length}`,
        name: form.name.trim(),
        email: form.email.trim(),
        designation: form.designation,
        subjects: form.subjects.trim() || "Not assigned",
        classes: 0,
        status: "active",
        joined: "13 Nov 2026",
      },
      ...current,
    ]);
    setForm(EMPTY_FORM);
    setModalOpen(false);
  };

  const toggleStatus = (teacherId) => {
    setTeachers((current) =>
      current.map((teacher) =>
        teacher.id === teacherId
          ? {
              ...teacher,
              status: teacher.status === "active" ? "deactivated" : "active",
            }
          : teacher,
      ),
    );
  };

  const columns = [
    ...teacherColumns,
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (teacher) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleStatus(teacher.id)}
        >
          {teacher.status === "active" ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department faculty"
        title="Manage Teachers"
        description="Review faculty assignments, subjects, class loads, and account status."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export list
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus size={16} />
              Add teacher
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or subject"
          />
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="deactivated">Deactivated</option>
          </Select>
        </CardBody>
        <DataTable
          columns={columns}
          rows={filteredTeachers}
          emptyTitle="No teachers match your filters"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add teacher"
        description="Add a faculty member to the department directory."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-teacher-form">
              <UserPlus size={16} />
              Add teacher
            </Button>
          </>
        }
      >
        <form
          id="add-teacher-form"
          className="space-y-4"
          onSubmit={handleAddTeacher}
        >
          <Input
            label="Full name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Enter full name"
            required
          />
          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="name@abcedu.in"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Designation"
              value={form.designation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  designation: event.target.value,
                }))
              }
            >
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Professor">Professor</option>
            </Select>
            <Input
              label="Primary subject"
              value={form.subjects}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subjects: event.target.value,
                }))
              }
              placeholder="e.g. Data Structures"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
