import { useState } from "react";
import { Card, Notice, PageShell, useExam } from "./ExamShared";

function AbcSection() {
  const { status, setStatus } = useExam();
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const clean = val.replace(/\s/g, "");

  if (status.abc) {
    return (
      <Card title="ABC ID (Academic Bank of Credits)">
        <Notice tone="ok"><b>ABC ID linked</b> — {status.abc.replace(/(\d{4})(?=\d)/g, "$1 ")}</Notice>
        <button type="button" className="btn ghost" onClick={() => setStatus((s) => ({ ...s, abc: null }))}>Change ABC ID</button>
      </Card>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(clean)) return setErr("ABC ID must be exactly 12 digits.");
    setStatus((s) => ({ ...s, abc: clean }));
  };

  return (
    <Card title="ABC ID (Academic Bank of Credits)">
      <form onSubmit={submit} noValidate className="narrow">
        <p className="lead">Enter your 12-digit ABC ID. You can create one on the DigiLocker / ABC portal if you don’t have it yet.</p>
        <label className="field">
          <span>ABC ID <b>*</b></span>
          <input value={val} inputMode="numeric" maxLength={14} placeholder="0000 0000 0000" aria-invalid={!!err}
            onChange={(e) => { setVal(e.target.value.replace(/[^\d\s]/g, "")); setErr(""); }} />
        </label>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="btn">Save ABC ID</button>
      </form>
    </Card>
  );
}

export default function ExamAbcId() {
  return (
    <PageShell title="ABC ID">
      <AbcSection />
    </PageShell>
  );
}