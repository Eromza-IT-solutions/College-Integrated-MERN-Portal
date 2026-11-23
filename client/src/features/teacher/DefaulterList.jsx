import { useMemo, useState } from "react";
import { Download, Send, CheckCircle2, UserX } from "lucide-react";
import { Card, Pill, Stat, Bar, Avatar, Empty, Notice, PageShell, useTeacher, CLASSES, MIN_ATT, studentsOf, studentStats, downloadCsv } from "./TeacherShared";

export default function DefaulterList() {
  const { attendance, reminded, remind } = useTeacher();
  const [threshold, setThreshold] = useState(MIN_ATT);
  const [cls, setCls] = useState("all");
  const [msg, setMsg] = useState("");

  const rows = useMemo(() => CLASSES.filter((c) => cls === "all" || c.id === cls).flatMap((c) =>
    studentsOf(c.id).map((s) => ({ ...s, c, st: studentStats(attendance, c.id, s.id), key: `${c.id}:${s.id}` }))
  ).filter((r) => r.st.total && r.st.pct < threshold).sort((a, b) => a.st.pct - b.st.pct), [attendance, cls, threshold]);

  const pending = rows.filter((r) => !reminded[r.key]);
  const sendAll = () => { pending.forEach((r) => remind(r.key)); setMsg(`Reminder sent to ${pending.length} student${pending.length === 1 ? "" : "s"} and their parents by SMS / email.`); };
  const sendOne = (r) => { remind(r.key); setMsg(`Reminder sent to ${r.name}.`); };
  const worst = rows[0];

  return (
    <PageShell title="Defaulter List" section="Attendance" chip={`Below ${threshold}% attendance`}>
      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat icon={UserX} label="Defaulters" value={rows.length} sub={`Below ${threshold}%`} tone={rows.length ? "warn" : "good"} />
        <Stat label="Lowest attendance" value={worst ? `${worst.st.pct}%` : "—"} sub={worst ? worst.name : "No defaulters"} tone={worst ? "warn" : "good"} />
        <Stat label="Reminders sent" value={rows.length - pending.length} sub={`${pending.length} still to notify`} />
      </div>

      <Card title="Students below the limit" action={
        <div className="btns">
          <button type="button" className="mini" disabled={!pending.length} onClick={sendAll}><Send size={14} /> Remind all ({pending.length})</button>
          <button type="button" className="mini" disabled={!rows.length} onClick={() => downloadCsv("defaulters.csv", [["Roll no.", "Name", "Class", "Subject", "Attendance %", "Lectures needed to reach 75%"], ...rows.map((r) => [r.roll, r.name, r.c.name, r.c.subject, r.st.pct, r.st.need])])}><Download size={14} /> CSV</button>
        </div>
      }>
        <div className="filters">
          <select className="sel" value={cls} onChange={(e) => setCls(e.target.value)} aria-label="Class">
            <option value="all">All classes</option>
            {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.subject} · {c.name}</option>)}
          </select>
          <label className="inp" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13 }}>Limit: <b>{threshold}%</b></span>
            <input type="range" min="50" max="90" step="5" value={threshold} onChange={(e) => setThreshold(+e.target.value)} aria-label="Attendance limit" style={{ accentColor: "#9b1230" }} />
          </label>
        </div>
        {msg && <div style={{ marginBottom: 14 }}><Notice tone="ok" onClose={() => setMsg("")}>{msg}</Notice></div>}

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>To reach {MIN_ATT}%</th><th className="r">Action</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td><div className="who"><Avatar name={r.name} /><span><b>{r.name}</b><small>{r.roll}</small></span></div></td>
                    <td>{r.c.subject}<small>{r.c.name}</small></td>
                    <td><div className="pct"><b>{r.st.pct}%</b><Bar pct={r.st.pct} tone="warn" /></div><small>{r.st.p + r.st.l} of {r.st.total} lectures</small></td>
                    <td>{r.st.need ? <Pill tone="gold">{r.st.need} lectures in a row</Pill> : <Pill tone="green">On track</Pill>}</td>
                    <td className="r">{reminded[r.key] ? <Pill tone="green"><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> Reminded</Pill> : <button type="button" className="mini" onClick={() => sendOne(r)}><Send size={13} /> Remind</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon={CheckCircle2}>No students are below {threshold}% — excellent!</Empty>}
      </Card>
    </PageShell>
  );
}