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
import { hodDepartment, hodStudents } from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const EMPTY_FORM = {
  name: "",
  email: "",
  rollNo: "",
  program: hodDepartment.programs[0]?.name ?? "B.Sc. Computer Science",
  semester: "I",
};

const studentColumns = [
  {
    key: "name",
    header: "Student",
    render: (student) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {student.name}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{student.email}</p>
      </div>
    ),
  },
  {
    key: "rollNo",
    header: "Roll no.",
    render: (student) => (
      <span className="text-xs text-eromza-muted">{student.rollNo}</span>
    ),
  },
  {
    key: "program",
    header: "Programme",
    render: (student) => (
      <div className="min-w-0">
        <p className="truncate text-xs text-eromza-text">{student.program}</p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          Semester {student.semester}
        </p>
      </div>
    ),
  },
  {
    key: "attendance",
    header: "Attendance",
    render: (student) => (
      <Badge variant={student.attendance >= 75 ? "success" : "warning"}>
        {student.attendance}%
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (student) => (
      <Badge variant={getStatusVariant(student.status)}>
        {formatStatus(student.status)}
      </Badge>
    ),
  },
];

export default function ManageStudents() {
  const [students, setStudents] = useState(hodStudents);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !search ||
        student.name.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.rollNo.toLowerCase().includes(search);
      const matchesProgram =
        programFilter === "all" || student.program === programFilter;
      const matchesStatus =
        statusFilter === "all" || student.status === statusFilter;

      return matchesSearch && matchesProgram && matchesStatus;
    });
  }, [programFilter, query, statusFilter, students]);

  const handleExport = () => {
    downloadCsv("eromza-department-students.csv", [
      ["ID", "Name", "Email", "Roll No", "Programme", "Semester", "Attendance", "Status"],
      ...students.map((student) => [
        student.id,
        student.name,
        student.email,
        student.rollNo,
        student.program,
        student.semester,
        `${student.attendance}%`,
        student.status,
      ]),
    ]);
  };

  const handleAddStudent = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.rollNo.trim()) return;

    setStudents((current) => [
      {
        id: `STU-${309 + current.length}`,
        name: form.name.trim(),
        email: form.email.trim(),
        rollNo: form.rollNo.trim(),
        program: form.program,
        semester: form.semester,
        attendance: 0,
        status: "active",
      },
      ...current,
    ]);
    setForm(EMPTY_FORM);
    setModalOpen(false);
  };

  const toggleStatus = (studentId) => {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId
          ? {
              ...student,
              status: student.status === "active" ? "deactivated" : "active",
            }
          : student,
      ),
    );
  };

  const columns = [
    ...studentColumns,
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (student) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleStatus(student.id)}
        >
          {student.status === "active" ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department students"
        title="Manage Students"
        description="Review student records, programme enrolment, attendance, and account status."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export list
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus size={16} />
              Add student
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or roll number"
          />
          <Select
            aria-label="Filter by programme"
            value={programFilter}
            onChange={(event) => setProgramFilter(event.target.value)}
          >
            <option value="all">All programmes</option>
            {hodDepartment.programs.map((program) => (
              <option key={program.id} value={program.name}>
                {program.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="warning">Warning</option>
            <option value="deactivated">Deactivated</option>
          </Select>
        </CardBody>
        <DataTable
          columns={columns}
          rows={filteredStudents}
          emptyTitle="No students match your filters"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add student"
        description="Add a student record to the department directory."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-student-form">
              <UserPlus size={16} />
              Add student
            </Button>
          </>
        }
      >
        <form
          id="add-student-form"
          className="space-y-4"
          onSubmit={handleAddStudent}
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Input
              label="Roll number"
              value={form.rollNo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  rollNo: event.target.value,
                }))
              }
              placeholder="e.g. CS21-041"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Programme"
              value={form.program}
              onChange={(event) =>
                setForm((current) => ({ ...current, program: event.target.value }))
              }
            >
              {hodDepartment.programs.map((program) => (
                <option key={program.id} value={program.name}>
                  {program.name}
                </option>
              ))}
            </Select>
            <Select
              label="Semester"
              value={form.semester}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  semester: event.target.value,
                }))
              }
            >
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
              <option value="VI">VI</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
