import { useMemo, useState } from "react";
import {
  Download,
  UserPlus,
  Search,
  Users,
  AlertTriangle,
  Mail,
  X,
  CheckCircle2,
  UserRound,
  Pencil,
  Trash2,
} from "lucide-react";

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

export default function ManageStudents() {
  const [students, setStudents] = useState(hodStudents);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

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

  const activeCount = students.filter(
    (student) => student.status === "active"
  ).length;

  const warningCount = students.filter(
    (student) => student.status === "warning"
  ).length;

  const deactivatedCount = students.filter(
    (student) => student.status === "deactivated"
  ).length;

  const handleExport = () => {
    downloadCsv("eromza-department-students.csv", [
      [
        "ID",
        "Name",
        "Email",
        "Roll No",
        "Programme",
        "Semester",
        "Attendance",
        "Status",
      ],
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

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingId(student.id);
    setForm({
      name: student.name || "",
      email: student.email || "",
      rollNo: student.rollNo || "",
      program: student.program || EMPTY_FORM.program,
      semester: student.semester || "I",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSaveStudent = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const rollNo = form.rollNo.trim();

    if (!name || !email || !rollNo) {
      window.alert("Please fill all required student details.");
      return;
    }

    const duplicateEmail = students.some(
      (student) =>
        student.email.toLowerCase() === email &&
        student.id !== editingId
    );

    const duplicateRollNo = students.some(
      (student) =>
        student.rollNo.toLowerCase() === rollNo.toLowerCase() &&
        student.id !== editingId
    );

    if (duplicateEmail) {
      window.alert("A student with this email address already exists.");
      return;
    }

    if (duplicateRollNo) {
      window.alert("This roll number is already registered.");
      return;
    }

    if (editingId) {
      setStudents((current) =>
        current.map((student) =>
          student.id === editingId
            ? {
                ...student,
                name,
                email,
                rollNo,
                program: form.program,
                semester: form.semester,
              }
            : student
        )
      );
    } else {
      setStudents((current) => [
        {
          id: `STU-${Date.now()}`,
          name,
          email,
          rollNo,
          program: form.program,
          semester: form.semester,
          attendance: 0,
          status: "active",
        },
        ...current,
      ]);
    }

    closeModal();
  };

  const handleDeleteStudent = (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setStudents((current) =>
      current.filter((item) => item.id !== student.id)
    );
  };

  const toggleStatus = (studentId) => {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId
          ? {
              ...student,
              status:
                student.status === "active" ? "deactivated" : "active",
            }
          : student
      )
    );
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div>
      <div className="hod-page-head">
        <div>
          <h2 className="hod-page-title">Manage Students</h2>
          <p className="hod-page-subtitle">
            Review student records, programme enrolment, attendance and
            account status.
          </p>
        </div>

        <div className="hod-toolbar-right">
          <button
            type="button"
            className="hod-btn hod-btn-secondary"
            onClick={handleExport}
          >
            <Download size={15} />
            Export List
          </button>

          <button
            type="button"
            className="hod-btn hod-btn-primary"
            onClick={openAddModal}
          >
            <UserPlus size={15} />
            Add Student
          </button>
        </div>
      </div>

      <section className="hod-kpi-grid">
        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Total Students</div>
            <div className="hod-kpi-value">{students.length}</div>
            <div className="hod-kpi-description">Department records</div>
          </div>
          <div className="hod-kpi-icon blue">
            <Users size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Active Students</div>
            <div className="hod-kpi-value">{activeCount}</div>
            <div className="hod-kpi-description">Currently active</div>
          </div>
          <div className="hod-kpi-icon green">
            <CheckCircle2 size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Warning</div>
            <div className="hod-kpi-value">{warningCount}</div>
            <div className="hod-kpi-description">
              Students requiring attention
            </div>
          </div>
          <div className="hod-kpi-icon orange">
            <AlertTriangle size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Deactivated</div>
            <div className="hod-kpi-value">{deactivatedCount}</div>
            <div className="hod-kpi-description">Inactive accounts</div>
          </div>
          <div className="hod-kpi-icon maroon">
            <UserRound size={21} />
          </div>
        </article>
      </section>

      <section className="hod-panel">
        <div className="hod-panel-header">
          <div>
            <h3>Student Directory</h3>
            <p>View and manage department student records</p>
          </div>

          <span className="hod-status info">
            {filteredStudents.length} Records
          </span>
        </div>

        <div
          className="hod-toolbar"
          style={{ padding: "15px 18px", marginBottom: 0 }}
        >
          <div className="hod-toolbar-left" style={{ flex: 1 }}>
            <div
              className="hod-search"
              style={{ width: "100%", maxWidth: 350 }}
            >
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email or roll number..."
                aria-label="Search students"
              />
            </div>
          </div>

          <div className="hod-toolbar-right">
            <select
              className="hod-filter"
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
              aria-label="Filter by programme"
            >
              <option value="all">All Programmes</option>
              {hodDepartment.programs.map((program) => (
                <option key={program.id} value={program.name}>
                  {program.name}
                </option>
              ))}
            </select>

            <select
              className="hod-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        <div className="hod-table-wrapper">
          <table className="hod-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Programme</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const statusVariant = getStatusVariant(student.status);

                return (
                  <tr key={student.id}>
                    <td>
                      <div className="hod-person">
                        <div className="hod-avatar">
                          {student.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong>{student.name}</strong>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              overflowWrap: "anywhere",
                            }}
                          >
                            <Mail size={11} />
                            {student.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong style={{ color: "#14264B", fontSize: 11 }}>
                        {student.rollNo}
                      </strong>
                    </td>

                    <td>
                      <div style={{ minWidth: 120 }}>
                        <strong
                          style={{
                            display: "block",
                            color: "#26344D",
                            fontSize: 11,
                          }}
                        >
                          {student.program}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            marginTop: 4,
                            color: "#8993A5",
                            fontSize: 10,
                          }}
                        >
                          Semester {student.semester}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`hod-status ${
                          student.attendance >= 75 ? "success" : "warning"
                        }`}
                      >
                        {student.attendance}%
                      </span>
                    </td>

                    <td>
                      <span className={`hod-status ${statusVariant}`}>
                        {formatStatus(student.status)}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="hod-btn hod-btn-sm hod-btn-secondary"
                          onClick={() => openEditModal(student)}
                          title="Edit student"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`hod-btn hod-btn-sm ${
                            student.status === "active"
                              ? "hod-btn-danger"
                              : "hod-btn-success"
                          }`}
                          onClick={() => toggleStatus(student.id)}
                        >
                          {student.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="hod-btn hod-btn-sm hod-btn-danger"
                          onClick={() => handleDeleteStudent(student)}
                          title="Delete student"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="hod-empty">
              <Users size={30} />
              <strong>No students found</strong>
              <p>
                No student records match your search or selected filters.
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "13px 18px",
            borderTop: "1px solid #edf0f4",
            color: "#8993A5",
            fontSize: 10,
          }}
        >
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </section>

      {modalOpen && (
        <div
          className="hod-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="hod-modal hod-modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <div className="hod-modal-header">
              <div>
                <h3 id="student-modal-title">
                  {editingId ? "Update Student" : "Add New Student"}
                </h3>
                <p>
                  {editingId
                    ? "Update student details"
                    : "Add a student record to the department directory"}
                </p>
              </div>

              <button
                type="button"
                className="hod-modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent}>
              <div className="hod-modal-body">
                <div className="hod-form-grid">
                  <div className="hod-form-group">
                    <label htmlFor="student-name">Full Name *</label>
                    <input
                      id="student-name"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="student-email">Email Address *</label>
                    <input
                      id="student-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateForm("email", event.target.value)
                      }
                      placeholder="name@abcedu.in"
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="student-roll">Roll Number *</label>
                    <input
                      id="student-roll"
                      type="text"
                      value={form.rollNo}
                      onChange={(event) =>
                        updateForm("rollNo", event.target.value)
                      }
                      placeholder="e.g. CS21-041"
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="student-programme">Programme</label>
                    <select
                      id="student-programme"
                      value={form.program}
                      onChange={(event) =>
                        updateForm("program", event.target.value)
                      }
                    >
                      {hodDepartment.programs.map((program) => (
                        <option key={program.id} value={program.name}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="student-semester">Semester</label>
                    <select
                      id="student-semester"
                      value={form.semester}
                      onChange={(event) =>
                        updateForm("semester", event.target.value)
                      }
                    >
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                      <option value="VI">VI</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="hod-modal-footer">
                <button
                  type="button"
                  className="hod-btn hod-btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="hod-btn hod-btn-primary">
                  {editingId ? (
                    <>
                      <Pencil size={15} />
                      Update Student
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      Add Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}