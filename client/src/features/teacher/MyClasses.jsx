import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, ClipboardCheck, ArrowRight, BookOpen, Clock } from "lucide-react";
import { Card, Pill, Bar, Empty, PageShell, useTeacher, CLASSES, TIMETABLE, DAYS, ROUTES, studentsOf, studentStats, mins, t12, classLabel } from "./TeacherShared";

export default function ClassList() {
  const go = useNavigate();
  const { attendance, now } = useTeacher();
  const [q, setQ] = useState("");

  const rows = CLASSES.filter((c) => `${classLabel(c)} ${c.code}`.toLowerCase().includes(q.trim().toLowerCase())).map((c) => {
    const stu = studentsOf(c.id);
    const st = stu.map((s) => studentStats(attendance, c.id, s.id));
    const avg = st.length ? Math.round((st.reduce((a, s) => a + s.pct, 0) / st.length) * 10) / 10 : 0;
    const sessions = Object.keys(attendance[c.id] || {}).length;
    const slots = TIMETABLE.filter((t) => t.classId === c.id);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const next = [...slots].sort((a, b) => ((a.day - now.getDay() + 7) % 7) * 1440 + mins(a.start) - (((b.day - now.getDay() + 7) % 7) * 1440 + mins(b.start)))
      .find((t) => t.day !== now.getDay() || mins(t.start) > nowMin) || slots[0];
    return { c, n: stu.length, avg, sessions, perWeek: slots.length, next };
  });

  return (
    <PageShell title="Class List" section="My classes" chip={`${CLASSES.length} classes · this semester`}>
      <Card title="Classes you teach" action={
        <label className="search" style={{ minWidth: 240, flex: "none" }}><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search class or subject…" aria-label="Search classes" /></label>
      }>
        {rows.length ? (
          <div className="cards">
            {rows.map(({ c, n, avg, sessions, perWeek, next }) => (
              <article key={c.id} className="card" style={{ boxShadow: "none", background: "#fbfcff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div><h4 style={{ fontSize: 16, margin: 0 }}>{c.subject}</h4><small className="muted">{c.code} · {c.name}</small></div>
                  <Pill tone="blue">Sem {c.sem} · Div {c.div}</Pill>
                </div>
                <div className="kv" style={{ margin: "16px 0", gridTemplateColumns: "1fr 1fr" }}>
                  <div><dt><Users size={12} /> Students</dt><dd>{n}</dd></div>
                  <div><dt><BookOpen size={12} /> Sessions held</dt><dd>{sessions}</dd></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span className="muted">Average attendance</span><b>{avg}%</b></div>
                <Bar pct={avg} tone={avg >= 75 ? "good" : "warn"} />
                <p className="lead" style={{ margin: "14px 0" }}><Clock size={13} style={{ verticalAlign: -2 }} /> {perWeek} lectures a week · Next: {next ? `${DAYS[next.day].slice(0, 3)} ${t12(next.start)}` : "—"} · {c.room}</p>
                <div className="btns">
                  <button type="button" className="btn" style={{ padding: "9px 16px" }} onClick={() => go(ROUTES.attMark)}><ClipboardCheck size={14} /> Attendance</button>
                  <button type="button" className="btn ghost" style={{ padding: "9px 16px" }} onClick={() => go(`${ROUTES.students}?class=${c.id}`)}>Students <ArrowRight size={14} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : <Empty icon={Search}>No classes match your search.</Empty>}
      </Card>
    </PageShell>
  );
}