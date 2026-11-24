import { useMemo, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
// import { Card, Pill, Stat, Bar, Avatar, ClassPicker, Empty, PageShell, useTeacher, CLASSES, MIN_ATT, studentsOf, studentStats, downloadCsv, fmt } from "./TeacherShared";
import { Card, Pill, Stat, Bar, Avatar, ClassPicker, Empty, PageShell, useTeacher, CLASSES, MIN_ATT, studentsOf, downloadCsv, fmt } from "./TeacherShared";

export default function AttendanceReport() {
  const { attendance } = useTeacher();
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [range, setRange] = useState("20");
  const c = CLASSES.find((x) => x.id === classId);

  const dates = useMemo(() => Object.keys(attendance[classId] || {}).sort().slice(range === "all" ? 0 : -Number(range)), [attendance, classId, range]);

  const rows = useMemo(() => studentsOf(classId).map((s) => {
    let p = 0, a = 0, l = 0;
    dates.forEach((d) => { const v = attendance[classId][d][s.id]; if (v === "P") p++; else if (v === "A") a++; else if (v === "L") l++; });
    const total = p + a + l;
    return { ...s, p, a, l, total, pct: total ? Math.round(((p + l) / total) * 1000) / 10 : 0, trail: dates.map((d) => attendance[classId][d][s.id]) };
  }), [attendance, classId, dates]);

  const avg = rows.length ? Math.round((rows.reduce((a, r) => a + r.pct, 0) / rows.length) * 10) / 10 : 0;
  const low = rows.filter((r) => r.pct < MIN_ATT).length;
  const best = [...rows].sort((a, b) => b.pct - a.pct)[0];
  const perDay = dates.map((d) => { const day = attendance[classId][d]; const v = Object.values(day); return { d, pct: Math.round((v.filter((x) => x !== "A").length / v.length) * 100) }; });

  return (
    <PageShell title="Attendance Report" section="Attendance" chip={`${dates.length} sessions in range`}>
      <Card><ClassPicker value={classId} onChange={setClassId} /></Card>

      <div className="stats">
        <Stat icon={BarChart3} label="Sessions" value={dates.length} sub={dates.length ? `${fmt(dates[0], { day: "numeric", month: "short" })} – ${fmt(dates[dates.length - 1], { day: "numeric", month: "short" })}` : "No data"} />
        <Stat label="Average attendance" value={`${avg}%`} sub={c.subject} tone={avg >= MIN_ATT ? "good" : "warn"} />
        <Stat label={`Below ${MIN_ATT}%`} value={low} sub={low ? "Defaulters" : "None"} tone={low ? "warn" : "good"} />
        <Stat label="Top attendance" value={best ? `${best.pct}%` : "—"} sub={best ? best.name : ""} tone="good" />
      </div>

      <div className="grid-2">
        <Card title="Student-wise report" action={
          <div className="btns">
            <select className="sel" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Sessions to include">
              <option value="10">Last 10 sessions</option><option value="20">Last 20 sessions</option><option value="all">All sessions</option>
            </select>
            <button type="button" className="mini" onClick={() => downloadCsv(`attendance-${c.code}.csv`, [["Roll no.", "Name", "Present", "Absent", "Leave", "Total", "Attendance %"], ...rows.map((r) => [r.roll, r.name, r.p, r.a, r.l, r.total, r.pct])])}><Download size={14} /> CSV</button>
          </div>
        }>
          {rows.length && dates.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th className="c">P</th><th className="c">A</th><th className="c">L</th><th>Attendance</th><th>Recent sessions</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><div className="who"><Avatar name={r.name} /><span><b>{r.name}</b><small>{r.roll}</small></span></div></td>
                      <td className="c">{r.p}</td><td className="c">{r.a}</td><td className="c">{r.l}</td>
                      <td><div className="pct"><b>{r.pct}%</b><Bar pct={r.pct} tone={r.pct >= MIN_ATT ? "good" : "warn"} /></div></td>
                      <td><div className="dots" aria-label="Recent attendance">{r.trail.map((t, i) => <i key={i} className={t} title={t === "P" ? "Present" : t === "A" ? "Absent" : "Leave"} />)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={BarChart3}>No attendance has been recorded for this class yet.</Empty>}
        </Card>

        <Card title="Class attendance by day">
          {perDay.length ? (
            <div className="hist" role="img" aria-label="Class attendance by day">
              {perDay.slice(-10).map((x) => (
                <div key={x.d}><b>{x.pct}%</b><span style={{ height: `${x.pct}%` }} /><small>{fmt(x.d, { day: "numeric", month: "numeric" })}</small></div>
              ))}
            </div>
          ) : <Empty icon={BarChart3}>No sessions yet.</Empty>}
          <p className="lead" style={{ margin: "14px 0 0", fontSize: 12 }}>
            <Pill tone="green">P</Pill> Present &nbsp;<Pill tone="red">A</Pill> Absent &nbsp;<Pill tone="gold">L</Pill> Leave
          </p>
        </Card>
      </div>
    </PageShell>
  );
}