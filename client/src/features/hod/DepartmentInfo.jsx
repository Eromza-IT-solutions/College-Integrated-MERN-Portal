import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Users,
  CalendarDays,
  ArrowRight,
  BookOpen,
  UserRound,
  Pencil,
  Trash2,
  Plus,
  X,
} from "lucide-react";

import {
  hodDepartment,
  hodKpis,
  hodTeachers,
} from "../../mocks/hodData";

import { downloadCsv } from "../../utils/csv";

const EMPTY_PROGRAM = {
  name: "",
  level: "Undergraduate",
  duration: "3 Years",
  students: 0,
};

export default function DepartmentInfo() {
  const [department, setDepartment] = useState({ ...hodDepartment });
  const [programs, setPrograms] = useState(
    hodDepartment.programs.map((program) => ({ ...program }))
  );

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [programModalOpen, setProgramModalOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: hodDepartment.name || "",
    code: hodDepartment.code || "",
    hod: hodDepartment.hod || "",
    email: hodDepartment.email || "",
    phone: hodDepartment.phone || "",
    location: hodDepartment.location || "",
    description: hodDepartment.description || "",
    established: hodDepartment.established || "",
  });

  const [programForm, setProgramForm] = useState(EMPTY_PROGRAM);
  const [editingProgramId, setEditingProgramId] = useState(null);

  const totalStudents = useMemo(
    () =>
      programs.reduce(
        (sum, program) => sum + Number(program.students || 0),
        0
      ),
    [programs]
  );

  const handleExport = () => {
    downloadCsv("eromza-department-profile.csv", [
      ["Field", "Value"],
      ["Department", department.name],
      ["Code", department.code],
      ["HOD", department.hod],
      ["Email", department.email],
      ["Phone", department.phone],
      ["Location", department.location],
      ["Established", department.established],
      ["Description", department.description],
      ["Programmes", programs.length],
      ["Students", totalStudents],
      ["Faculty", hodTeachers.length],
      [],
      ["Programme ID", "Programme", "Level", "Duration", "Students"],
      ...programs.map((program) => [
        program.id,
        program.name,
        program.level,
        program.duration,
        program.students,
      ]),
    ]);
  };

  const contactItems = [
    {
      icon: Mail,
      label: "Official Email",
      value: department.email,
    },
    {
      icon: Phone,
      label: "Contact Number",
      value: department.phone,
    },
    {
      icon: MapPin,
      label: "Department Location",
      value: department.location,
    },
  ];

  const openProfileModal = () => {
    setProfileForm({
      name: department.name || "",
      code: department.code || "",
      hod: department.hod || "",
      email: department.email || "",
      phone: department.phone || "",
      location: department.location || "",
      description: department.description || "",
      established: department.established || "",
    });

    setProfileModalOpen(true);
  };

  const handleProfileUpdate = (event) => {
    event.preventDefault();

    if (
      !profileForm.name.trim() ||
      !profileForm.code.trim() ||
      !profileForm.hod.trim() ||
      !profileForm.email.trim()
    ) {
      window.alert("Please fill all required department details.");
      return;
    }

    setDepartment({
      ...department,
      ...profileForm,
      name: profileForm.name.trim(),
      code: profileForm.code.trim(),
      hod: profileForm.hod.trim(),
      email: profileForm.email.trim(),
    });

    setProfileModalOpen(false);
  };

  const openAddProgram = () => {
    setEditingProgramId(null);
    setProgramForm(EMPTY_PROGRAM);
    setProgramModalOpen(true);
  };

  const openEditProgram = (program) => {
    setEditingProgramId(program.id);

    setProgramForm({
      name: program.name || "",
      level: program.level || "Undergraduate",
      duration: program.duration || "3 Years",
      students: Number(program.students || 0),
    });

    setProgramModalOpen(true);
  };

  const closeProgramModal = () => {
    setProgramModalOpen(false);
    setEditingProgramId(null);
    setProgramForm(EMPTY_PROGRAM);
  };

  const handleSaveProgram = (event) => {
    event.preventDefault();

    const name = programForm.name.trim();

    if (!name) {
      window.alert("Please enter the programme name.");
      return;
    }

    const duplicate = programs.some(
      (program) =>
        program.name.toLowerCase() === name.toLowerCase() &&
        program.id !== editingProgramId
    );

    if (duplicate) {
      window.alert("This programme already exists.");
      return;
    }

    const students = Number(programForm.students);

    if (!Number.isFinite(students) || students < 0) {
      window.alert("Please enter a valid student count.");
      return;
    }

    if (editingProgramId) {
      setPrograms((current) =>
        current.map((program) =>
          program.id === editingProgramId
            ? {
                ...program,
                name,
                level: programForm.level,
                duration: programForm.duration,
                students,
              }
            : program
        )
      );
    } else {
      setPrograms((current) => [
        ...current,
        {
          id: `PRG-${Date.now()}`,
          name,
          level: programForm.level,
          duration: programForm.duration,
          students,
        },
      ]);
    }

    closeProgramModal();
  };

  const handleDeleteProgram = (program) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${program.name}?`
    );

    if (!confirmed) return;

    setPrograms((current) =>
      current.filter((item) => item.id !== program.id)
    );
  };

  const updateProfileForm = (field, value) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateProgramForm = (field, value) => {
    setProgramForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div>
      <div className="hod-page-head">
        <div>
          <h2 className="hod-page-title">Department Information</h2>
          <p className="hod-page-subtitle">
            Review department details, programmes, faculty strength and
            student population.
          </p>
        </div>

        <div className="hod-toolbar-right">
          <button
            type="button"
            className="hod-btn hod-btn-secondary"
            onClick={handleExport}
          >
            <Download size={15} />
            Download Profile
          </button>

          <button
            type="button"
            className="hod-btn hod-btn-primary"
            onClick={openProfileModal}
          >
            <Pencil size={15} />
            Edit Department
          </button>

          <Link
            to="/hod/teachers"
            className="hod-btn hod-btn-secondary"
          >
            <Users size={15} />
            Manage Teachers
          </Link>
        </div>
      </div>

      <section className="hod-panel" style={{ marginBottom: 22 }}>
        <div className="hod-grid-main" style={{ marginBottom: 0 }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 15,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  color: "#A8212F",
                  background: "#fff0f1",
                  borderRadius: 11,
                }}
              >
                <Building2 size={25} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 9,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "#14264B",
                      fontSize: 19,
                      fontWeight: 800,
                    }}
                  >
                    {department.name}
                  </h3>

                  <span className="hod-status info">
                    {department.code}
                  </span>
                </div>

                <p
                  style={{
                    margin: "9px 0 0",
                    color: "#8993A5",
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  {department.description}
                </p>
              </div>
            </div>

            <div
              className="hod-grid-2"
              style={{ marginTop: 22, marginBottom: 0 }}
            >
              <div className="hod-info-card">
                <div className="hod-info-label">
                  Head of Department
                </div>
                <div className="hod-info-value">
                  {department.hod}
                </div>
              </div>

              <div className="hod-info-card">
                <div className="hod-info-label">Established</div>
                <div className="hod-info-value">
                  {department.established}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="hod-section-heading">
              <h2>Contact Information</h2>
            </div>

            <div className="hod-list">
              {contactItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 13,
                      border: "1px solid #e8ebf1",
                      borderRadius: 9,
                    }}
                  >
                    <div
                      style={{
                        width: 35,
                        height: 35,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        color: "#14264B",
                        background: "#edf2fa",
                        borderRadius: 8,
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          marginBottom: 4,
                          color: "#8993A5",
                          fontSize: 10,
                        }}
                      >
                        {item.label}
                      </span>

                      <strong
                        style={{
                          display: "block",
                          overflowWrap: "anywhere",
                          color: "#26344D",
                          fontSize: 11,
                        }}
                      >
                        {item.value}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="hod-section-heading">
        <div>
          <h2>Department Overview</h2>
          <p>Current department statistics</p>
        </div>
      </div>

      <section className="hod-kpi-grid">
        {hodKpis.map((kpi, index) => {
          const statValue =
            kpi.id === "students" ? totalStudents : kpi.value;

          const statIcons = [
            Users,
            GraduationCap,
            BookOpen,
            CalendarDays,
          ];

          const statColors = [
            "blue",
            "maroon",
            "green",
            "orange",
          ];

          const Icon = statIcons[index % statIcons.length];

          return (
            <article className="hod-kpi-card" key={kpi.id}>
              <div>
                <div className="hod-kpi-label">{kpi.label}</div>
                <div className="hod-kpi-value">{statValue}</div>
                <div className="hod-kpi-description">
                  {kpi.change || "Department overview"}
                </div>
              </div>

              <div
                className={`hod-kpi-icon ${
                  statColors[index % statColors.length]
                }`}
              >
                <Icon size={21} />
              </div>
            </article>
          );
        })}
      </section>

      <section className="hod-grid-main">
        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Programmes Offered</h3>
              <p>Undergraduate and postgraduate programmes</p>
            </div>

            <div className="hod-toolbar-right">
              <span className="hod-status info">
                {programs.length} Programmes
              </span>

              <button
                type="button"
                className="hod-btn hod-btn-primary hod-btn-sm"
                onClick={openAddProgram}
              >
                <Plus size={14} />
                Add Programme
              </button>
            </div>
          </div>

          <div className="hod-list">
            {programs.length > 0 ? (
              programs.map((program) => (
                <div
                  key={program.id}
                  style={{
                    padding: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 13,
                    background: "#fafbfe",
                    border: "1px solid #e8ebf1",
                    borderRadius: 9,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 39,
                        height: 39,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        color: "#14264B",
                        background: "#edf2fa",
                        borderRadius: 9,
                      }}
                    >
                      <GraduationCap size={19} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          color: "#14264B",
                          fontSize: 12,
                        }}
                      >
                        {program.name}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: 5,
                          color: "#8993A5",
                          fontSize: 10,
                        }}
                      >
                        {program.level} · {program.duration}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <strong
                        style={{
                          display: "block",
                          color: "#14264B",
                          fontSize: 15,
                        }}
                      >
                        {program.students}
                      </strong>

                      <span
                        style={{
                          color: "#8993A5",
                          fontSize: 9,
                        }}
                      >
                        Students
                      </span>
                    </div>

                    <button
                      type="button"
                      className="hod-btn hod-btn-secondary hod-btn-sm"
                      onClick={() => openEditProgram(program)}
                      title="Edit programme"
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      className="hod-btn hod-btn-danger hod-btn-sm"
                      onClick={() => handleDeleteProgram(program)}
                      title="Delete programme"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="hod-empty">
                <GraduationCap size={28} />
                <strong>No programmes available</strong>
                <p>Add a programme to get started.</p>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 17,
              padding: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              background: "#edf2fa",
              borderRadius: 8,
            }}
          >
            <span
              style={{
                color: "#14264B",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Total Student Population
            </span>

            <strong
              style={{
                color: "#A8212F",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {totalStudents}
            </strong>
          </div>
        </article>

        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Faculty Overview</h3>
              <p>Current department faculty</p>
            </div>

            <GraduationCap size={20} color="#A8212F" />
          </div>

          {hodTeachers.length > 0 ? (
            <div className="hod-list">
              {hodTeachers.slice(0, 4).map((teacher) => (
                <div
                  key={teacher.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom: "1px solid #edf0f4",
                  }}
                >
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
                      <span>{teacher.designation}</span>
                    </div>
                  </div>

                  <span
                    className="hod-status neutral"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {teacher.classes} Classes
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="hod-empty">
              <UserRound size={27} />
              <strong>No faculty records</strong>
              <p>Faculty details will appear here.</p>
            </div>
          )}

          <Link
            to="/hod/teachers"
            className="hod-btn hod-btn-secondary"
            style={{
              width: "100%",
              marginTop: 19,
            }}
          >
            View All Faculty
            <ArrowRight size={14} />
          </Link>
        </article>
      </section>

      <div
        style={{
          marginTop: 18,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 9,
          color: "#8993A5",
          background: "#fff",
          border: "1px solid #e8ebf1",
          borderRadius: 8,
          fontSize: 10,
        }}
      >
        <Download size={14} color="#A8212F" />
        Department profile can be exported as a CSV file for records.
      </div>

      {profileModalOpen && (
        <div
          className="hod-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProfileModalOpen(false);
            }
          }}
        >
          <div
            className="hod-modal hod-modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-modal-title"
          >
            <div className="hod-modal-header">
              <div>
                <h3 id="department-modal-title">
                  Edit Department Information
                </h3>
                <p>Update department profile details</p>
              </div>

              <button
                type="button"
                className="hod-modal-close"
                onClick={() => setProfileModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="hod-modal-body">
                <div className="hod-form-grid">
                  <div className="hod-form-group">
                    <label htmlFor="department-name">
                      Department Name *
                    </label>
                    <input
                      id="department-name"
                      value={profileForm.name}
                      onChange={(event) =>
                        updateProfileForm("name", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="department-code">
                      Department Code *
                    </label>
                    <input
                      id="department-code"
                      value={profileForm.code}
                      onChange={(event) =>
                        updateProfileForm("code", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="department-hod">
                      Head of Department *
                    </label>
                    <input
                      id="department-hod"
                      value={profileForm.hod}
                      onChange={(event) =>
                        updateProfileForm("hod", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="department-email">
                      Official Email *
                    </label>
                    <input
                      id="department-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        updateProfileForm("email", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="department-phone">Phone</label>
                    <input
                      id="department-phone"
                      value={profileForm.phone}
                      onChange={(event) =>
                        updateProfileForm("phone", event.target.value)
                      }
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="department-location">Location</label>
                    <input
                      id="department-location"
                      value={profileForm.location}
                      onChange={(event) =>
                        updateProfileForm("location", event.target.value)
                      }
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="department-established">
                      Established
                    </label>
                    <input
                      id="department-established"
                      value={profileForm.established}
                      onChange={(event) =>
                        updateProfileForm("established", event.target.value)
                      }
                    />
                  </div>

                  <div className="hod-form-group" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="department-description">
                      Department Description
                    </label>
                    <textarea
                      id="department-description"
                      rows={3}
                      value={profileForm.description}
                      onChange={(event) =>
                        updateProfileForm("description", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="hod-modal-footer">
                <button
                  type="button"
                  className="hod-btn hod-btn-secondary"
                  onClick={() => setProfileModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="hod-btn hod-btn-primary"
                >
                  <Pencil size={15} />
                  Update Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {programModalOpen && (
        <div
          className="hod-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProgramModal();
          }}
        >
          <div
            className="hod-modal hod-modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-modal-title"
          >
            <div className="hod-modal-header">
              <div>
                <h3 id="program-modal-title">
                  {editingProgramId ? "Edit Programme" : "Add Programme"}
                </h3>
                <p>Manage department programme details</p>
              </div>

              <button
                type="button"
                className="hod-modal-close"
                onClick={closeProgramModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgram}>
              <div className="hod-modal-body">
                <div className="hod-form-grid">
                  <div className="hod-form-group">
                    <label htmlFor="program-name">Programme Name *</label>
                    <input
                      id="program-name"
                      value={programForm.name}
                      onChange={(event) =>
                        updateProgramForm("name", event.target.value)
                      }
                      placeholder="Enter programme name"
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="program-level">Programme Level</label>
                    <select
                      id="program-level"
                      value={programForm.level}
                      onChange={(event) =>
                        updateProgramForm("level", event.target.value)
                      }
                    >
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Postgraduate">Postgraduate</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Certificate">Certificate</option>
                    </select>
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="program-duration">Duration</label>
                    <input
                      id="program-duration"
                      value={programForm.duration}
                      onChange={(event) =>
                        updateProgramForm("duration", event.target.value)
                      }
                      placeholder="e.g. 3 Years"
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="program-students">Student Count</label>
                    <input
                      id="program-students"
                      type="number"
                      min="0"
                      value={programForm.students}
                      onChange={(event) =>
                        updateProgramForm("students", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="hod-modal-footer">
                <button
                  type="button"
                  className="hod-btn hod-btn-secondary"
                  onClick={closeProgramModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="hod-btn hod-btn-primary"
                >
                  {editingProgramId ? (
                    <>
                      <Pencil size={15} />
                      Update Programme
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      Add Programme
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