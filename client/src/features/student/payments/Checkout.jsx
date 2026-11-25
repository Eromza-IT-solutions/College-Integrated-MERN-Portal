import { useState } from "react";
import { Smartphone, CreditCard, Landmark, ShieldCheck, Loader2, CheckCircle2, Download, ArrowLeft, Receipt } from "lucide-react";
import { Card, Notice, inr, fmt, receiptsHtml, saveHtml, usePayments } from "./PaymentsShared";

const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Bank of Maharashtra", "Union Bank of India", "Canara Bank", "Other bank"];
const METHODS = [["upi", "UPI", Smartphone], ["card", "Card", CreditCard], ["net", "Net banking", Landmark]];

const luhn = (num) => {
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = +num[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

/**
 * Payment form + order summary.
 * items: [{ id, label, amount, sub?, late? }]   type: "admission" | "pending" | "misc"
 */
export default function Checkout({ type, title, items, paidIds = [], onBack, backLabel = "Back" }) {
  const { pay, go, student } = usePayments();
  const total = items.reduce((a, i) => a + i.amount, 0);

  const [method, setMethod] = useState("upi");
  const [f, setF] = useState({ upi: "", card: "", name: "", exp: "", cvv: "", bank: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [receipt, setReceipt] = useState(null);

  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const validate = () => {
    const e = {};
    // if (method === "upi" && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(f.upi.trim())) e.upi = "Enter a valid UPI ID, e.g. name@bank";
    if (method === "upi" && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(f.upi.trim())) e.upi = "Enter a valid UPI ID, e.g. name@bank";
    if (method === "card") {
      const num = f.card.replace(/\s/g, "");
      if (!/^\d{16}$/.test(num) || !luhn(num)) e.card = "Enter a valid 16-digit card number";
      if (f.name.trim().length < 2) e.name = "Enter the name on the card";
      const m = /^(\d{2})\/(\d{2})$/.exec(f.exp);
      const now = new Date();
      if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1], 0, 23, 59) < now) e.exp = "Enter a valid expiry (MM/YY)";
      if (!/^\d{3}$/.test(f.cvv)) e.cvv = "3-digit CVV";
    }
    if (method === "net" && !f.bank) e.bank = "Please select your bank";
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setFailed("");
    try {
      setReceipt(await pay({ type, items, total, method, paidIds, title }));
    } catch {
      setFailed("The payment could not be completed. No money has been deducted. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <Card>
        <div className="success">
          <div className="tick"><CheckCircle2 size={40} /></div>
          <h3>Payment successful</h3>
          <p>Thank you! Your payment of <b>{inr(receipt.total)}</b> has been received.</p>
          <dl className="rc">
            <dt>Receipt no.</dt><dd>{receipt.no}</dd>
            <dt>Transaction ID</dt><dd>{receipt.txn}</dd>
            <dt>Paid on</dt><dd>{fmt(receipt.date, { day: "numeric", month: "short", year: "numeric" })}</dd>
            <dt>Mode</dt><dd>{receipt.mode}</dd>
          </dl>
          <div className="btns">
            <button type="button" className="btn" onClick={() => saveHtml(`Receipt-${receipt.no}.html`, receiptsHtml([receipt], student))}><Download size={16} /> Download receipt</button>
            <button type="button" className="btn ghost" onClick={() => go("receipts")}><Receipt size={16} /> All payment receipts</button>
          </div>
        </div>
      </Card>
    );
  }

  const field = (k, label, props = {}) => (
    <div className={"f" + (err[k] ? " bad" : "")}>
      <label htmlFor={`co-${k}`}>{label}</label>
      <input id={`co-${k}`} value={f[k]} aria-invalid={!!err[k]} autoComplete="off" {...props} />
      {err[k] && <small>{err[k]}</small>}
    </div>
  );

  return (
    <div className="grid-2">
      <Card title="Payment method" action={onBack && <button type="button" className="mini" onClick={onBack}><ArrowLeft size={14} /> {backLabel}</button>}>
        <div className="methods" role="tablist" aria-label="Payment method">
          {METHODS.map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={method === id} className={method === id ? "on" : ""} onClick={() => { setMethod(id); setErr({}); }}>
              <Icon size={22} /> {label}
            </button>
          ))}
        </div>

        {method === "upi" && field("upi", "UPI ID", { placeholder: "name@bank", onChange: (e) => set("upi", e.target.value) })}
        {method === "card" && (
          <>
            {field("card", "Card number", {
              placeholder: "0000 0000 0000 0000", inputMode: "numeric", maxLength: 19,
              onChange: (e) => set("card", e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ")),
            })}
            {field("name", "Name on card", { placeholder: "As printed on the card", onChange: (e) => set("name", e.target.value) })}
            <div className="row2">
              {field("exp", "Expiry (MM/YY)", {
                placeholder: "MM/YY", inputMode: "numeric", maxLength: 5,
                onChange: (e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); set("exp", d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); },
              })}
              {field("cvv", "CVV", { type: "password", placeholder: "ΓÇóΓÇóΓÇó", inputMode: "numeric", maxLength: 3, onChange: (e) => set("cvv", e.target.value.replace(/\D/g, "")) })}
            </div>
          </>
        )}
        {method === "net" && (
          <div className={"f" + (err.bank ? " bad" : "")}>
            <label htmlFor="co-bank">Select your bank</label>
            <select id="co-bank" value={f.bank} onChange={(e) => set("bank", e.target.value)} aria-invalid={!!err.bank}>
              <option value="">Select bank</option>
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
            {err.bank ? <small>{err.bank}</small> : <small className="h">You will be redirected to your bank to complete the payment.</small>}
          </div>
        )}

        {failed && <Notice tone="bad">{failed}</Notice>}
      </Card>

      <Card title="Order summary" className="sticky">
        <ul className="summary">
          {items.map((i) => (
            <li key={i.id} className={i.late ? "late" : ""}>
              <span>{i.label}{i.sub && <small>{i.sub}</small>}</span>
              <b>{inr(i.amount)}</b>
            </li>
          ))}
          <li className="sum"><span>Total payable</span><b>{inr(total)}</b></li>
        </ul>
        <button type="button" className="btn full" onClick={submit} disabled={busy}>
          {busy ? <><Loader2 size={16} className="spin" /> Processing paymentΓÇª</> : <>Pay {inr(total)}</>}
        </button>
        <p className="secure"><ShieldCheck size={15} /> Payments are secure. An e-receipt is generated instantly.</p>
      </Card>
    </div>
  );
}
