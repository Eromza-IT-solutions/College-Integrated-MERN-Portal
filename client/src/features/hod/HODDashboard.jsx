import { Link } from "react-router-dom";
import {
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  ArrowRight,
  Users,
  GraduationCap,
  ClipboardCheck,
  Clock3,
  FileCheck,
  FileText,
  UserCheck,
  BarChart3,
  Activity,
} from "lucide-react";

import {
  hodKpis,
  hodAttendanceSeries,
  hodProgramPerformance,
  hodFacultyWorkload,
  hodPendingApprovals,
  hodActivities,
  hodDepartment,
} from "../../mocks/hodData";

const icons = {
  students: Users,
  faculty: GraduationCap,
  attendance: ClipboardCheck,
  approvals: FileCheck,
};

const activityIcons = {
  attendance: ClipboardCheck,
  approval: FileCheck,
  request: UserCheck,
  report: FileText,
};

const kpiColors = ["blue", "maroon", "green", "orange"];

const chartColors = [
  "#14264B",
  "#A8212F",
  "#D2A72C",
  "#6A8DBB",
  "#2C9271",
  "#8B70B5",
];

export default function HODDashboard() {
  const attendanceValues = Array.isArray(hodAttendanceSeries?.values)
    ? hodAttendanceSeries.values
    : [];

  const attendanceLabels = Array.isArray(hodAttendanceSeries?.labels)
    ? hodAttendanceSeries.labels
    : [];

  const maxAttendance = Math.max(100, ...attendanceValues);

  return (
    <div>
      {/* PAGE HEADING */}
      <div className="hod-page-head">
        <div>
          <h2 className="hod-page-title">
            Head of Department Dashboard
          </h2>

          <p className="hod-page-subtitle">
            <Sparkles
              size={13}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 5,
                color: "#A8212F",
              }}
            />
            Department leadership · Academic year 2026–27
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 13px",
            background: "#fff",
            border: "1px solid #e8ebf1",
            borderRadius: 8,
            color: "#14264B",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <CalendarDays size={15} color="#A8212F" />
          Odd Semester · 2026–27
        </div>
      </div>

      {/* HERO BANNER */}
      <section className="hod-hero">
        <div className="hod-hero-content">
          <span>
            <GraduationCap
              size={14}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 6,
              }}
            />
            Academic Leadership
          </span>

          <h2>{hodDepartment.name}</h2>

          <p>
            Lead with insight. Monitor academic performance, support
            faculty, review requests and keep every programme moving
            forward.
          </p>
        </div>

        <div className="hod-hero-actions">
          <Link
            to="/hod/teachers"
            className="hod-btn hod-btn-primary"
          >
            Manage Faculty
            <ArrowRight size={14} />
          </Link>

          <Link
            to="/hod/reports"
            className="hod-btn hod-btn-secondary"
          >
            Department Reports
            <BarChart3 size={14} />
          </Link>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="hod-kpi-grid">
        {hodKpis.map((item, index) => {
          const Icon = icons[item.icon] || Users;
          const color = kpiColors[index % kpiColors.length];

          return (
            <article className="hod-kpi-card" key={item.id}>
              <div>
                <div className="hod-kpi-label">
                  {item.label}
                </div>

                <div className="hod-kpi-value">
                  {item.value}
                </div>

                <div className="hod-kpi-description">
                  {item.change || "Department overview"}
                </div>
              </div>

              <div className={`hod-kpi-icon ${color}`}>
                <Icon size={21} />
              </div>
            </article>
          );
        })}
      </section>

      {/* ATTENDANCE + PROGRAMME PERFORMANCE */}
      <section className="hod-grid-2">
        {/* ATTENDANCE CHART */}
        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Student Attendance Trend</h3>
              <p>
                Average attendance across the last six months
              </p>
            </div>

            <Activity size={19} color="#A8212F" />
          </div>

          {attendanceValues.length > 0 ? (
            <>
              <div
                style={{
                  height: 205,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 13,
                  padding: "12px 5px 0",
                  borderBottom: "1px solid #e8ebf1",
                  backgroundImage:
                    "linear-gradient(to bottom, transparent 24%, #edf0f5 25%, transparent 25.5%, transparent 49%, #edf0f5 50%, transparent 50.5%, transparent 74%, #edf0f5 75%, transparent 75.5%)",
                }}
              >
                {attendanceValues.map((value, index) => (
                  <div
                    key={`${attendanceLabels[index] || index}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <strong
                      style={{
                        color: "#14264B",
                        fontSize: 10,
                      }}
                    >
                      {value}%
                    </strong>

                    <div
                      style={{
                        width: "min(100%, 35px)",
                        height: `${Math.max(
                          4,
                          (Number(value) / maxAttendance) * 145
                        )}px`,
                        minHeight: 4,
                        background:
                          chartColors[index % chartColors.length],
                        borderRadius: "5px 5px 0 0",
                        transition: "height 0.4s ease",
                      }}
                    />

                    <span
                      style={{
                        color: "#8993A5",
                        fontSize: 10,
                        paddingBottom: 8,
                      }}
                    >
                      {attendanceLabels[index] || `Month ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  color: "#8993A5",
                  fontSize: 10,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    display: "inline-block",
                    background: "#14264B",
                    borderRadius: 2,
                  }}
                />
                Monthly average attendance (%)
              </div>
            </>
          ) : (
            <div className="hod-empty">
              <BarChart3 size={27} />
              <strong>No attendance data available</strong>
              <p>Attendance statistics will appear here.</p>
            </div>
          )}
        </article>

        {/* PROGRAMME PERFORMANCE */}
        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Programme Performance</h3>
              <p>Academic performance by programme</p>
            </div>

            <GraduationCap size={20} color="#A8212F" />
          </div>

          <div className="hod-list">
            {hodProgramPerformance.map((item, index) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                <div className="hod-list-item">
                  <strong>{item.label}</strong>
                  <strong style={{ color: "#14264B" }}>
                    {item.value}%
                  </strong>
                </div>

                <div className="hod-progress">
                  <div
                    className="hod-progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, Number(item.value) || 0)
                      )}%`,
                      background:
                        chartColors[index % chartColors.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 23,
              padding: 13,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: "#fff7e7",
              border: "1px solid #f5e8c6",
              borderRadius: 8,
              color: "#795d20",
              fontSize: 10,
              lineHeight: 1.6,
            }}
          >
            <Clock3 size={17} style={{ flexShrink: 0 }} />

            <span>
              <strong>Department Focus:</strong> Keep attendance
              above the institutional target and clear pending reviews.
            </span>
          </div>
        </article>
      </section>

      {/* APPROVALS + FACULTY WORKLOAD */}
      <section className="hod-grid-2">
        {/* PENDING APPROVALS */}
        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Pending Approvals</h3>
              <p>Requests awaiting department review</p>
            </div>

            <Link to="/hod/teachers">
              Review Requests <ArrowUpRight size={13} />
            </Link>
          </div>

          {hodPendingApprovals.length > 0 ? (
            <div className="hod-table-wrapper">
              <table className="hod-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Requester</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {hodPendingApprovals.slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="hod-table-primary">
                          {row.type}
                        </span>

                        <span className="hod-table-secondary">
                          {row.id} · {row.detail}
                        </span>
                      </td>

                      <td>{row.requester}</td>
                      <td>{row.submitted}</td>

                      <td>
                        <span
                          className={`hod-status ${
                            String(row.status).toLowerCase() === "pending"
                              ? "pending"
                              : String(row.status).toLowerCase() ===
                                  "approved"
                                ? "approved"
                                : "processing"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hod-empty">
              <FileCheck size={27} />
              <strong>No pending requests</strong>
              <p>There are no requests to display.</p>
            </div>
          )}
        </article>

        {/* FACULTY WORKLOAD */}
        <article className="hod-panel">
          <div className="hod-panel-header">
            <div>
              <h3>Faculty Workload</h3>
              <p>Weekly teaching hours by faculty</p>
            </div>

            <Link to="/hod/teachers">
              Manage Faculty <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="hod-list">
            {hodFacultyWorkload.slice(0, 5).map((item, index) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                <div className="hod-list-item">
                  <strong>{item.label}</strong>
                  <span>
                    <strong style={{ color: "#14264B" }}>
                      {item.value} hrs
                    </strong>
                  </span>
                </div>

                <div className="hod-progress">
                  <div
                    className="hod-progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (Number(item.value) / 20) * 100)
                      )}%`,
                      background:
                        chartColors[index % chartColors.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* DEPARTMENT ACTIVITY */}
      <section className="hod-panel">
        <div className="hod-panel-header">
          <div>
            <h3>Department Activity</h3>
            <p>Latest department actions and updates</p>
          </div>

          <ClipboardCheck size={19} color="#A8212F" />
        </div>

        {hodActivities.length > 0 ? (
          <div className="hod-grid-3" style={{ marginBottom: 0 }}>
            {hodActivities.slice(0, 3).map((item) => {
              const Icon = activityIcons[item.icon] || FileText;

              return (
                <div
                  key={item.id}
                  style={{
                    minHeight: 88,
                    padding: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    background: "#f8f9fc",
                    border: "1px solid #edf0f5",
                    borderRadius: 9,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      color: "#A8212F",
                      background: "#fff0f1",
                      borderRadius: 8,
                    }}
                  >
                    <Icon size={16} />
                  </div>

                  <div>
                    <strong
                      style={{
                        display: "block",
                        color: "#26344D",
                        fontSize: 11,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.title}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: 6,
                        color: "#8993A5",
                        fontSize: 10,
                      }}
                    >
                      {item.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hod-empty">
            <Activity size={27} />
            <strong>No recent activities</strong>
            <p>Department updates will appear here.</p>
          </div>
        )}
      </section>

      {/* DATA NOTE */}
      <div
        style={{
          marginTop: 17,
          padding: "11px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#8993A5",
          background: "#fff",
          border: "1px solid #e8ebf1",
          borderRadius: 8,
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        <FileText size={13} color="#A8212F" />

        Dashboard figures currently use project preview data.
        Backend integration can replace these values without changing
        the visual layout.
      </div>
    </div>
  );
}