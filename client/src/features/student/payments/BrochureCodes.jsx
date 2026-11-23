import { useState } from "react";
import { Copy, Check, Search } from "lucide-react";
import { Card, Pill, PageShell, inr, fmt, usePayments } from "./PaymentsShared";

const TONE = { Active: "green", Used: "gold", Expired: "red" };

function CodeCard({ b }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(b.code);
    } catch {
      const t = document.createElement("textarea");
      t.value = b.code;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article className={"code" + (b.status === "Expired" ? " dim" : "")}>
      <small>{inr(b.price)} · bought {fmt(b.purchasedOn)}</small>
      <h4>{b.name}</h4>
      <div className="val">
        <code>{b.code}</code>
        <button type="button" className={"copy" + (copied ? " done" : "")} onClick={copy} aria-label={`Copy code ${b.code}`}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
      <div className="foot">
        <span>Valid until {fmt(b.validUntil)}</span>
        <Pill tone={TONE[b.status]}>{b.status}</Pill>
      </div>
    </article>
  );
}

export default function BrochureCodes() {
  const { brochures } = usePayments();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const list = brochures.filter((b) => (status === "all" || b.status === status) && `${b.name} ${b.code}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <PageShell title="View Brochure Codes">
      <Card title="Your brochure codes" action={<Pill tone="blue">{brochures.length} code{brochures.length === 1 ? "" : "s"}</Pill>}>
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by brochure name or code…" aria-label="Search brochure codes" />
          </label>
          <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option>Active</option><option>Used</option><option>Expired</option>
          </select>
        </div>
        {list.length ? (
          <div className="codes">{list.map((b) => <CodeCard key={b.code} b={b} />)}</div>
        ) : (
          <div className="empty"><p>No brochure codes found.</p></div>
        )}
      </Card>

      <Card title="How to use a brochure code">
        <ol className="steps">
          <li>Copy the code of the brochure that matches your course.</li>
          <li>Enter it in the <b>Brochure code</b> field when you register or fill the admission form.</li>
          <li>An <b>Active</b> code can be used once. It shows <b>Used</b> after registration and <b>Expired</b> after its validity date.</li>
        </ol>
      </Card>
    </PageShell>
  );
}