import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

import ErrorState from "../../../components/ui/ErrorState";
import Loader from "../../../components/ui/Loader";
import {
  fetchExamForms,
  fetchExamReference,
  fetchExamTickets,
  fetchExams,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import {
  formatDate,
  formatTime,
  programLabel,
  subjectLabel,
} from "../../../utils/examAdmin";
import { formatDateTime } from "../../../utils/format";

import "../../../assets/styles/aisc-premium.css";

const logo = "/aisc-logo.png";

const icons = { sessions: CalendarDays, students: Users, tickets: Ticket, results: Award };
const colors = [
  ["#315FCE", "#EEF3FF", "76%"],
  ["#A8212F", "#F9ECEE", "68%"],
  ["#2C9271", "#EAF7F1", "88%"],
  ["#B58A16", "#FFF7DF", "46%"],
];

export default function ExamAdminDashboard() {
  const exams = useApiData(() => fetchExams());
  const reference = useApiData(() => fetchExamReference());

  const rows = useMemo(() => exams.data ?? [], [exams.data]);
  const subjects = useMemo(() => reference.data?.subjects ?? [], [reference.data]);
  const programs = useMemo(() => reference.data?.programs ?? [], [reference.data]);
  const activeExam =
    rows.find((exam) => exam.status === "open") || rows[0];

  const forms = useApiData(
    () => (activeExam ? fetchExamForms({ examId: activeExam._id }) : Promise.resolve([])),
    activeExam?._id || "none",
  );
  const tickets = useApiData(
    () => (activeExam ? fetchExamTickets(activeExam._id) : Promise.resolve([])),
    activeExam?._id || "none",
  );

  const examRows = useMemo(() => forms.data ?? [], [forms.data]);
  const ticketRows = useMemo(() => tickets.data ?? [], [tickets.data]);

  const kpis = [
    {
      id: "sessions",
      icon: "sessions",
      label: "Active Sessions",
      value: rows.filter((exam) => exam.status === "open").length,
      change: `${rows.length} total`,
    },
    {
      id: "forms",
      icon: "students",
      label: "Exam Forms",
      value: examRows.length,
      change: `${examRows.filter((form) => form.status === "submitted").length} submitted`,
    },
    {
      id: "tickets",
      icon: "tickets",
      label: "Hall Tickets",
      value: ticketRows.length,
      change: `${ticketRows.filter((ticket) => ticket.status === "issued").length} issued`,
    },
    {
      id: "papers",
      icon: "results",
      label: "Papers Scheduled",
      value: activeExam?.schedule?.length ?? 0,
      change: activeExam ? `Semester ${activeExam.semester}` : "No session",
    },
  ];

  const submissionSeries = useMemo(() => {
    const buckets = Array.from({ length: 6 }, () => 0);
    examRows.forEach((form) => {
      const date = new Date(form.submittedAt || form.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const monthsAgo = 5 - Math.min(5, Math.max(0, new Date().getMonth() - date.getMonth()));
      buckets[monthsAgo] += 1;
    });
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const monthLabels = months.map((_, index) => months[(currentMonth - 5 + index + 12) % 12]);
    return { labels: monthLabels, values: buckets };
  }, [examRows]);

  const max = Math.max(1, ...submissionSeries.values);

  const upcoming = useMemo(
    () =>
      [...(activeExam?.schedule ?? [])]
        .filter((item) => item.date)
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
        .slice(0, 5),
    [activeExam?.schedule],
  );

  const recentActivity = useMemo(() => {
    const fromForms = examRows.slice(0, 3).map((form) => ({
      id: `form-${form._id}`,
      icon: FileText,
      title: `Exam form ${String(form.status ?? "submitted")}`,
      time: formatDateTime(form.submittedAt || form.updatedAt),
    }));
    const fromExams = rows.slice(0, 2).map((exam) => ({
      id: `exam-${exam._id}`,
      icon: CalendarDays,
      title: `${exam.name} · ${exam.status}`,
      time: formatDateTime(exam.updatedAt || exam.createdAt),
    }));
    return [...fromForms, ...fromExams].slice(0, 5);
  }, [examRows, rows]);

  const issued = ticketRows.filter((ticket) => ticket.status === "issued").length;
  const readiness = ticketRows.length ? Math.round((issued / ticketRows.length) * 100) : 0;

  if (exams.loading || reference.loading) {
    return <Loader label="Loading examination dashboard..." />;
  }

  if (exams.error || reference.error) {
    return (
      <ErrorState
        title="Could not load the examination dashboard"
        description={exams.error?.message || reference.error?.message}
        onRetry={() => {
          exams.reload();
          reference.reload();
        }}
      />
    );
  }

  return (
    <div className="aisc-premium">
      <div className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13} /> Examination Cell · Academic year 2026–27</div>
          <h1 className="aisc-page-title">Examination Dashboard</h1>
          <p className="aisc-page-subtitle">A complete view of examination operations, student readiness and academic progress.</p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14} /> {activeExam ? `Semester ${activeExam.semester}` : "Examination Operations"}</div>
      </div>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><Sparkles size={12} /> ABEDA INAMDAR SENIOR COLLEGE</div>
          <h2 className="aisc-hero-title">Excellence in every examination.</h2>
          <p className="aisc-hero-text">Plan examination sessions, coordinate timetables, prepare hall tickets and track results through one elegant academic workspace.</p>
          <div className="aisc-hero-actions">
            <Link className="aisc-btn aisc-btn-primary" to="/exam-admin/sessions">Explore sessions <ArrowRight size={14} /></Link>
            <Link className="aisc-btn aisc-btn-glass" to="/exam-admin/timetables">View timetable <CalendarDays size={14} /></Link>
          </div>
        </div>
        <div className="aisc-hero-seal"><img src={logo} alt="AISC college emblem" /></div>
      </section>

      <section className="aisc-grid aisc-kpis">
        {kpis.map((item, index) => {
          const Icon = icons[item.icon] || FileText;
          const [color, soft, progress] = colors[index % colors.length];
          return (
            <article className="aisc-kpi" key={item.id} style={{ "--kpi-color": color, "--kpi-soft": soft, "--progress": progress }}>
              <div className="aisc-kpi-top"><div className="aisc-kpi-icon"><Icon size={19} /></div><span className="aisc-kpi-change">{item.change}</span></div>
              <div className="aisc-kpi-label">{item.label}</div>
              <div className="aisc-kpi-value">{item.value}</div>
              <div className="aisc-kpi-note">Current examination cycle</div>
              <div className="aisc-kpi-track"><span /></div>
            </article>
          );
        })}
      </section>

      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div><h3 className="aisc-panel-title">Examination activity</h3><p className="aisc-panel-sub">Monthly exam form submission trend</p></div>
            <span className="aisc-panel-link">Last 6 months <ArrowUpRight size={13} /></span>
          </div>
          <div className="aisc-chart">
            {submissionSeries.values.map((value, index) => (
              <div className="aisc-chart-col" key={submissionSeries.labels[index]}>
                <div className="aisc-chart-bar-wrap">
                  <div
                    className="aisc-chart-bar"
                    style={{ "--bar-height": `${Math.max(8, (value / max) * 100)}%`, animationDelay: `${index * 80}ms` }}
                  />
                </div>
                <span className="aisc-chart-label">{submissionSeries.labels[index]}</span>
              </div>
            ))}
          </div>
          <div className="aisc-chart-legend"><i /> Exam forms submitted across active sessions</div>
        </article>

        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div><h3 className="aisc-panel-title">Results & moderation</h3><p className="aisc-panel-sub">Current processing overview</p></div>
            <Award size={18} color="#A8212F" />
          </div>
          <div className="aisc-progress-list">
            <div>
              <div className="aisc-progress-top"><span>Forms submitted</span><strong>{examRows.filter((form) => form.status === "submitted").length}</strong></div>
              <div className="aisc-progress-track"><span style={{ "--progress": `${examRows.length ? (examRows.filter((form) => form.status === "submitted").length / examRows.length) * 100 : 0}%`, background: "#14264B" }} /></div>
            </div>
            <div>
              <div className="aisc-progress-top"><span>Forms approved</span><strong>{examRows.filter((form) => form.status === "approved").length}</strong></div>
              <div className="aisc-progress-track"><span style={{ "--progress": `${examRows.length ? (examRows.filter((form) => form.status === "approved").length / examRows.length) * 100 : 0}%`, background: "#D2A72C" }} /></div>
            </div>
            <div>
              <div className="aisc-progress-top"><span>Hall tickets issued</span><strong>{issued}</strong></div>
              <div className="aisc-progress-track"><span style={{ "--progress": `${readiness}%`, background: "#A8212F" }} /></div>
            </div>
          </div>
          <div className="aisc-callout" style={{ marginTop: 20 }}>
            <Clock3 size={17} />
            <span><strong>Hall ticket readiness:</strong> {readiness}% issued · {ticketRows.length - issued} ticket(s) pending.</span>
          </div>
        </article>
      </section>

      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div><h3 className="aisc-panel-title">Upcoming examinations</h3><p className="aisc-panel-sub">Next scheduled papers across the active session</p></div>
            <Link className="aisc-panel-link" to="/exam-admin/timetables">View timetable <ArrowUpRight size={13} /></Link>
          </div>
          <div className="aisc-table-wrap">
            <table className="aisc-table">
              <thead><tr><th>Examination / Subject</th><th>Date & time</th><th>Venue</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.map((row, index) => (
                  <tr key={`${row.subjectId}-${index}`}>
                    <td>
                      <div className="aisc-table-primary">{subjectLabel(row.subjectId, subjects)}</div>
                      <div className="aisc-table-secondary">{activeExam?.name} · {programLabel(activeExam?.programId, programs)}</div>
                    </td>
                    <td>{formatDate(row.date)}<div className="aisc-table-secondary">{formatTime(row.startTime)} – {formatTime(row.endTime)}</div></td>
                    <td>{row.room}</td>
                    <td><span className="aisc-status">{activeExam?.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="aisc-note"><AlertCircle size={12} /> Timetable and hall ticket records are live from the examination API.</div>
        </article>

        <article className="aisc-panel">
          <div className="aisc-panel-head">
            <div><h3 className="aisc-panel-title">Recent activity</h3><p className="aisc-panel-sub">Latest examination cell updates</p></div>
            <ClipboardCheck size={18} color="#A8212F" />
          </div>
          {forms.loading || tickets.loading ? (
            <Loader label="Loading recent activity..." />
          ) : forms.error || tickets.error ? (
            <ErrorState
              title="Could not load recent activity"
              description={forms.error?.message || tickets.error?.message}
              onRetry={() => {
                forms.reload();
                tickets.reload();
              }}
            />
          ) : recentActivity.length ? (
            recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <div className="aisc-activity" key={item.id}>
                  <div className="aisc-activity-icon"><Icon size={15} /></div>
                  <div><div className="aisc-activity-title">{item.title}</div><div className="aisc-activity-time">{item.time}</div></div>
                </div>
              );
            })
          ) : (
            <div className="aisc-note">No recent examination activity.</div>
          )}
        </article>
      </section>
    </div>
  );
}
