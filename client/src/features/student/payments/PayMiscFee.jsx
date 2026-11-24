import { useState } from "react";
import { FileText, Contact, Plus, Minus, ArrowRight } from "lucide-react";
import Checkout from "./Checkout";
import { Card, PageShell, inr, usePayments } from "./PaymentsShared";

const ICONS = { file: FileText, id: Contact };

export default function PayMiscFee() {
  const { miscCatalogue } = usePayments();
  const [qty, setQty] = useState({});
  const [paying, setPaying] = useState(false);

  const change = (id, d) => setQty((q) => ({ ...q, [id]: Math.min(5, Math.max(0, (q[id] || 0) + d)) }));
  const chosen = miscCatalogue.filter((m) => qty[m.id] > 0);
  const total = chosen.reduce((a, m) => a + m.price * qty[m.id], 0);

  if (paying) {
    const items = chosen.map((m) => ({ id: m.id, label: `${m.label} × ${qty[m.id]}`, amount: m.price * qty[m.id], sub: `${inr(m.price)} each` }));
    return (
      <PageShell title="Pay Miscellaneous Fee">
        <Checkout type="misc" title="Miscellaneous fee" items={items} onBack={() => setPaying(false)} backLabel="Change selection" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Pay Miscellaneous Fee">
      <div className="grid-2">
        <Card title="Certificates & other services">
          <p className="lead">Choose what you need and how many copies (up to 5 of each).</p>
          <div className="catalog">
            {miscCatalogue.map((m) => {
              const Icon = ICONS[m.icon] || FileText;
              const n = qty[m.id] || 0;
              return (
                <div key={m.id} className={"cat" + (n ? " on" : "")}>
                  <span className="ic"><Icon size={20} /></span>
                  <b>{m.label}</b>
                  <span className="price">{inr(m.price)}</span>
                  <div className="qty" role="group" aria-label={`Quantity for ${m.label}`}>
                    <button type="button" onClick={() => change(m.id, -1)} disabled={!n} aria-label="Decrease"><Minus size={15} /></button>
                    <span aria-live="polite">{n}</span>
                    <button type="button" onClick={() => change(m.id, 1)} disabled={n >= 5} aria-label="Increase"><Plus size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Your selection" className="sticky">
          {chosen.length ? (
            <ul className="summary">
              {chosen.map((m) => <li key={m.id}><span>{m.label}<small>{qty[m.id]} × {inr(m.price)}</small></span><b>{inr(m.price * qty[m.id])}</b></li>)}
              <li className="sum"><span>Total</span><b>{inr(total)}</b></li>
            </ul>
          ) : (
            <p className="lead">Nothing selected yet. Use the + button on a service to add it.</p>
          )}
          <button type="button" className="btn full" disabled={!chosen.length} onClick={() => setPaying(true)}>
            Proceed to pay <ArrowRight size={15} />
          </button>
        </Card>
      </div>
    </PageShell>
  );
}