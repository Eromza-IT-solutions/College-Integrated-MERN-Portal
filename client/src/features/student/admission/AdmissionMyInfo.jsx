import { Printer, Download, Pencil, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";
import { sectionOf } from "./AdmissionSchema";
import { Card, Notice, Pill, PageShell, TRACKER, fmt, useAdmission } from "./AdmissionShared";

const MESSAGES = [
  "Your form has been submitted.",
  "Your form is being reviewed by the admission committee. You will get an SMS and email about the decision within 3 days.",
  "Congratulations — your form is approved. Pay the fee online before the last date.",
  "Your fee payment is pending. Please complete it before the last date.",
  "Fee received. Visit the college with your original documents for verification.",
  "Your admission is confirmed. Collect your ID card from the college office.",
];

const mask = (a) => (a ? `XXXX XXXX ${String(a).slice(-4)}` : "—");
const KV = ({ items }) => (
  <dl className="kv">
    {items.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val || "—"}</dd></div>)}
  </dl>
);

export default function AdmissionMyInfo() {
  const { application, go } = useAdmission();

  if (!application) {
    return (
      <PageShell title="My Admission Info">
        <Card title="My admission info">
          <Notice tone="warn">You haven’t submitted an admission form yet.</Notice>
          <div className="btns" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => go("fill")}>Fill form <ArrowRight size={15} /></button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const v = application.values;
  const idx = application.statusIndex;
  const canEdit = idx < 2;

  return (
    <PageShell title="My Admission Info">
      <div className="stats">
        <div className="stat"><span>Status</span><b>{TRACKER[idx]}</b><small>Application {application.ref}</small></div>
        <div className="stat"><span>Class applied</span><b style={{ fontSize: 20 }}>{v.class}</b><small>{sectionOf(v)} · {v.divisionType}</small></div>
        <div className="stat"><span>Fees category</span><b style={{ fontSize: 22 }}>{v.feesCategory}</b><small>{v.admissionType}</small></div>
        <div className="stat"><span>Submitted on</span><b style={{ fontSize: 22 }}>{fmt(new Date(application.submittedOn), { day: "numeric", month: "short" })}</b><small>{fmt(new Date(application.submittedOn), { year: "numeric" })}{application.updatedOn ? " · edited" : ""}</small></div>
      </div>

      <Card title="Admission progress">
        <ol className="track">
          {TRACKER.map((t, i) => (
            <li key={t} className={i < idx ? "done" : i === idx ? "cur" : ""}>
              <span className="n">{i < idx ? <CheckCircle2 size={18} /> : i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 20 }}><Notice tone={idx >= 2 ? "ok" : "info"}>{MESSAGES[idx]}</Notice></div>
        <div className="btns" style={{ marginTop: 18 }}>
          {canEdit && <button type="button" className="btn ghost" onClick={() => go("update")}><Pencil size={15} /> Update form</button>}
          <button type="button" className="btn ghost" onClick={() => go("print")}><Printer size={15} /> Print form</button>
          <button type="button" className="btn ghost" onClick={() => go("download")}><Download size={15} /> Download form</button>
          {idx >= 2 && idx < 4 && <button type="button" className="btn" onClick={() => go("fee")}><CreditCard size={15} /> Fee details</button>}
        </div>
      </Card>

      <div className="grid-2">
        <div className="stack">
          <Card title="Student details" action={<Pill tone="gray">Step 2</Pill>}>
            <KV items={[
              ["Full name", v.fullName], ["Gender", v.gender], ["Birth date", v.dob && fmt(v.dob)], ["Mobile", v.mobile],
              ["Email", v.email], ["Aadhaar", mask(v.aadhaar)], ["ABC / APAAR ID", v.abcId], ["Nationality", v.nationality],
              ["Religion", v.religion], ["Caste category", v.casteCategory],
            ]} />
          </Card>
          <Card title="Last qualification">
            <KV items={[
              ["Last class", v.lastClass], ["Institute", v.lastInstitute], ["Board / University", v.lastBoard],
              ["Passing", [v.passMonth, v.passYear].filter(Boolean).join(" ")], ["Marks", v.obtained && `${v.obtained} / ${v.outOf}`],
              ["Percentage", v.outOf > 0 ? ((v.obtained / v.outOf) * 100).toFixed(2) + "%" : ""], ["Result", v.result], ["Seat no.", v.seatNo],
            ]} />
          </Card>
        </div>
        <div className="stack">
          <Card title="Parent details">
            <KV items={[["Father", v.fatherName], ["Mother", v.motherName], ["Father’s mobile", v.fatherMobile], ["Mother’s mobile", v.motherMobile], ["Email", v.parentEmail]]} />
          </Card>
          <Card title="Subjects">
            <KV items={[["Main group", v.mainGroup], ["Major group", v.majorGroup], ["Minor group", v.minorGroup]]} />
          </Card>
        </div>
      </div>
    </PageShell>
  );
}