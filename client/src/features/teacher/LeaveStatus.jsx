import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, CalendarDays } from "lucide-react";
import { Card, Pill, Bar, Stat, Empty, PageShell, useTeacher, LEAVE_TYPES, ROUTES, fmt } from "./TeacherShared";
import { balance } from "./ApplyLeave";

const TONE = { Approved: "green", Pending: "gold", Rejected: "red" };

export default function LeaveStatus() {
  const go = useNavigate();
  const { leaves, cancelLeave } = useTeacher();
  const [status, setStatus] = useState("all");
  const list = leaves.filter((l) => status === "all" || l.status === status).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
  const count = (s) => leaves.filter((l) => l.status === s).length;

  return (
    <PageShell title="Leave Status" section="Leave" chip={`${leaves.length} applications`}>
      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat label="Approved" value={count("Approved")} sub="Applications" tone="good" />
        <Stat label="Pending" value={count("Pending")} sub="Awaiting approval" tone={count("Pending") ? "warn" : ""} />
        <Stat label="Rejected" value={count("Rejected")} sub="Applications" />
      </div>

      <Card title="Leave balance">
        <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          {LEAVE_TYPES.map((t) => { const b = balance(leaves, t.id); return (
            <div key={t.id} style={{ padding: 16, background: "#f3f5fd", borderRadius: 14 }}>
              <small className="muted">{t.label}</small>
              <div style={{ font: "700 26px 'Playfair Display',serif", color: "#0f1d57", margin: "4px 0 10px" }}>{b.left}<span style={{ fontSize: 14, color: "#6b7392" }}> / {b.total} days</span></div>
              <Bar pct={(b.left / b.total) * 100} tone={b.left / b.total < 0.25 ? "warn" : "good"} />
              <small className="muted" style={{ display: "block", marginTop: 8 }}>Used {b.used} · Pending {b.pending}</small>
            </div>
          ); })}
        </div>
      </Card>

      <Card title="My applications" action={
        <div className="btns">
          <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
          <button type="button" className="btn" style={{ padding: "9px 16px" }} onClick={() => go(ROUTES.leaveApply)}><Plus size={15} /> Apply leave</button>
        </div>
      }>
        {list.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>Request</th><th>Type</th><th>Period</th><th className="c">Days</th><th>Status</th><th className="r">Action</th></tr></thead>
            <tbody>{list.map((l) => (
              <tr key={l.id}>
                <td><b>{l.id}</b><small>Applied {fmt(l.appliedOn, { day: "numeric", month: "short" })}</small></td>
                <td>{LEAVE_TYPES.find((t) => t.id === l.type).label}<small>{l.reason}</small></td>
                <td>{fmt(l.from, { day: "numeric", month: "short" })}{l.to !== l.from && ` – ${fmt(l.to, { day: "numeric", month: "short" })}`}</td>
                <td className="c">{l.days}</td>
                <td><Pill tone={TONE[l.status]}>{l.status}</Pill>{l.remark && <small>{l.remark}</small>}</td>
                <td className="r">{l.status === "Pending" && <button type="button" className="mini danger" onClick={() => cancelLeave(l.id)}><X size={13} /> Cancel</button>}</td>
              </tr>))}
            </tbody></table></div>
        ) : <Empty icon={CalendarDays}>No applications found.</Empty>}
      </Card>
    </PageShell>
  );
}