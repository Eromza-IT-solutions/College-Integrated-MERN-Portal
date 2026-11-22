import { CreditCard, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { sectionOf } from "./AdmissionSchema";
import { Card, Notice, Pill, PageShell, inr, fmt, useAdmission } from "./AdmissionShared";

export default function AdmissionFeeDetails() {
  const { application, draft, fees, dates, onPayFee, go } = useAdmission();
  const values = application ? application.values : draft;
  const section = sectionOf(values);
  const rows = fees[section];

  if (!rows) {
    return (
      <PageShell title="View Fee Details">
        <Card title="Fee details">
          <Notice tone="warn">Select your class in the admission form first — the fee structure depends on your class.</Notice>
          <div className="btns" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => go("fill")}>Fill form <ArrowRight size={15} /></button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const total = rows.reduce((a, [, n]) => a + n, 0);
  const idx = application ? application.statusIndex : -1;
  const paid = idx >= 4;
  const payable = idx === 2 || idx === 3;
  const last = dates.find((d) => d.id === "fee");
  const pay = () => (onPayFee ? onPayFee({ total, application }) : (window.location.href = "/student/payments"));

  return (
    <PageShell title="View Fee Details">
      <div className="grid-2">
        <Card title={`Fee structure · ${values.class}`} action={<Pill tone="blue">{section}</Pill>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sr.</th><th>Particulars</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {rows.map(([label, amt], i) => (
                  <tr key={label}><td>{i + 1}</td><td>{label}</td><td className="r">{inr(amt)}</td></tr>
                ))}
                <tr className="total"><td colSpan={2}>Total fee</td><td className="r">{inr(total)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="lead" style={{ margin: "14px 0 0" }}>Amounts are for the selected class. The exact amount is shown on your e-challan.</p>
        </Card>

        <div className="stack">
          <Card title="Payment status">
            {paid ? (
              <Notice tone="ok"><b>Fee paid.</b> Thank you — your payment has been received.</Notice>
            ) : payable ? (
              <>
                <p className="lead">Your form is approved. Pay the fee online{last ? <> between <b>{fmt(last.date, { day: "numeric", month: "short" })}</b> and <b>{fmt(last.end || last.date)}</b></> : ""}.</p>
                <button type="button" className="btn wide" style={{ width: "100%" }} onClick={pay}><CreditCard size={16} /> Pay {inr(total)}</button>
              </>
            ) : (
              <>
                <p className="lead"><Lock size={14} style={{ verticalAlign: -2 }} /> Fee payment opens after your admission form is approved by the college.</p>
                <Pill tone="gray">{application ? "Waiting for approval" : "Form not submitted"}</Pill>
              </>
            )}
          </Card>

          <Card title="Good to know">
            <ul className="lead" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
              <li>Pay only after you get the approval SMS / email.</li>
              <li>Use credit card, debit card, net banking or UPI.</li>
              <li>An e-challan is generated after successful payment.</li>
            </ul>
            {paid && <p className="saved" style={{ marginTop: 10 }}><CheckCircle2 size={14} /> Download your e-challan from the Payments menu.</p>}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}