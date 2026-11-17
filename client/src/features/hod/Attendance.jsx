import { useMemo, useState } from "react";

import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Clock,
  Download,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import ProgressRing from "../../components/charts/ProgressRing";
import TrendChart from "../../components/charts/TrendChart";

import {
  hodAttendanceRows,
  hodAttendanceSeries,
} from "../../mocks/hodData";

import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const emptyForm = {
  className: "",
  faculty: "",
  students: "",
  present: "",
  status: "submitted",
};

export default function Attendance() {
  const [attendanceRows, setAttendanceRows] = useState(
    hodAttendanceRows
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const totalClasses = attendanceRows.length;

  const average = useMemo(() => {
    return totalClasses > 0
      ? Math.round(
          (attendanceRows.reduce(
            (sum, row) => sum + Number(row.attendance || 0),
            0
          ) / totalClasses) * 10
        ) / 10
      : 0;
  }, [attendanceRows, totalClasses]);

  const pending = attendanceRows.filter(
    (row) => row.status === "pending"
  ).length;

  const reporting = totalClasses - pending;

  const belowThreshold = attendanceRows.filter(
    (row) => Number(row.attendance) < 75
  ).length;

  const totalStudents = attendanceRows.reduce(
    (sum, row) => sum + Number(row.students || 0),
    0
  );

  const totalPresent = attendanceRows.reduce(
    (sum, row) => sum + Number(row.present || 0),
    0
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      className: row.className || "",
      faculty: row.faculty || "",
      students: String(row.students ?? ""),
      present: String(row.present ?? ""),
      status: row.status || "submitted",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = (event) => {
    event.preventDefault();

    const className = form.className.trim();
    const faculty = form.faculty.trim();
    const students = Number(form.students);
    const present = Number(form.present);

    if (!className || !faculty || !form.students || !form.present) {
      setError("Please fill in all required fields.");
      return;
    }

    if (
      !Number.isInteger(students) ||
      !Number.isInteger(present) ||
      students <= 0 ||
      present < 0 ||
      present > students
    ) {
      setError(
        "Enter valid student numbers. Present students cannot exceed total students."
      );
      return;
    }

    const attendance = Math.round((present / students) * 1000) / 10;

    const duplicateClass = attendanceRows.some(
      (row) =>
        row.className.trim().toLowerCase() === className.toLowerCase() &&
        row.id !== editingId
    );

    if (duplicateClass) {
      setError("A record for this class already exists.");
      return;
    }

    const record = {
      id: editingId || `ATT-${Date.now()}`,
      className,
      faculty,
      students,
      present,
      attendance,
      status: form.status,
    };

    if (editingId) {
      setAttendanceRows((previous) =>
        previous.map((row) =>
          row.id === editingId ? record : row
        )
      );
    } else {
      setAttendanceRows((previous) => [
        record,
        ...previous,
      ]);
    }

    closeModal();
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this attendance record?"
    );

    if (!confirmed) return;

    setAttendanceRows((previous) =>
      previous.filter((row) => row.id !== id)
    );
  };

  const handleExport = () => {
    downloadCsv("eromza-department-attendance.csv", [
      [
        "Class",
        "Faculty",
        "Students",
        "Present",
        "Attendance",
        "Status",
      ],
      ...attendanceRows.map((row) => [
        row.className,
        row.faculty,
        row.students,
        row.present,
        `${row.attendance}%`,
        row.status,
      ]),
    ]);
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="hod-page-head">
        <div>
          <h2 className="hod-page-title">Attendance Management</h2>
          <p className="hod-page-subtitle">
            Monitor class-wise attendance, faculty submissions and
            attendance performance across the department.
          </p>
        </div>

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button
            type="button"
            className="hod-btn hod-btn-primary"
            onClick={openAddModal}
          >
            <Plus size={15} />
            Add Attendance
          </button>

          <button
            type="button"
            className="hod-btn hod-btn-secondary"
            onClick={handleExport}
          >
            <Download size={15} />
            Export Attendance
          </button>
        </div>
      </div>

      {/* ATTENDANCE SUMMARY */}
      <section className="hod-kpi-grid">
        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Average Attendance</div>
            <div className="hod-kpi-value">{average}%</div>
            <div className="hod-kpi-description">
              Department class average
            </div>
          </div>

          <div className="hod-kpi-icon green">
            <ClipboardCheck size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Classes Reporting</div>
            <div className="hod-kpi-value">
              {reporting}/{totalClasses}
            </div>
            <div className="hod-kpi-description">
              Faculty submissions received
            </div>
          </div>

          <div className="hod-kpi-icon blue">
            <BookOpen size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Classes Below 75%</div>
            <div className="hod-kpi-value">{belowThreshold}</div>
            <div className="hod-kpi-description">
              Require attendance review
            </div>
          </div>

          <div className="hod-kpi-icon orange">
            <AlertTriangle size={21} />
          </div>
        </article>

        <article className="hod-kpi-card">
          <div>
            <div className="hod-kpi-label">Pending Submissions</div>
            <div className="hod-kpi-value">{pending}</div>
            <div className="hod-kpi-description">
              Awaiting faculty submission
            </div>
          </div>

          <div className="hod-kpi-icon maroon">
            <Clock size={21} />
          </div>
        </article>
      </section>

      {/* ATTENDANCE CHARTS */}
      <section className="hod-grid-main">
        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Attendance Trend</h3>
              <p>
                Average department attendance across the last six months
              </p>
            </div>

            <span className="hod-status success">
              Monthly Trend
            </span>
          </div>

          <div style={{ padding: "18px" }}>
            <TrendChart
              labels={hodAttendanceSeries.labels}
              values={hodAttendanceSeries.values}
              color="#14264B"
              ariaLabel="Department attendance trend"
            />
          </div>
        </article>

        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Attendance Health</h3>
              <p>Current department attendance average</p>
            </div>

            <ClipboardCheck size={20} color="#A8212F" />
          </div>

          <div style={{ padding: "18px" }}>
            <ProgressRing
              value={average}
              label="Present"
              caption="Average attendance across all recorded department classes."
            />

            <div
              style={{
                marginTop: 22,
                padding: 14,
                background: "#fff8e8",
                border: "1px solid #f4e4b7",
                borderRadius: 9,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#9A6A08",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <AlertTriangle size={15} />
                Attendance Attention
              </div>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#806C45",
                  fontSize: 11,
                  lineHeight: 1.7,
                }}
              >
                {belowThreshold} recorded classes are below the 75%
                attendance threshold and may require follow-up.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* ATTENDANCE OVERVIEW */}
      <section className="hod-grid-2">
        <div className="hod-info-card">
          <div className="hod-info-label">
            <Users
              size={14}
              style={{ display: "inline", marginRight: 6 }}
            />
            Total Students in Recorded Classes
          </div>

          <div className="hod-info-value">{totalStudents}</div>
        </div>

        <div className="hod-info-card">
          <div className="hod-info-label">
            <ClipboardCheck
              size={14}
              style={{ display: "inline", marginRight: 6 }}
            />
            Total Students Present
          </div>

          <div className="hod-info-value">{totalPresent}</div>
        </div>
      </section>

      {/* CLASS ATTENDANCE TABLE */}
      <section className="hod-panel" style={{ marginTop: 22 }}>
        <div className="hod-panel-header">
          <div>
            <h3>Class-wise Attendance</h3>
            <p>
              Attendance submitted by faculty for department classes
            </p>
          </div>

          <span className="hod-status info">
            {totalClasses} Classes
          </span>
        </div>

        <div className="hod-table-wrapper">
          <table className="hod-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Faculty</th>
                <th>Students Present</th>
                <th>Attendance</th>
                <th>Submission Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {attendanceRows.map((row) => {
                const attendanceStatus =
                  Number(row.attendance) >= 85
                    ? "success"
                    : Number(row.attendance) >= 75
                      ? "warning"
                      : "danger";

                return (
                  <tr key={row.id}>
                    <td>
                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "#14264B",
                            fontSize: 11,
                          }}
                        >
                          {row.className}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 4,
                            color: "#8993A5",
                            fontSize: 10,
                          }}
                        >
                          {row.id}
                        </span>
                      </div>
                    </td>

                    <td>{row.faculty}</td>

                    <td>
                      <strong
                        style={{
                          color: "#26344D",
                          fontSize: 11,
                        }}
                      >
                        {row.present}/{row.students}
                      </strong>
                    </td>

                    <td>
                      <span className={`hod-status ${attendanceStatus}`}>
                        {row.attendance}%
                      </span>
                    </td>

                    <td>
                      <span
                        className={`hod-status ${getStatusVariant(
                          row.status
                        )}`}
                      >
                        {formatStatus(row.status)}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button
                          type="button"
                          className="hod-btn hod-btn-secondary"
                          style={{ padding: "6px 9px" }}
                          onClick={() => openEditModal(row)}
                          title="Edit attendance"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          className="hod-btn hod-btn-secondary"
                          style={{
                            padding: "6px 9px",
                            color: "#A8212F",
                          }}
                          onClick={() => handleDelete(row.id)}
                          title="Delete attendance"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {attendanceRows.length === 0 && (
            <div className="hod-empty">
              <ClipboardCheck size={30} />
              <strong>No attendance records</strong>
              <p>Class attendance records will appear here.</p>
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
          Showing {totalClasses} class attendance records
        </div>
      </section>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="hod-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="hod-modal">
            <div className="hod-modal-header">
              <div>
                <h3>
                  {editingId ? "Update Attendance" : "Add Attendance"}
                </h3>
                <p>
                  Enter class attendance details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="hod-form-grid">
                <div className="hod-form-group">
                  <label>Class Name *</label>
                  <input
                    type="text"
                    name="className"
                    value={form.className}
                    onChange={handleChange}
                    placeholder="e.g. B.Com FY"
                    required
                  />
                </div>

                <div className="hod-form-group">
                  <label>Faculty Name *</label>
                  <input
                    type="text"
                    name="faculty"
                    value={form.faculty}
                    onChange={handleChange}
                    placeholder="Enter faculty name"
                    required
                  />
                </div>

                <div className="hod-form-group">
                  <label>Total Students *</label>
                  <input
                    type="number"
                    name="students"
                    value={form.students}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    placeholder="Enter total students"
                    required
                  />
                </div>

                <div className="hod-form-group">
                  <label>Students Present *</label>
                  <input
                    type="number"
                    name="present"
                    value={form.present}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    placeholder="Enter present students"
                    required
                  />
                </div>

                <div className="hod-form-group">
                  <label>Submission Status *</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="submitted">Submitted</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {error && (
                <p
                  style={{
                    color: "#A8212F",
                    fontSize: 12,
                    marginTop: 12,
                  }}
                >
                  {error}
                </p>
              )}

              <div className="hod-modal-actions">
                <button
                  type="button"
                  className="hod-btn hod-btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="hod-btn hod-btn-primary"
                >
                  {editingId ? "Update Attendance" : "Save Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}