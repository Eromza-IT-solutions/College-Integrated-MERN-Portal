import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Checkout from "./Checkout";
import { Card, Pill, PageShell, Notice, inr, fmt, daysLeft, lateFine, LATE_FINE, usePayments } from "./PaymentsShared";

export default function PayPendingFee() {
  const { dues, now } = usePayments();
  const [sel, setSel] = useState(() => new Set(dues.map((d) => d.id)));
  const [paying, setPaying] = useState(false);

  const rows = useMemo(() => dues.map((d) => ({ ...d, fine: lateFine(d.due, now), left: daysLeft(d.due, now) })), [dues, now]);
  const chosen = rows.filter((r) => sel.has(r.id));
  const subtotal = chosen.reduce((a, r) => a + r.amount, 0);
  const fines = chosen.reduce((a, r) => a + r.fine, 0);

  const toggle = (id) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id));

  if (paying) {
    const items = [
      ...chosen.map((r) => ({ id: r.id, label: r.label, amount: r.amount, sub: `Due ${fmt(r.due)}` })),
      ...chosen.filter((r) => r.fine).map((r) => ({ id: `late-${r.id}`, label: `Late fine — ${r.label}`, amount: r.fine, late: true, sub: `${-r.left} days overdue` })),
    ];
    return (
      <PageShell title="Pay Pending Fee">
        <Checkout type="pending" title="Pending fee" items={items} paidIds={chosen.map((r) => r.id)} onBack={() => setPaying(false)} backLabel="Change selection" />
      </PageShell>
    );
  }

  if (!rows.length) {
    return (
      <PageShell title="Pay Pending Fee">
        <Card title="Pending fees">
          <Notice tone="ok"><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> <b>You’re all clear!</b> There are no pending fees on your account.</Notice>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Pay Pending Fee">
      <div className="grid-2">
        <Card
          title="Select fees to pay"
          action={<button type="button" className="mini" onClick={() => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)))}>{allOn ? "Clear all" : "Select all"}</button>}
        >
          <div className="pick">
            {rows.map((r) => (
              <label key={r.id} className={sel.has(r.id) ? "on" : ""}>
                <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                <span>
                  <b>{r.label}</b>
                  <small>
                    Due {fmt(r.due)} ·{" "}
                    {r.left < 0 ? <Pill tone="red">{-r.left} days overdue · fine {inr(r.fine)}</Pill> : <Pill tone={r.left <= 7 ? "gold" : "gray"}>{r.left} days left</Pill>}
                  </small>
                </span>
                <span className="amt">{inr(r.amount)}</span>
              </label>
            ))}
          </div>
          <p className="lead" style={{ margin: "14px 0 0" }}>A late fine of {inr(LATE_FINE.perDay)} per day (maximum {inr(LATE_FINE.max)}) applies after the due date.</p>
        </Card>

        <Card title="Payment summary" className="sticky">
          <ul className="summary">
            <li><span>{chosen.length} fee{chosen.length === 1 ? "" : "s"} selected</span><b>{inr(subtotal)}</b></li>
            <li className="late"><span>Late fine</span><b>{inr(fines)}</b></li>
            <li className="sum"><span>Total payable</span><b>{inr(subtotal + fines)}</b></li>
          </ul>
          <button type="button" className="btn full" disabled={!chosen.length} onClick={() => setPaying(true)}>
            Proceed to pay <ArrowRight size={15} />
          </button>
        </Card>
      </div>
    </PageShell>
  );
}