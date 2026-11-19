import { useMemo, useState } from "react";
import {
  Download,
  FileBarChart,
  FileText,
  GraduationCap,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
} from "lucide-react";

import { hodReports } from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const EMPTY_FORM = {
  name: "",
  type: "Attendance",
  period: "2026-27",
};

export default function DepartmentReports() {
  const [reports, setReports] = useState(hodReports);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReports = useMemo(() => {
    const search = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !search ||
        report.name.toLowerCase().includes(search) ||
        report.id.toLowerCase().includes(search);

      const matchesType =
        typeFilter === "all" || report.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, query, typeFilter, statusFilter]);

  const pending = reports.filter(
    (report) => report.status === "processing"
  ).length;

  const attendanceReports = reports.filter(
    (report) => report.type === "Attendance"
  ).length;

  const facultyReports = reports.filter(
    (report) => report.type === "Faculty"
  ).length;

  const downloadReport = (report) => {
    downloadCsv(
      `${report.id.toLowerCase()}-${report.type.toLowerCase()}.csv`,
      [
        ["Report", report.name],
        ["Report ID", report.id],
        ["Type", report.type],
        ["Period", report.period],
        ["Generated", report.generated],
        ["Status", report.status],
      ]
    );
  };

  const handleExport = () => {
    downloadCsv("eromza-department-reports.csv", [
      ["ID", "Report", "Type", "Period", "Generated", "Status"],
      ...reports.map((report) => [
        report.id,
        report.name,
        report.type,
        report.period,
        report.generated,
        report.status,
      ]),
    ]);
  };

  const getStatusClass = (status) => {
    const variant = getStatusVariant(status);

    if (["success", "active", "approved"].includes(variant)) {
      return "hod-status-success";
    }

    if (["warning", "pending"].includes(variant)) {
      return "hod-status-warning";
    }

    if (["danger", "rejected", "inactive"].includes(variant)) {
      return "hod-status-danger";
    }

    if (["info", "processing"].includes(variant)) {
      return "hod-status-info";
    }

    return "hod-status-neutral";
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (report) => {
    setEditingId(report.id);
    setForm({
      name: report.name || "",
      type: report.type || "Attendance",
      period: report.period || "2026-27",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSaveReport = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const period = form.period.trim();

    if (!name || !period) {
      window.alert("Please enter report name and period.");
      return;
    }

    if (editingId) {
      setReports((current) =>
        current.map((report) =>
          report.id === editingId
            ? {
                ...report,
                name,
                type: form.type,
                period,
              }
            : report
        )
      );
    } else {
      const newReport = {
        id: `DR-${Date.now()}`,
        name,
        type: form.type,
        period,
        generated: new Date().toLocaleDateString("en-IN"),
        status: "completed",
      };

      setReports((current) => [newReport, ...current]);
    }

    closeModal();
  };

  const handleDeleteReport = (report) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${report.name}"?`
    );

    if (!confirmed) return;

    setReports((current) =>
      current.filter((item) => item.id !== report.id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="hod-page-head">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A8212F]">
            Department Management
          </p>

          <h1 className="hod-page-title">Department Reports</h1>

          <p className="hod-page-subtitle">
            Review and export department attendance, faculty,
            student and examination reports.
          </p>
        </div>

        <div className="hod-hero-actions">
          <button
            type="button"
            className="hod-btn hod-btn-secondary"
            onClick={handleExport}
          >
            <Download size={16} />
            Export All Reports
          </button>

          <button
            type="button"
            className="hod-btn hod-btn-primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Generate Report
          </button>
        </div>
      </div>

      <div className="hod-kpi-grid">
        <div className="hod-kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="hod-kpi-label">Reports Available</p>
              <h2 className="hod-kpi-value">{reports.length}</h2>
              <p className="hod-kpi-description">
                Total department reports
              </p>
            </div>
            <div className="hod-kpi-icon blue">
              <FileBarChart size={21} />
            </div>
          </div>
        </div>

        <div className="hod-kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="hod-kpi-label">Attendance Reports</p>
              <h2 className="hod-kpi-value">{attendanceReports}</h2>
              <p className="hod-kpi-description">
                Attendance records
              </p>
            </div>
            <div className="hod-kpi-icon green">
              <FileText size={21} />
            </div>
          </div>
        </div>

        <div className="hod-kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="hod-kpi-label">Faculty Reports</p>
              <h2 className="hod-kpi-value">{facultyReports}</h2>
              <p className="hod-kpi-description">
                Faculty-related records
              </p>
            </div>
            <div className="hod-kpi-icon maroon">
              <Users size={21} />
            </div>
          </div>
        </div>

        <div className="hod-kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="hod-kpi-label">Processing</p>
              <h2 className="hod-kpi-value">{pending}</h2>
              <p className="hod-kpi-description">
                Reports being processed
              </p>
            </div>
            <div className="hod-kpi-icon orange">
              <GraduationCap size={21} />
            </div>
          </div>
        </div>
      </div>

      <section className="hod-panel">
        <div className="hod-panel-header">
          <div>
            <h2 className="text-base font-bold text-[#14264B]">
              Department Reports
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Reports generated for the current department cycle
            </p>
          </div>

          <span className="hod-status hod-status-info">
            {filteredReports.length} Reports
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
                placeholder="Search report name or ID..."
                aria-label="Search reports"
              />
            </div>
          </div>

          <div className="hod-toolbar-right">
            <select
              className="hod-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filter by report type"
            >
              <option value="all">All Types</option>
              <option value="Attendance">Attendance</option>
              <option value="Faculty">Faculty</option>
              <option value="Student">Student</option>
              <option value="Examination">Examination</option>
            </select>

            <select
              className="hod-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by report status"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="hod-table-wrapper">
          <table className="hod-table">
            <thead>
              <tr>
                <th>Report Details</th>
                <th>Report Type</th>
                <th>Period</th>
                <th>Generated</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBE9F5] text-[#14264B]">
                          <FileText size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#14264B]">
                            {report.name}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {report.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="inline-flex rounded-md bg-[#DBE9F5] px-2.5 py-1 text-xs font-semibold text-[#14264B]">
                        {report.type}
                      </span>
                    </td>

                    <td>
                      <span className="text-xs text-slate-600">
                        {report.period}
                      </span>
                    </td>

                    <td>
                      <span className="text-xs text-slate-600">
                        {report.generated}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`hod-status ${getStatusClass(report.status)}`}
                      >
                        {formatStatus(report.status)}
                      </span>
                    </td>

                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="hod-btn hod-btn-secondary hod-btn-sm"
                          onClick={() => downloadReport(report)}
                          title="Download report details"
                        >
                          <Download size={14} />
                          Download
                        </button>

                        <button
                          type="button"
                          className="hod-btn hod-btn-secondary hod-btn-sm"
                          onClick={() => openEditModal(report)}
                          title="Edit report"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="hod-btn hod-btn-danger hod-btn-sm"
                          onClick={() => handleDeleteReport(report)}
                          title="Delete report"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="hod-empty">
                      <FileBarChart size={30} />
                      <p className="mt-2 font-semibold">
                        No department reports
                      </p>
                      <p className="mt-1 text-xs">
                        No reports match your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-500">
            Showing {filteredReports.length} of {reports.length} department reports
          </p>

          <button
            type="button"
            className="hod-btn hod-btn-secondary hod-btn-sm"
            onClick={handleExport}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </section>

      <div className="hod-info-card">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBE9F5] text-[#14264B]">
            <FileBarChart size={18} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#14264B]">
              Report Information
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Report generation, editing, deletion and downloads currently
              operate on frontend preview data. Downloads contain report
              details only. Actual attendance, faculty, student and
              examination datasets require backend report integration.
            </p>
          </div>
        </div>
      </div>

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
            aria-labelledby="report-modal-title"
          >
            <div className="hod-modal-header">
              <div>
                <h3 id="report-modal-title">
                  {editingId ? "Update Report" : "Generate New Report"}
                </h3>
                <p>
                  {editingId
                    ? "Update department report details"
                    : "Create a department report record"}
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

            <form onSubmit={handleSaveReport}>
              <div className="hod-modal-body">
                <div className="hod-form-grid">
                  <div className="hod-form-group">
                    <label htmlFor="report-name">Report Name *</label>
                    <input
                      id="report-name"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Enter report name"
                      required
                    />
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="report-type">Report Type</label>
                    <select
                      id="report-type"
                      value={form.type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                    >
                      <option value="Attendance">Attendance</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Student">Student</option>
                      <option value="Examination">Examination</option>
                    </select>
                  </div>

                  <div className="hod-form-group">
                    <label htmlFor="report-period">Report Period *</label>
                    <input
                      id="report-period"
                      type="text"
                      value={form.period}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          period: event.target.value,
                        }))
                      }
                      placeholder="e.g. 2026-27"
                      required
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

                <button
                  type="submit"
                  className="hod-btn hod-btn-primary"
                >
                  {editingId ? (
                    <>
                      <Pencil size={15} />
                      Update Report
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      Generate Report
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