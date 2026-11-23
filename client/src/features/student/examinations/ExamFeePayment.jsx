import { useEffect, useRef, useState } from "react";
import { Download, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { Card, Pill, Notice, PageShell, useExam, inr, fmt, FEE_ITEMS } from "./ExamShared";

function FeeSection() {
  const { status, setStatus, deadlines, go } = useExam();
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const timer = useRef();
  const total = FEE_ITEMS.reduce((a, b) => a + b.amount, 0);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!status.form) {
    return (
      <Card title="Form fee payment">
        <Notice tone="warn">Submit the examination form first — the fee is calculated from your selected subjects.</Notice>
        <button type="button" className="btn" onClick={() => go("form")}>Go to examination form <ArrowRight size={15} /></button>
      </Card>
    );
  }

  if (status.fee) {
    return (
      <Card title="Form fee payment">
        <Notice tone="ok"><b>Payment successful</b> — {inr(total)} paid.</Notice>
        <dl className="receipt">
          <div><dt>Receipt no.</dt><dd>{status.fee.receipt}</dd></div>
          <div><dt>Paid on</dt><dd>{status.fee.paidOn}</dd></div>
          <div><dt>Method</dt><dd>{status.fee.method}</dd></div>
          <div><dt>Amount</dt><dd>{inr(total)}</dd></div>
        </dl>
        <button type="button" className="btn ghost" onClick={() => window.print()}><Download size={15} /> Download receipt</button>
      </Card>
    );
  }

  const pay = () => {
    setBusy(true);
    // Replace this timeout with your payment gateway call.
    timer.current = setTimeout(() => {
      setStatus((s) => ({
        ...s,
        fee: {
          receipt: `RCP-${Date.now().toString().slice(-7)}`,
          paidOn: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
          method: { upi: "UPI", card: "Credit / Debit card", net: "Net banking" }[method],
        },
      }));
      setBusy(false);
    }, 1400);
  };

  return (
    <Card title="Form fee payment" action={<Pill tone="gold">Pay before {fmt(deadlines.fee)}</Pill>}>
      <div className="fee-grid">
        <div>
          <ul className="fees">
            {FEE_ITEMS.map((f) => <li key={f.label}><span>{f.label}</span><b>{inr(f.amount)}</b></li>)}
            <li className="total"><span>Total payable</span><b>{inr(total)}</b></li>
          </ul>
        </div>
        <div>
          <h4 className="sub">Payment method</h4>
          <div className="methods" role="radiogroup" aria-label="Payment method">
            {[["upi", "UPI"], ["card", "Credit / Debit card"], ["net", "Net banking"]].map(([v, l]) => (
              <label key={v} className={method === v ? "on" : ""}>
                <input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} /> {l}
              </label>
            ))}
          </div>
          <button type="button" className="btn wide" onClick={pay} disabled={busy}>
            {busy ? <><Loader2 size={16} className="spin" /> Processing…</> : <>Pay {inr(total)}</>}
          </button>
          <p className="hint"><ShieldCheck size={14} /> Secure payment. You will receive an e-challan on your dashboard.</p>
        </div>
      </div>
    </Card>
  );
}

export default function ExamFeePayment() {
  return (
    <PageShell title="Form Fee Payment">
      <FeeSection />
    </PageShell>
  );
}