import { useMemo, useState } from "react";
import {
  Download,
  UserPlus,
  Search,
  Users,
  Mail,
  BookOpen,
  X,
  CheckCircle2,
  UserRound,
  Pencil,
  Trash2,
} from "lucide-react";

import { hodTeachers } from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const EMPTY_FORM = {
  name: "",
  email: "",
  designation: "Assistant Professor",
  subjects: "",
};

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState(hodTeachers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const filteredTeachers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const matchesSearch =
        !search ||
        teacher.name.toLowerCase().includes(search) ||
        teacher.email.toLowerCase().includes(search) ||
        (teacher.subjects || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || teacher.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [query, statusFilter, teachers]);

  const activeCount = teachers.filter(
    (teacher) => teacher.status === "active"
  ).length;

  const inactiveCount = teachers.filter(
    (teacher) => teacher.status === "deactivated"
  ).length;

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

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (teacher) => {
    setEditingId(teacher.id);
    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      designation: teacher.designation || "Assistant Professor",
      subjects: teacher.subjects || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSaveTeacher = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      window.alert("Please enter teacher name and email.");
      return;
    }

    const emailExists = teachers.some(
      (teacher) =>
        teacher.email.toLowerCase() === email &&
        teacher.id !== editingId
    );

    if (emailExists) {
      window.alert("A teacher with this email address already exists.");
      return;
    }

    if (editingId) {
      setTeachers((current) =>
        current.map((teacher) =>
          teacher.id === editingId
            ? {
                ...teacher,
                name,
                email,
                designation: form.designation,
                subjects: form.subjects.trim() || "Not assigned",
              }
            : teacher
        )
      );
    } else {
      setTeachers((current) => [
        {
          id: `TCH-${Date.now()}`,
          name,
          email,
          designation: form.designation,
          subjects: form.subjects.trim() || "Not assigned",
          classes: 0,
          status: "active",
          joined: new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        },
        ...current,
      ]);
    }

    closeModal();
  };

  const handleDeleteTeacher = (teacher) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${teacher.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setTeachers((current) =>
      current.filter((item) => item.id !== teacher.id)
    );
  };

  const toggleStatus = (teacherId) => {
    setTeachers((current) =>
      current.map((teacher) =>
        teacher.id === teacherId
          ? {
              ...teacher,
              status:
                teacher.status === "active" ? "deactivated" : "active",
            }
          : teacher
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
          <h2 className="hod-page-title">Manage Teachers</h2>
          <p className="hod-page-subtitle">
            Manage department faculty, subject assignments, class loads and
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
            Add Teacher
          </button>
        </div>
      </div>

      <section className="hod-kpi-grid">
        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Total Faculty</div>
            <div className="hod-kpi-value">{teachers.length}</div>
            <div className="hod-kpi-description">Department teachers</div>
          </div>
          <div className="hod-kpi-icon blue">
            <Users size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Active Teachers</div>
            <div className="hod-kpi-value">{activeCount}</div>
            <div className="hod-kpi-description">Currently active</div>
          </div>
          <div className="hod-kpi-icon green">
            <CheckCircle2 size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Deactivated</div>
            <div className="hod-kpi-value">{inactiveCount}</div>
            <div className="hod-kpi-description">Inactive accounts</div>
          </div>
          <div className="hod-kpi-icon maroon">
            <UserRound size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Total Classes</div>
            <div className="hod-kpi-value">
              {teachers.reduce(
                (sum, teacher) => sum + Number(teacher.classes || 0),
                0
              )}
            </div>
            <div className="hod-kpi-description">Faculty class allocation</div>
          </div>
          <div className="hod-kpi-icon orange">
            <BookOpen size={21} />
          </div>
        </article>
      </section>

      <section className="hod-panel">
        <div className="hod-panel-header">
          <div>
            <h3>Faculty Directory</h3>
            <p>View and manage all department teachers</p>
          </div>

          <span className="hod-status info">
            {filteredTeachers.length} Records
          </span>
        </div>

        <div
          className="hod-toolbar"
          style={{ padding: "15px 18px", marginBottom: 0 }}
        >
          <div className="hod-toolbar-left" style={{ flex: 1 }}>
            <div
              className="hod-search"
              style={{ width: "100%", maxWidth: 370 }}
            >
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email or subject..."
                aria-label="Search teachers"
              />
            </div>
          </div>

          <div className="hod-toolbar-right">
            <select
              className="hod-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        <div className="hod-table-wrapper">
          <table className="hod-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Designation</th>
                <th>Subject</th>
                <th>Classes</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredTeachers.map((teacher) => {
                const statusVariant = getStatusVariant(teacher.status);

                return (
                  <tr key={teacher.id}>
                    <td>
                      <div className="hod-person">
                        <div className="hod-avatar">
                          {teacher.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong>{teacher.name}</strong>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              overflowWrap: "anywhere",
                            }}
                          >
                            <Mail size={11} />
                            {teacher.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{teacher.designation}</td>
                    <td>{teacher.subjects}</td>

                    <td>
                      <span className="hod-status neutral">
                        {teacher.classes} Classes
                      </span>
                    </td>

                    <td>
                      <span className={`hod-status ${statusVariant}`}>
                        {formatStatus(teacher.status)}
                      </span>
                    </td>

                    <td>{teacher.joined}</td>

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
                          onClick={() => openEditModal(teacher)}
                          title="Edit teacher"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`hod-btn hod-btn-sm ${
                            teacher.status === "active"
                              ? "hod-btn-danger"
                              : "hod-btn-success"
                          }`}
                          onClick={() => toggleStatus(teacher.id)}
                        >
                          {teacher.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="hod-btn hod-btn-sm hod-btn-danger"
                          onClick={() => handleDeleteTeacher(teacher)}
                          title="Delete teacher"
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

          {filteredTeachers.length === 0 && (
            <div className="hod-empty">
              <Users size={30} />
              <strong>No teachers found</strong>
              <p>
                No faculty records match your search or selected filter.
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
          Showing {filteredTeachers.length} of {teachers.length} teachers
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
            className="hod-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-modal-title"
          >
            <div className="hod-modal-header">
              <div>
                <h3 id="teacher-modal-title">
                  {editingId ? "Update Teacher" : "Add New Teacher"}
                </h3>
                <p>
                  {editingId
                    ? "Update faculty member details"
                    : "Add a faculty member to the department directory"}
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

            <form onSubmit={handleSaveTeacher}>
              <div className="hod-modal-body">
                <div className="hod-form-grid">
                  <div className="hod-form-group">
                    <label htmlFor="teacher-name">Full Name *</label>
                    <input
                      id="teacher-name"
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
                    <label htmlFor="teacher-email">Email Address *</label>
                    <input
                      id="teacher-email"
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
                    <label htmlFor="teacher-designation">Designation</label>
                    <select
                      id="teacher-designation"
                      value={form.designation}
                      onChange={(event) =>
                        updateForm("designation", event.target.value)
                      }
                    >
                      <option value="Assistant Professor">
                        Assistant Professor
                      </option>
                      <option value="Associate Professor">
                        Associate Professor
                      </option>
                      <option value="Professor">Professor</option>
                    </select>
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="teacher-subject">Primary Subject</label>
                    <input
                      id="teacher-subject"
                      type="text"
                      value={form.subjects}
                      onChange={(event) =>
                        updateForm("subjects", event.target.value)
                      }
                      placeholder="e.g. Data Structures"
                    />
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
                      Update Teacher
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      Add Teacher
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