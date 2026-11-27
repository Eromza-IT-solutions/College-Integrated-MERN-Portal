import { useMemo, useState } from "react";
import { Search, Download, Trophy } from "lucide-react";
import { Card, Pill, Stat, Bar, Avatar, Notice, ClassPicker, Empty, PageShell, CLASSES, buildResults, downloadCsv } from "./TeacherShared";

const GRADES = ["O", "A+", "A", "B+", "B", "C", "F"];

export default function ExamResults() {
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const [sort, setSort] = useState("roll");
  const c = CLASSES.find((x) => x.id === classId);
  const res = useMemo(() => buildResults(classId), [classId]);

  const rows = useMemo(() => {
    const by = { roll: (a, b) => a.student.roll.localeCompare(b.student.roll), high: (a, b) => b.marks - a.marks, low: (a, b) => a.marks - b.marks };
    return res.rows.filter((r) => (show === "all" || (show === "pass") === r.pass) && `${r.student.name} ${r.student.roll}`.toLowerCase().includes(q.trim().toLowerCase())).sort(by[sort]);
  }, [res, q, show, sort]);

  const n = res.rows.length, passed = res.rows.filter((r) => r.pass).length;
  const avg = n ? Math.round((res.rows.reduce((a, r) => a + r.marks, 0) / n) * 10) / 10 : 0;
  const top = [...res.rows].sort((a, b) => b.marks - a.marks)[0];
  const dist = GRADES.map((g) => ({ g, n: res.rows.filter((r) => r.grade === g).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  return (
    <PageShell title="Results" section="Examinations" chip={res.exam}>
      <Card><ClassPicker value={classId} onChange={setClassId} /></Card>

      {!res.published ? (
        <Card title={`${c.subject} · ${c.name}`}><Notice tone="info">Results for <b>{res.exam}</b> have not been declared yet. They will appear here as soon as the university publishes them.</Notice></Card>
      ) : (
        <>
          <div className="stats">
            <Stat label="Appeared" value={n} sub={res.exam} />
            <Stat label="Pass percentage" value={`${Math.round((passed / n) * 100)}%`} sub={`${passed} passed · ${n - passed} failed`} tone={passed / n >= 0.75 ? "good" : "warn"} />
            <Stat label="Class average" value={`${avg}/100`} sub={c.subject} />
            <Stat icon={Trophy} label="Topper" value={`${top.marks}/100`} sub={top.student.name} tone="good" />
          </div>

          <div className="grid-2">
            <Card title="Student results" action={
              <button type="button" className="mini" onClick={() => downloadCsv(`results-${c.code}.csv`, [["Roll no.", "Name", "Marks /100", "Grade", "Result"], ...rows.map((r) => [r.student.roll, r.student.name, r.marks, r.grade, r.pass ? "Pass" : "Fail"])])}><Download size={14} /> CSV</button>
            }>
              <div className="filters">
                <label className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or roll number…" aria-label="Search results" /></label>
                <select className="sel" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show"><option value="all">All students</option><option value="pass">Passed</option><option value="fail">Failed</option></select>
                <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="roll">Roll number</option><option value="high">Marks (high → low)</option><option value="low">Marks (low → high)</option></select>
              </div>
              {rows.length ? (
                <div className="table-wrap"><table>
                  <thead><tr><th>Student</th><th>Marks</th><th className="c">Grade</th><th className="c">Result</th></tr></thead>
                  <tbody>{rows.map((r) => (
                    <tr key={r.student.id}>
                      <td><div className="who"><Avatar name={r.student.name} /><span><b>{r.student.name}</b><small>{r.student.roll}</small></span></div></td>
                      <td><div className="pct"><b>{r.marks}</b><Bar pct={r.marks} tone={r.pass ? "good" : "warn"} /></div></td>
                      <td className="c"><b>{r.grade}</b></td>
                      <td className="c"><Pill tone={r.pass ? "green" : "red"}>{r.pass ? "Pass" : "Fail"}</Pill></td>
                    </tr>))}
                  </tbody></table></div>
              ) : <Empty icon={Search}>No results match your filters.</Empty>}
            </Card>

            <Card title="Grade distribution">
              <div className="hist" role="img" aria-label="Grade distribution">
                {dist.map((d) => <div key={d.g}><b>{d.n}</b><span style={{ height: `${(d.n / maxN) * 100}%`, background: d.g === "F" ? "linear-gradient(180deg,#e04b69,#9b1230)" : undefined }} /><small>{d.g}</small></div>)}
              </div>
              <p className="lead" style={{ margin: "14px 0 0", fontSize: 12 }}>O ≥ 80 · A+ ≥ 70 · A ≥ 60 · B+ ≥ 50 · B ≥ 45 · C ≥ 40 · F below 40</p>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}