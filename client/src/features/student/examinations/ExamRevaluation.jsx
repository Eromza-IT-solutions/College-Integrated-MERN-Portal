import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Card, Pill, Notice, PageShell, useExam, inr, REVAL_FEE } from "./ExamShared";

function RevalSection() {
  const { exams, status, setStatus } = useExam();
  const [picked, setPicked] = useState(new Set());
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const toggle = (c) => {
    const n = new Set(picked);
    n.has(c) ? n.delete(c) : n.add(c);
    setPicked(n);
    setErr("");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!picked.size) return setErr("Select at least one subject.");
    if (reason.trim().length < 10) return setErr("Please give a short reason (at least 10 characters).");
    const ref = `REV-${Date.now().toString().slice(-6)}`;
    setStatus((s) => ({ ...s, reval: [...s.reval, ...[...picked].map((c) => ({ code: c, ref }))] }));
    setPicked(new Set());
    setReason("");
    setDone(true);
  };

  return (
    <Card title="Revaluation form" action={<Pill tone="blue">{inr(REVAL_FEE)} per subject</Pill>}>
      {done && <Notice tone="ok" onClose={() => setDone(false)}><b>Request submitted.</b> Your revaluation request is under review.</Notice>}
      <form onSubmit={submit} noValidate>
        <p className="lead">Select the subjects whose answer sheets you want re-evaluated.</p>
        <div className="subjects">
          {exams.map((e) => {
            const requested = status.reval.some((r) => r.code === e.code);
            return (
              <label key={e.code} className={"subject" + (picked.has(e.code) ? " on" : "") + (requested ? " off" : "")}>
                <input type="checkbox" disabled={requested} checked={picked.has(e.code)} onChange={() => toggle(e.code)} />
                <span className="tick"><CheckCircle2 size={18} /></span>
                <span>
                  <b>{e.name}</b>
                  <small>{e.code} · Marks {e.marks}/100</small>
                </span>
                {requested && <Pill tone="gold">Under review</Pill>}
              </label>
            );
          })}
        </div>
        <label className="field">
          <span>Reason for revaluation <b>*</b></span>
          <textarea rows={3} value={reason} placeholder="Briefly explain why you are requesting revaluation…"
            onChange={(e) => { setReason(e.target.value); setErr(""); }} />
        </label>
        <div className="summary-line"><span>{picked.size} subject(s)</span><b>Total {inr(picked.size * REVAL_FEE)}</b></div>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="btn">Submit revaluation request <ArrowRight size={15} /></button>
      </form>
    </Card>
  );
}

export default function ExamRevaluation() {
  return (
    <PageShell title="Revaluation Form">
      <RevalSection />
    </PageShell>
  );
}