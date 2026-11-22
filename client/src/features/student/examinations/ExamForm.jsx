import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Card, Pill, Notice, PageShell, useExam, fmt } from "./ExamShared";

function FormSection() {
  const { exams, status, setStatus, deadlines, go } = useExam();
  const [picked, setPicked] = useState(() => new Set(exams.map((e) => e.code)));
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");

  if (status.form) {
    return (
      <Card title="Examination form">
        <Notice tone="ok">
          <b>Form submitted</b> — reference <b>{status.form.ref}</b> for {status.form.codes.length} subject(s).
        </Notice>
        <div className="next-step">
          <p>Next step: pay the examination form fee.</p>
          {!status.fee && <button type="button" className="btn" onClick={() => go("fee")}>Pay fee <ArrowRight size={15} /></button>}
        </div>
      </Card>
    );
  }

  const toggle = (c) => {
    const n = new Set(picked);
    n.has(c) ? n.delete(c) : n.add(c);
    setPicked(n);
    setErr("");
  };
  const credits = exams.filter((e) => picked.has(e.code)).reduce((a, b) => a + b.credits, 0);

  const submit = (e) => {
    e.preventDefault();
    if (!picked.size) return setErr("Select at least one subject.");
    if (!agree) return setErr("Please accept the declaration.");
    setStatus((s) => ({ ...s, form: { ref: `EXF-${Date.now().toString().slice(-6)}`, codes: [...picked] } }));
  };

  return (
    <Card title="Examination form" action={<Pill tone="gold">Last date {fmt(deadlines.form)}</Pill>}>
      <form onSubmit={submit} noValidate>
        <p className="lead">Review the subjects you will appear for this session. Uncheck any subject you are not appearing for.</p>
        <div className="subjects">
          {exams.map((e) => (
            <label key={e.code} className={"subject" + (picked.has(e.code) ? " on" : "")}>
              <input type="checkbox" checked={picked.has(e.code)} onChange={() => toggle(e.code)} />
              <span className="tick"><CheckCircle2 size={18} /></span>
              <span><b>{e.name}</b><small>{e.code} · {e.credits} credits · {fmt(e.date, { day: "numeric", month: "short" })}</small></span>
            </label>
          ))}
        </div>
        <div className="summary-line"><span>{picked.size} subject(s) selected</span><b>{credits} credits</b></div>
        <label className="agree">
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr(""); }} />
          I declare that the details given are correct and I will abide by the examination rules of the college.
        </label>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="btn">Submit examination form <ArrowRight size={15} /></button>
      </form>
    </Card>
  );
}

export default function ExamForm() {
  return (
    <PageShell title="Examination Form">
      <FormSection />
    </PageShell>
  );
}