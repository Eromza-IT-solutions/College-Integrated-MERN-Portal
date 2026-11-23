import { useState } from "react";
import { Printer, CheckCircle2, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Card, Pill, Stat, Empty, PageShell, useTeacher, fmt, daysLeft } from "./TeacherShared";

export default function ExamDuty() {
  const { duties, ackDuty, now } = useTeacher();
  const [tab, setTab] = useState("upcoming");

  const withState = duties.map((d) => ({ ...d, left: daysLeft(d.date, now) })).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = withState.filter((d) => d.left >= 0);
  const shown = tab === "all" ? withState : tab === "upcoming" ? upcoming : withState.filter((d) => d.left < 0);
  const toAck = upcoming.filter((d) => !d.ack).length;

  return (
    <PageShell title="Exam Duty" section="Examinations" chip="Semester End Examinations">
      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat icon={ShieldCheck} label="Total duties" value={duties.length} sub="This examination session" />
        <Stat label="Upcoming" value={upcoming.length} sub={upcoming[0] ? `Next: ${fmt(upcoming[0].date, { day: "numeric", month: "short" })}` : "None scheduled"} />
        <Stat label="To acknowledge" value={toAck} sub={toAck ? "Please confirm your duty" : "All acknowledged"} tone={toAck ? "warn" : "good"} />
      </div>

      <Card title="Duty chart" action={
        <div className="btns no-print">
          <div className="seg" role="tablist" aria-label="Filter duties">
            {[["upcoming", "Upcoming"], ["done", "Completed"], ["all", "All"]].map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? "P on" : ""} onClick={() => setTab(v)} style={{ minWidth: 80 }}>{l}</button>
            ))}
          </div>
          <button type="button" className="mini" onClick={() => window.print()}><Printer size={14} /> Print</button>
        </div>
      }>
        {shown.length ? (
          <ul className="list">
            {shown.map((d) => (
              <li key={d.id} className={d.left < 0 ? "done" : ""} style={{ gridTemplateColumns: "76px 1fr auto" }}>
                <span style={{ textAlign: "center", padding: "8px 0", borderRadius: 12, background: "#eef0f8", color: "#0f1d57" }}>
                  <b style={{ font: "700 22px 'Playfair Display',serif", display: "block" }}>{fmt(d.date, { day: "numeric" })}</b>
                  <small>{fmt(d.date, { month: "short" })}</small>
                </span>
                <span>
                  <b>{d.subject}</b>
                  <small style={{ display: "block", marginTop: 3 }}><Clock size={12} style={{ verticalAlign: -1 }} /> {d.time} &nbsp; <MapPin size={12} style={{ verticalAlign: -1 }} /> {d.venue}</small>
                  <span style={{ display: "inline-flex", gap: 8, marginTop: 8 }}>
                    <Pill tone="blue">{d.role}</Pill>
                    {d.left >= 0 && <Pill tone={d.left <= 3 ? "red" : "gold"}>{d.left === 0 ? "Today" : `In ${d.left} day${d.left === 1 ? "" : "s"}`}</Pill>}
                  </span>
                </span>
                <span className="no-print">
                  {d.ack ? <Pill tone="green"><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> Acknowledged</Pill>
                    : d.left >= 0 ? <button type="button" className="btn" style={{ padding: "9px 16px" }} onClick={() => ackDuty(d.id)}>Acknowledge</button> : <Pill tone="gray">Missed</Pill>}
                </span>
              </li>
            ))}
          </ul>
        ) : <Empty icon={ShieldCheck}>No duties to show here.</Empty>}
        <p className="lead" style={{ margin: "16px 0 0", fontSize: 12.5 }}>Report to the exam control room 30 minutes before the start of each paper and carry your college ID card.</p>
      </Card>
    </PageShell>
  );
}