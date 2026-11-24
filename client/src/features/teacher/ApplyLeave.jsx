import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ArrowRight, UploadCloud } from "lucide-react";
import { Card, Pill, Bar, Notice, PageShell, useTeacher, LEAVE_TYPES, COLLEAGUES, ROUTES, iso, parse, fmt, readFile } from "./TeacherShared";

export function countDays(from, to, half) {
  if (!from || !to || to < from) return 0;
  if (from === to) return parse(from).getDay() === 0 ? 0 : half ? 0.5 : 1;
  let n = 0;
  for (let d = parse(from); d <= parse(to); d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++; // Sundays are not counted
  return n;
}
export const balance = (leaves, id) => {
  const t = LEAVE_TYPES.find((x) => x.id === id);
  const used = leaves.filter((l) => l.type === id && l.status === "Approved").reduce((a, l) => a + l.days, 0);
  const pending = leaves.filter((l) => l.type === id && l.status === "Pending").reduce((a, l) => a + l.days, 0);
  return { total: t.total, used, pending, left: t.total - used - pending };
};

export default function ApplyLeave() {
  const go = useNavigate();
  const { leaves, addLeave, now } = useTeacher();
  const today = iso(now);
  const [f, setF] = useState({ type: "casual", from: "", to: "", half: false, reason: "", sub: COLLEAGUES[0] });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState({});
  const [done, setDone] = useState(null);

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })); setDone(null); };
  const days = useMemo(() => countDays(f.from, f.to, f.half), [f]);
  const bal = balance(leaves, f.type);
  const label = LEAVE_TYPES.find((t) => t.id === f.type).label;

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.from) er.from = "Choose the start date";
    else if (f.type !== "medical" && f.from < today) er.from = "Start date cannot be in the past";
    if (!f.to) er.to = "Choose the end date";
    else if (f.from && f.to < f.from) er.to = "End date must be on or after the start date";
    if (f.from && f.to && !er.from && !er.to) {
      if (days === 0) er.to = "The selected period has no working days";
      else if (days > bal.left) er.to = `Only ${bal.left} day(s) of ${label} left`;
      else if (leaves.some((l) => l.status !== "Rejected" && l.from <= f.to && l.to >= f.from)) er.from = "You already have a leave request in this period";
    }
    if (f.reason.trim().length < 10) er.reason = "Please give a reason (at least 10 characters)";
    if (f.type === "medical" && days > 2 && !file) er.file = "Attach a medical certificate for more than 2 days";
    setErr(er);
    if (Object.keys(er).length) return;
    const l = { id: `LV-${Date.now().toString().slice(-4)}`, type: f.type, from: f.from, to: f.to, days, reason: f.reason.trim(), status: "Pending", appliedOn: today, remark: "", substitute: f.sub };
    addLeave(l); setDone(l);
    setF({ type: f.type, from: "", to: "", half: false, reason: "", sub: COLLEAGUES[0] }); setFile(null);
  };

  return (
    <PageShell title="Apply Leave" section="Leave" chip={`${label}: ${bal.left} day${bal.left === 1 ? "" : "s"} left`}>
      <div className="grid-2">
        <Card title="Leave application">
          {done && (
            <div style={{ marginBottom: 16 }}>
              <Notice tone="ok" onClose={() => setDone(null)}>
                Your request <b>{done.id}</b> for {done.days} day(s) has been sent to the Principal for approval.{" "}
                <button type="button" className="mini" style={{ marginLeft: 8 }} onClick={() => go(ROUTES.leaveStatus)}>View status <ArrowRight size={12} /></button>
              </Notice>
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <div className="f"><label htmlFor="lv-t">Leave type</label>
              <select id="lv-t" value={f.type} onChange={(e) => set("type", e.target.value)}>{LEAVE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
            <div className="row2">
              <div className={"f" + (err.from ? " bad" : "")}><label htmlFor="lv-f">From <b>*</b></label><input id="lv-f" type="date" min={f.type === "medical" ? undefined : today} value={f.from} onChange={(e) => { set("from", e.target.value); if (!f.to || f.to < e.target.value) setF((p) => ({ ...p, from: e.target.value, to: e.target.value })); }} />{err.from && <small>{err.from}</small>}</div>
              <div className={"f" + (err.to ? " bad" : "")}><label htmlFor="lv-to">To <b>*</b></label><input id="lv-to" type="date" min={f.from || today} value={f.to} onChange={(e) => set("to", e.target.value)} />{err.to && <small>{err.to}</small>}</div>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, margin: "0 0 16px", opacity: f.from && f.from === f.to ? 1 : 0.5 }}>
              <input type="checkbox" checked={f.half} disabled={!(f.from && f.from === f.to)} onChange={(e) => set("half", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#9b1230" }} /> Half-day leave (single day only)
            </label>
            <div className="f"><label htmlFor="lv-s">Lectures will be covered by</label>
              <select id="lv-s" value={f.sub} onChange={(e) => set("sub", e.target.value)}>{COLLEAGUES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className={"f" + (err.reason ? " bad" : "")}><label htmlFor="lv-r">Reason <b>*</b></label><textarea id="lv-r" value={f.reason} onChange={(e) => set("reason", e.target.value)} />{err.reason && <small>{err.reason}</small>}</div>
            {f.type === "medical" && (
              <div className={"f" + (err.file ? " bad" : "")}><label>Medical certificate{days > 2 ? " *" : " (optional)"}</label>
                <div className="drop"><span className="ic"><UploadCloud size={20} /></span><div className="meta"><b>{file ? file.name : "No file chosen"}</b><small>{file ? `${file.size} KB` : "PDF or JPG · under 2 MB"}</small></div>
                  <input id="lv-file" type="file" accept="application/pdf,image/jpeg" hidden onChange={async (e) => { const fl = e.target.files[0]; if (fl && fl.size <= 2 * 1024 * 1024) { setFile(await readFile(fl)); setErr((x) => ({ ...x, file: undefined })); } else if (fl) setErr((x) => ({ ...x, file: "File must be smaller than 2 MB" })); }} />
                  <button type="button" className="mini" onClick={() => document.getElementById("lv-file").click()}>Choose</button></div>
                {err.file && <small>{err.file}</small>}</div>
            )}
            <button type="submit" className="btn"><Send size={15} /> Submit application</button>
          </form>
        </Card>

        <div className="stack">
          <Card title="This request">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12, fontSize: 13.5 }}>
              <li style={{ display: "flex", justifyContent: "space-between" }}><span>Working days</span><b>{days || "—"}</b></li>
              <li style={{ display: "flex", justifyContent: "space-between" }}><span>Balance before</span><b>{bal.left} days</b></li>
              <li style={{ display: "flex", justifyContent: "space-between" }}><span>Balance after</span><b style={{ color: bal.left - days < 0 ? "#c4162a" : "#14753f" }}>{bal.left - days} days</b></li>
            </ul>
            {f.from && f.to && <p className="lead" style={{ margin: "14px 0 0", fontSize: 12 }}>{fmt(f.from)} → {fmt(f.to)} · Sundays are not counted.</p>}
          </Card>
          <Card title="Leave balance">
            <div style={{ display: "grid", gap: 14 }}>
              {LEAVE_TYPES.map((t) => { const b = balance(leaves, t.id); return (
                <div key={t.id}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>{t.label}</span><b>{b.left} / {b.total}</b></div><Bar pct={(b.left / b.total) * 100} tone={b.left / b.total < 0.25 ? "warn" : "good"} /></div>
              ); })}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}