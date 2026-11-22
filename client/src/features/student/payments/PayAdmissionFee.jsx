import { useState } from "react";
import { ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import Checkout from "./Checkout";
import { Card, Notice, Pill, PageShell, inr, fmt, daysLeft, usePayments } from "./PaymentsShared";

export default function PayAdmissionFee() {
  const { admission, now, go } = usePayments();
  const items = admission.items.map(([label, amount], i) => ({ id: `a${i}`, label, amount }));
  const total = items.reduce((a, i) => a + i.amount, 0);
  const left = daysLeft(admission.lastDate, now);
  const [started] = useState(admission.status === "due"); // keeps the success screen after paying

  return (
    <PageShell title="Pay Admission Fee">
      {admission.status === "locked" ? (
        <Card title="Admission fee">
          <Notice tone="warn"><Lock size={14} style={{ verticalAlign: -2 }} /> The admission fee can be paid only after the college approves your admission form.</Notice>
          <div className="btns" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => go("receipts")}>View receipts <ArrowRight size={15} /></button>
          </div>
        </Card>
      ) : admission.status === "paid" && !started ? (
        <Card title="Admission fee">
          <Notice tone="ok"><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> <b>Admission fee paid.</b> Your receipt is available in the receipts section.</Notice>
          <div className="btns" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => go("receipts")}>Download receipt <ArrowRight size={15} /></button>
          </div>
        </Card>
      ) : (
        <>
          {admission.status === "due" && (
          <Card title={admission.title} action={<Pill tone={left <= 3 ? "red" : "gold"}>{left < 0 ? "Last date passed" : `Pay before ${fmt(admission.lastDate)} · ${left} days left`}</Pill>}>
            <p className="lead">Your admission form is approved. Check the fee heads below and pay online to confirm your admission.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sr.</th><th>Particulars</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {items.map((i, k) => <tr key={i.id}><td>{k + 1}</td><td>{i.label}</td><td className="r">{inr(i.amount)}</td></tr>)}
                  <tr className="total"><td colSpan={2}>Total admission fee</td><td className="r">{inr(total)}</td></tr>
                </tbody>
              </table>
            </div>
          </Card>
          )}
          <Checkout type="admission" title={admission.title} items={items} />
        </>
      )}
    </PageShell>
  );
}