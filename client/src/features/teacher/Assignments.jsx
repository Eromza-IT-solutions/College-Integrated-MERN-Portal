import { useState } from "react";
import { Plus, ClipboardList, X, Save } from "lucide-react";
import { Card, Pill, Bar, Avatar, Notice, Empty, PageShell, useTeacher, CLASSES, studentsOf, fmt, iso, daysLeft } from "./TeacherShared";

export default function Assignments() {
  const { assignments, addAssignment, gradeAssignment, now } = useTeacher();
  const today = iso(now);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ classId: CLASSES[0].id, title: "", instructions: "", due: "", max: "10" });
  const [err, setErr] = useState({});
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState("");

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })); };
  const create = (e) => {
    e.preventDefault();
    const er = {};
    if (f.title.trim().length < 3) er.title = "Enter a title";
    if (f.instructions.trim().length < 10) er.instructions = "Add short instructions (at least 10 characters)";
    if (!f.due || f.due < today) er.due = "Choose a due date from today onwards";
    if (!(+f.max > 0 && +f.max <= 100)) er.max = "Enter marks between 1 and 100";
    setErr(er);
    if (Object.keys(er).length) return;
    addAssignment({ id: `a${Date.now()}`, ...f, title: f.title.trim(), instructions: f.instructions.trim(), max: +f.max, created: today, subs: {} });
    setF({ classId: f.classId, title: "", instructions: "", due: "", max: "10" });
    setCreating(false); setMsg("Assignment created. Students have been notified.");
  };

  const open = assignments.find((a) => a.id === openId);
  const saveMark = (a, sid) => {
    const v = draft[`${a.id}:${sid}`];
    if (!(v !== undefined && v !== "" && +v >= 0 && +v <= a.max)) return setMsg(`Enter marks between 0 and ${a.max}.`);
    gradeAssignment(a.id, sid, +v); setMsg("Marks saved.");
  };

  return (
    <PageShell title="Assignments" section="Study material" chip={`${assignments.length} assignments`}>
      {msg && <Notice tone={msg.startsWith("Enter") ? "bad" : "ok"} onClose={() => setMsg("")}>{msg}</Notice>}

      <Card title="Your assignments" action={<button type="button" className="btn" style={{ padding: "9px 16px" }} onClick={() => setCreating(!creating)}>{creating ? <><X size={15} /> Close</> : <><Plus size={15} /> New assignment</>}</button>}>
        {creating && (
          <form onSubmit={create} noValidate style={{ padding: 18, marginBottom: 20, background: "#f6f7fc", borderRadius: 14 }}>
            <div className="row2">
              <div className="f"><label htmlFor="as-c">Class &amp; subject</label><select id="as-c" value={f.classId} onChange={(e) => set("classId", e.target.value)}>{CLASSES.map((c) => <option key={c.id} value={c.id}>{c.subject} · {c.name}</option>)}</select></div>
              <div className={"f" + (err.title ? " bad" : "")}><label htmlFor="as-t">Title <b>*</b></label><input id="as-t" value={f.title} onChange={(e) => set("title", e.target.value)} />{err.title && <small>{err.title}</small>}</div>
            </div>
            <div className={"f" + (err.instructions ? " bad" : "")}><label htmlFor="as-i">Instructions <b>*</b></label><textarea id="as-i" value={f.instructions} onChange={(e) => set("instructions", e.target.value)} />{err.instructions && <small>{err.instructions}</small>}</div>
            <div className="row2">
              <div className={"f" + (err.due ? " bad" : "")}><label htmlFor="as-d">Due date <b>*</b></label><input id="as-d" type="date" min={today} value={f.due} onChange={(e) => set("due", e.target.value)} />{err.due && <small>{err.due}</small>}</div>
              <div className={"f" + (err.max ? " bad" : "")}><label htmlFor="as-m">Maximum marks</label><input id="as-m" inputMode="numeric" value={f.max} onChange={(e) => set("max", e.target.value.replace(/\D/g, ""))} />{err.max && <small>{err.max}</small>}</div>
            </div>
            <button type="submit" className="btn"><Plus size={15} /> Create assignment</button>
          </form>
        )}

        {assignments.length ? (
          <div className="cards">
            {assignments.map((a) => {
              const c = CLASSES.find((x) => x.id === a.classId);
              const total = studentsOf(a.classId).length;
              const done = Object.keys(a.subs).length;
              const graded = Object.values(a.subs).filter((s) => s.marks !== null).length;
              const left = daysLeft(a.due, now);
              return (
                <article key={a.id} className="card" style={{ boxShadow: "none", background: a.id === openId ? "#f3f5fd" : "#fbfcff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div><h4 style={{ fontSize: 15, margin: 0 }}>{a.title}</h4><small className="muted">{c.subject} · {c.name}</small></div>
                    <Pill tone={left < 0 ? "gray" : left <= 2 ? "red" : "green"}>{left < 0 ? "Closed" : left === 0 ? "Due today" : `${left} days left`}</Pill>
                  </div>
                  <p className="lead" style={{ margin: "10px 0" }}>{a.instructions}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span className="muted">Submitted {done}/{total} · Graded {graded}</span><b>Due {fmt(a.due, { day: "numeric", month: "short" })}</b></div>
                  <Bar pct={total ? (done / total) * 100 : 0} tone={done === total ? "good" : ""} />
                  <button type="button" className="mini" style={{ marginTop: 14 }} onClick={() => setOpenId(a.id === openId ? null : a.id)}>{a.id === openId ? "Hide submissions" : "Review submissions"}</button>
                </article>
              );
            })}
          </div>
        ) : <Empty icon={ClipboardList}>No assignments yet. Create your first one.</Empty>}
      </Card>

      {open && (
        <Card title={`Submissions — ${open.title}`} action={<Pill tone="blue">Out of {open.max}</Pill>}>
          <div className="table-wrap"><table>
            <thead><tr><th>Student</th><th>Status</th><th>Marks</th><th className="r">Save</th></tr></thead>
            <tbody>
              {studentsOf(open.classId).map((s) => {
                const sub = open.subs[s.id];
                const key = `${open.id}:${s.id}`;
                return (
                  <tr key={s.id}>
                    <td><div className="who"><Avatar name={s.name} /><span><b>{s.name}</b><small>{s.roll}</small></span></div></td>
                    <td>{sub ? <Pill tone="green">Submitted · {fmt(sub.on, { day: "numeric", month: "short" })}</Pill> : <Pill tone="gray">Not submitted</Pill>}</td>
                    <td>{sub ? <input className="score" inputMode="decimal" aria-label={`Marks for ${s.name}`} value={draft[key] ?? (sub.marks ?? "")} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value.replace(/[^\d.]/g, "") }))} /> : <span className="muted">—</span>}</td>
                    <td className="r">{sub && <button type="button" className="mini" onClick={() => saveMark(open, s.id)}><Save size={13} /> {sub.marks !== null ? "Update" : "Save"}</button>}</td>
                  </tr>
                );
              })}
            </tbody></table></div>
        </Card>
      )}
    </PageShell>
  );
}