import { useMemo, useState } from "react";
import { Save, Lock, Download, Send } from "lucide-react";
import { Card, Pill, Stat, Bar, Avatar, Notice, ClassPicker, PageShell, useTeacher, CLASSES, studentsOf, downloadCsv } from "./TeacherShared";

const COLS = [["test", "Test", 20], ["assign", "Assignment", 10], ["seminar", "Seminar / Project", 10]];
const MAX = COLS.reduce((a, c) => a + c[2], 0);
const valid = (v, max) => v === "" || (/^\d+(\.5)?$/.test(v) && +v >= 0 && +v <= max);

export default function InternalMarks() {
  const { marks, setMarks, marksLocked, lockMarks, save } = useTeacher();
  const [classId, setClassId] = useState(CLASSES[0].id);
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState("");
  const c = CLASSES.find((x) => x.id === classId);
  const students = studentsOf(classId);
  const locked = !!marksLocked[classId];
  const data = marks[classId] || {};

  const set = (sid, key, val) => { setMsg(""); setMarks((m) => ({ ...m, [classId]: { ...m[classId], [sid]: { ...(m[classId]?.[sid] || {}), [key]: val } } })); };

  const info = useMemo(() => {
    let filled = 0, invalid = 0, sum = 0;
    const rows = students.map((s) => {
      const r = data[s.id] || {};
      const complete = COLS.every(([k]) => (r[k] ?? "") !== "");
      const bad = COLS.some(([k, , max]) => !valid(r[k] ?? "", max));
      const total = COLS.reduce((a, [k]) => a + (+r[k] || 0), 0);
      if (complete && !bad) { filled++; sum += total; }
      if (bad) invalid++;
      return { s, r, complete, bad, total };
    });
    return { rows, filled, invalid, avg: filled ? Math.round((sum / filled) * 10) / 10 : 0 };
  }, [students, data]);

  const ready = info.filled === students.length && !info.invalid;
  const submit = () => { lockMarks(classId); setMsg("Internal marks submitted to the examination department."); };

  return (
    <PageShell title="Internal Marks" section="Examinations" chip={`Maximum ${MAX} marks`}>
      <Card><ClassPicker value={classId} onChange={(id) => { setClassId(id); setMsg(""); setAgree(false); }} /></Card>

      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat label="Entered" value={`${info.filled}/${students.length}`} sub="Students with complete marks" tone={ready ? "good" : ""} />
        <Stat label="Class average" value={info.filled ? `${info.avg}/${MAX}` : "—"} sub={c.subject} />
        <Stat label="Status" value={locked ? "Submitted" : "Draft"} sub={locked ? "Locked for editing" : "Not yet submitted"} tone={locked ? "good" : "warn"} />
      </div>

      <Card title={`${c.subject} · ${c.name}`} action={
        <div className="btns">
          {locked && <Pill tone="green"><Lock size={12} style={{ verticalAlign: -2 }} /> Submitted</Pill>}
          <button type="button" className="mini" onClick={() => downloadCsv(`internal-marks-${c.code}.csv`, [["Roll no.", "Name", ...COLS.map(([, l, m]) => `${l} (/${m})`), `Total (/${MAX})`], ...info.rows.map(({ s, r, total }) => [s.roll, s.name, ...COLS.map(([k]) => r[k] ?? ""), total])])}><Download size={14} /> CSV</button>
        </div>
      }>
        <div style={{ marginBottom: 14 }}><Bar pct={students.length ? (info.filled / students.length) * 100 : 0} tone={ready ? "good" : ""} /></div>
        {msg && <div style={{ marginBottom: 14 }}><Notice tone="ok" onClose={() => setMsg("")}>{msg}</Notice></div>}
        {locked && <div style={{ marginBottom: 14 }}><Notice tone="info">Marks for this class have been submitted and can no longer be edited. Contact the examination department for corrections.</Notice></div>}

        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th>{COLS.map(([k, l, m]) => <th key={k} className="c">{l}<small>out of {m}</small></th>)}<th className="c">Total /{MAX}</th></tr></thead>
            <tbody>
              {info.rows.map(({ s, r, bad, total, complete }) => (
                <tr key={s.id}>
                  <td><div className="who"><Avatar name={s.name} /><span><b>{s.name}</b><small>{s.roll}</small></span></div></td>
                  {COLS.map(([k, l, max]) => (
                    <td key={k} className="c">
                      <input className={"score" + (!valid(r[k] ?? "", max) ? " bad" : "")} value={r[k] ?? ""} disabled={locked} inputMode="decimal" maxLength={4}
                        aria-label={`${l} marks for ${s.name}`} aria-invalid={!valid(r[k] ?? "", max)} onChange={(e) => set(s.id, k, e.target.value.replace(/[^\d.]/g, ""))} />
                    </td>
                  ))}
                  <td className="c"><b>{bad ? "—" : complete ? total : total || ""}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {info.invalid > 0 && <p className="lead" style={{ color: "#c4162a", margin: "12px 0 0" }}>Some marks are outside the allowed range (whole or .5 marks only).</p>}

        {!locked && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #e6e9f5" }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#6b7392", marginBottom: 14 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, accentColor: "#9b1230" }} />
              I confirm that these marks are correct. Marks cannot be changed after submission.
            </label>
            <div className="btns">
              <button type="button" className="btn ghost" onClick={() => { save("marksDraft", { classId, marks: data }); setMsg("Draft saved."); }}><Save size={15} /> Save draft</button>
              <button type="button" className="btn" disabled={!ready || !agree} onClick={submit}><Send size={15} /> Submit marks</button>
              {!ready && <small className="muted">Fill every box for all {students.length} students to submit.</small>}
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}