import { Link } from "react-router-dom";
import {
  Sparkles, CalendarDays, ArrowRight, ArrowUpRight, Users, FileText,
  Ticket, Award, Clock3, ClipboardCheck, BookOpen, AlertCircle
} from "lucide-react";
const logo = "/aisc-logo.png";
import {
  examAdminKpis, examSubmissionSeries, examResultsProgress,
  examUpcomingExams, examActivities
} from "../../../mocks/examAdminData";
import "../../../assets/styles/aisc-premium.css";

const icons = { sessions: CalendarDays, students: Users, tickets: Ticket, results: Award };
const activityIcons = { ticket: Ticket, calendar: CalendarDays, marks: ClipboardCheck, results: Award, subject: BookOpen };
const colors = [
  ["#315FCE","#EEF3FF","76%"],["#A8212F","#F9ECEE","68%"],
  ["#2C9271","#EAF7F1","88%"],["#B58A16","#FFF7DF","46%"]
];

export default function ExamAdminDashboard() {
  const max = Math.max(...examSubmissionSeries.values);
  return (
    <div className="aisc-premium">
      <div className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13}/> Examination Cell · Academic year 2026–27</div>
          <h1 className="aisc-page-title">Examination Dashboard</h1>
          <p className="aisc-page-subtitle">A complete view of examination operations, student readiness and academic progress.</p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14}/> Odd Semester · 2026–27</div>
      </div>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><Sparkles size={12}/> ABEDA INAMDAR SENIOR COLLEGE</div>
          <h2 className="aisc-hero-title">Excellence in every examination.</h2>
          <p className="aisc-hero-text">Plan examination sessions, coordinate timetables, prepare hall tickets and track results through one elegant academic workspace.</p>
          <div className="aisc-hero-actions">
            <Link className="aisc-btn aisc-btn-primary" to="/exam-admin/sessions">Explore sessions <ArrowRight size={14}/></Link>
            <Link className="aisc-btn aisc-btn-glass" to="/exam-admin/timetables">View timetable <CalendarDays size={14}/></Link>
          </div>
        </div>
        <div className="aisc-hero-seal"><img src={logo} alt="AISC college emblem"/></div>
      </section>

      <section className="aisc-grid aisc-kpis">
        {examAdminKpis.map((item,i) => {
          const Icon = icons[item.icon] || FileText;
          const [color,soft,progress] = colors[i % colors.length];
          return <article className="aisc-kpi" key={item.id} style={{"--kpi-color":color,"--kpi-soft":soft,"--progress":progress}}>
            <div className="aisc-kpi-top"><div className="aisc-kpi-icon"><Icon size={19}/></div><span className="aisc-kpi-change">{item.change}</span></div>
            <div className="aisc-kpi-label">{item.label}</div><div className="aisc-kpi-value">{item.value}</div>
            <div className="aisc-kpi-note">Current examination cycle</div><div className="aisc-kpi-track"><span/></div>
          </article>;
        })}
      </section>

      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head"><div><h3 className="aisc-panel-title">Examination activity</h3><p className="aisc-panel-sub">Monthly marks submission trend</p></div><span className="aisc-panel-link">Last 6 months <ArrowUpRight size={13}/></span></div>
          <div className="aisc-chart">
            {examSubmissionSeries.values.map((value,i)=><div className="aisc-chart-col" key={examSubmissionSeries.labels[i]}>
              <div className="aisc-chart-bar-wrap"><div className="aisc-chart-bar" style={{"--bar-height":`${Math.max(8,value/max*100)}%`,animationDelay:`${i*80}ms`}}/></div>
              <span className="aisc-chart-label">{examSubmissionSeries.labels[i]}</span>
            </div>)}
          </div>
          <div className="aisc-chart-legend"><i/> Marks submitted across active sessions</div>
        </article>
        <article className="aisc-panel">
          <div className="aisc-panel-head"><div><h3 className="aisc-panel-title">Results & moderation</h3><p className="aisc-panel-sub">Current processing overview</p></div><Award size={18} color="#A8212F"/></div>
          <div className="aisc-progress-list">
            {examResultsProgress.map((item,i)=><div key={item.label}>
              <div className="aisc-progress-top"><span>{item.label}</span><strong>{Number(item.value).toLocaleString("en-IN")}</strong></div>
              <div className="aisc-progress-track"><span style={{"--progress":`${Math.min(100,item.value/1500*100)}%`,background:i===0?"#14264B":i===1?"#D2A72C":i===2?"#A8212F":"#6A8DBB"}}/></div>
            </div>)}
          </div>
          <div className="aisc-callout" style={{marginTop:20}}><Clock3 size={17}/><span><strong>Hall ticket readiness:</strong> 88% issued · 146 students pending eligibility clearance.</span></div>
        </article>
      </section>

      <section className="aisc-grid aisc-two-col">
        <article className="aisc-panel">
          <div className="aisc-panel-head"><div><h3 className="aisc-panel-title">Upcoming examinations</h3><p className="aisc-panel-sub">Next scheduled papers across active sessions</p></div><Link className="aisc-panel-link" to="/exam-admin/timetables">View timetable <ArrowUpRight size={13}/></Link></div>
          <div className="aisc-table-wrap"><table className="aisc-table"><thead><tr><th>Examination / Subject</th><th>Date & time</th><th>Venue</th><th>Status</th></tr></thead>
            <tbody>{examUpcomingExams.slice(0,5).map(row=><tr key={row.id}>
              <td><div className="aisc-table-primary">{row.subject}</div><div className="aisc-table-secondary">{row.exam} · {row.id}</div></td>
              <td>{row.date}<div className="aisc-table-secondary">{row.time}</div></td><td>{row.room}</td><td><span className="aisc-status">{row.status}</span></td>
            </tr>)}</tbody></table></div>
          <div className="aisc-note"><AlertCircle size={12}/> Preview records are sample data until connected to the examination APIs.</div>
        </article>
        <article className="aisc-panel">
          <div className="aisc-panel-head"><div><h3 className="aisc-panel-title">Recent activity</h3><p className="aisc-panel-sub">Latest examination cell updates</p></div><ClipboardCheck size={18} color="#A8212F"/></div>
          {examActivities.slice(0,5).map(item=>{const Icon=activityIcons[item.icon]||FileText;return <div className="aisc-activity" key={item.id}>
            <div className="aisc-activity-icon"><Icon size={15}/></div><div><div className="aisc-activity-title">{item.title}</div><div className="aisc-activity-time">{item.time}</div></div>
          </div>;})}
        </article>
      </section>
    </div>
  );
}
