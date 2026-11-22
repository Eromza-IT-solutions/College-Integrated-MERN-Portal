import { createContext, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* SAMPLE DATA — replace with your API data (or pass as props).        */
/* ------------------------------------------------------------------ */

export const DEFAULT_STUDENT = { name: "Ayesha Khan", course: "B.Sc. Computer Science", semester: 5, roll: "CS2023-045" };

export const DEFAULT_BROCHURES = [
  { code: "BRC-SCI-2627-04821", name: "Science Faculty Brochure 2026–27", price: 100, purchasedOn: "2026-05-28", validUntil: "2026-12-31", status: "Used" },
  { code: "BRC-PG-2627-01377", name: "Post Graduate Brochure 2026–27", price: 100, purchasedOn: "2026-11-02", validUntil: "2026-12-31", status: "Active" },
  { code: "BRC-ART-2526-07745", name: "Arts Faculty Brochure 2025–26", price: 100, purchasedOn: "2025-06-10", validUntil: "2025-12-31", status: "Expired" },
];

// Fees still to be paid (type "pending"). lateFinePerDay is charged after the due date.
export const DEFAULT_DUES = [
  { id: "d1", label: "Tuition fee — Semester 5 balance", amount: 8000, due: "2026-12-05" },
  { id: "d2", label: "Laboratory fee", amount: 2500, due: "2026-11-15" },
  { id: "d3", label: "Development fund", amount: 1000, due: "2026-11-30" },
  { id: "d4", label: "Gymkhana & activities fee", amount: 1000, due: "2026-11-30" },
];
export const LATE_FINE = { perDay: 10, max: 500 };

// Admission fee for the application the student has submitted (status: locked | due | paid)
export const DEFAULT_ADMISSION = {
  status: "due",
  title: "Admission fee · M.Sc. Part I",
  lastDate: "2026-12-29",
  items: [["Tuition fee", 6500], ["Admission fee", 500], ["Laboratory fee", 1500], ["Library fee", 300], ["Gymkhana fee", 400], ["Development fund", 1000], ["Student welfare fund", 200], ["University enrolment / eligibility", 450]],
};

export const DEFAULT_MISC = [
  { id: "bonafide", label: "Bonafide certificate", price: 50, icon: "file" },
  { id: "character", label: "Character certificate", price: 50, icon: "file" },
  { id: "tc", label: "Transfer certificate (TC)", price: 100, icon: "file" },
  { id: "migration", label: "Migration certificate", price: 300, icon: "file" },
  { id: "marksheet", label: "Duplicate mark sheet", price: 200, icon: "file" },
  { id: "idcard", label: "Duplicate ID card", price: 150, icon: "id" },
  { id: "library", label: "Duplicate library card", price: 50, icon: "id" },
  { id: "transcript", label: "Transcript (per copy)", price: 250, icon: "file" },
];

// Online payments (receipts the student can download)
export const DEFAULT_PAYMENTS = [
  { no: "RCP-2026-00412", date: "2026-07-10T11:20:00", title: "Tuition fee — Semester 5 (instalment 1)", items: [{ label: "Tuition fee", amount: 20000 }], total: 20000, mode: "UPI", txn: "TXN4021877310", type: "pending" },
  { no: "RCP-2026-00987", date: "2026-08-02T16:05:00", title: "Tuition fee — Semester 5 (instalment 2)", items: [{ label: "Tuition fee", amount: 10000 }], total: 10000, mode: "Net banking", txn: "TXN4021955526", type: "pending" },
  { no: "RCP-2026-01544", date: "2026-09-14T10:42:00", title: "Miscellaneous — Bonafide certificate", items: [{ label: "Bonafide certificate × 1", amount: 50 }], total: 50, mode: "UPI", txn: "TXN4022210984", type: "misc" },
];

// Receipts issued at the college office (cash / cheque / DD)
export const DEFAULT_COLLEGE_RECEIPTS = [
  { no: "COL-23-1184", date: "2023-07-18T12:10:00", title: "Admission fee · F.Y.B.Sc.", items: [{ label: "Admission fee (all heads)", amount: 8650 }], total: 8650, mode: "Cash", txn: "—", type: "admission" },
  { no: "COL-24-0877", date: "2024-07-22T11:35:00", title: "Tuition & other fees · S.Y.B.Sc.", items: [{ label: "Tuition & other fees", amount: 9400 }], total: 9400, mode: "Cheque", txn: "Chq 004512", type: "pending" },
  { no: "COL-25-0932", date: "2025-07-25T13:05:00", title: "Tuition & other fees · T.Y.B.Sc.", items: [{ label: "Tuition & other fees", amount: 10200 }], total: 10200, mode: "Demand Draft", txn: "DD 118273", type: "pending" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
export const dateOf = (s) => new Date(s.length <= 10 ? `${s}T00:00:00` : s);
export const fmt = (s, o = { day: "numeric", month: "short", year: "numeric" }) => (s instanceof Date ? s : dateOf(s)).toLocaleDateString("en-IN", o);
export const daysLeft = (s, now) => Math.ceil((dateOf(s) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
export const lateFine = (due, now) => {
  const late = -daysLeft(due, now);
  return late > 0 ? Math.min(late * LATE_FINE.perDay, LATE_FINE.max) : 0;
};

function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const RECEIPT_CSS = `body{font-family:Arial,sans-serif;color:#111;max-width:720px;margin:24px auto;padding:0 16px}
.r{border:1px solid #bbb;padding:26px 30px;margin-bottom:28px;page-break-after:always}
.h{display:flex;justify-content:space-between;border-bottom:3px double #222;padding-bottom:12px;margin-bottom:14px}
.h small{color:#9b1230;letter-spacing:.14em;font-size:11px;font-weight:700}.h h1{margin:2px 0;font-size:22px;color:#0f1d57}.h p{margin:2px 0;font-size:12px}
.tag{align-self:flex-start;padding:4px 14px;border:2px solid #14753f;color:#14753f;font-weight:700;letter-spacing:.1em;font-size:13px;transform:rotate(-4deg)}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}td,th{border:1px solid #cfd3e2;padding:6px 10px;text-align:left}th{background:#eef1fa}
td.r2,th.r2{text-align:right}.t td{font-weight:700;background:#f6f7fc}.meta td:first-child{width:34%;background:#fafbfe}
.f{margin-top:18px;font-size:11.5px;color:#555}@media print{.r{border:0}}`;

export function receiptBlock(rc, student) {
  return `<div class="r"><div class="h"><div><small>M.C.E. SOCIETY'S</small><h1>Abeda Inamdar Senior College</h1><p>2390-B, K.B. Hidayatullah Road, Azam Campus, Camp, Pune 411001</p><p><b>Fee Receipt</b></p></div><div class="tag">PAID</div></div>
<table class="meta"><tr><td>Receipt no.</td><td>${esc(rc.no)}</td></tr><tr><td>Date</td><td>${esc(fmt(rc.date, { day: "numeric", month: "long", year: "numeric" }))}</td></tr>
<tr><td>Student</td><td>${esc(student.name)} · ${esc(student.course)} · Roll no. ${esc(student.roll)}</td></tr>
<tr><td>Payment mode</td><td>${esc(rc.mode)}</td></tr><tr><td>Transaction / reference</td><td>${esc(rc.txn)}</td></tr><tr><td>Particulars</td><td>${esc(rc.title)}</td></tr></table>
<table><tr><th>Sr.</th><th>Description</th><th class="r2">Amount</th></tr>${rc.items.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.label)}</td><td class="r2">${esc(inr(i.amount))}</td></tr>`).join("")}
<tr class="t"><td colspan="2">Total paid</td><td class="r2">${esc(inr(rc.total))}</td></tr></table>
<p class="f">This is a computer-generated receipt and does not require a signature.</p></div>`;
}

export const receiptsHtml = (list, student) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fee receipts</title><style>${RECEIPT_CSS}</style></head><body>${list.map((r) => receiptBlock(r, student)).join("")}</body></html>`;

export function saveHtml(name, html) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printHtml(html) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/* ------------------------------------------------------------------ */
/* Shared state                                                        */
/* ------------------------------------------------------------------ */

// Default URL of every page. Change these to match your router / sidebar.
export const ROUTES = {
  brochures: "/student/payments/brochure-codes",
  admission: "/student/payments/admission-fee",
  pending: "/student/payments/pending-fee",
  misc: "/student/payments/miscellaneous-fee",
  receipts: "/student/payments/payment-receipts",
  college: "/student/payments/college-receipts",
};

const Ctx = createContext(null);
export const usePayments = () => useContext(Ctx);

/**
 * Wrap ALL payment routes in this provider once, so dues, payments and receipts are shared:
 *   <PaymentsProvider onNavigate={(id) => navigate(ROUTES[id])} onPay={(order) => api.pay(order)}> ... </PaymentsProvider>
 */
export function PaymentsProvider({
  children,
  student = DEFAULT_STUDENT,
  brochures = DEFAULT_BROCHURES,
  initialDues = DEFAULT_DUES,
  initialAdmission = DEFAULT_ADMISSION,
  miscCatalogue = DEFAULT_MISC,
  initialPayments = DEFAULT_PAYMENTS,
  collegeReceipts = DEFAULT_COLLEGE_RECEIPTS,
  onNavigate,
  onPay, // async ({ type, items, total, method }) => void — call your payment gateway here
}) {
  const [dues, setDues] = useState(initialDues);
  const [admission, setAdmission] = useState(initialAdmission);
  const [payments, setPayments] = useState(initialPayments);
  const now = useNow();
  const go = (id) => (onNavigate ? onNavigate(id) : (window.location.href = ROUTES[id]));

  const TITLES = { admission: "Admission fee", pending: "Pending fee", misc: "Miscellaneous fee" };
  const pay = async ({ type, items, total, method, paidIds = [], title }) => {
    if (onPay) await onPay({ type, items, total, method });
    else await new Promise((r) => setTimeout(r, 1500)); // simulated gateway
    const stamp = Date.now().toString();
    const receipt = {
      no: `RCP-${new Date().getFullYear()}-${stamp.slice(-5)}`,
      date: new Date().toISOString(),
      title: title || TITLES[type],
      items: items.map((i) => ({ label: i.label, amount: i.amount })),
      total,
      mode: { upi: "UPI", card: "Credit / Debit card", net: "Net banking" }[method],
      txn: `TXN${stamp.slice(-10)}`,
      type,
    };
    setPayments((p) => [receipt, ...p]);
    if (type === "pending") setDues((d) => d.filter((x) => !paidIds.includes(x.id)));
    if (type === "admission") setAdmission((a) => ({ ...a, status: "paid" }));
    return receipt;
  };

  return (
    <Ctx.Provider value={{ student, brochures, dues, admission, miscCatalogue, payments, collegeReceipts, pay, now, go }}>
      {children}
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */

export const Card = ({ title, action, children, className = "" }) => (
  <section className={"card " + className}>
    {(title || action) && (
      <header className="card-h">
        {title && <h3>{title}</h3>}
        {action}
      </header>
    )}
    {children}
  </section>
);

export const Pill = ({ tone = "gray", children }) => <span className={"pill " + tone}>{children}</span>;

export function Notice({ tone = "info", children, onClose }) {
  const Icon = tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div className={"notice " + tone} role={tone === "ok" ? "status" : "alert"}>
      <Icon size={18} />
      <div>{children}</div>
      {onClose && <button type="button" aria-label="Dismiss" onClick={onClose}><X size={15} /></button>}
    </div>
  );
}

export const Stat = ({ label, value, sub, tone = "" }) => (
  <div className={"stat " + tone}><span>{label}</span><b>{value}</b><small>{sub}</small></div>
);

/** Banner + styles used by every page (no sidebar, no top bar). */
export function PageShell({ title, children }) {
  const { student } = usePayments();
  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="pay">
      <style>{css}</style>
      <section className="hero">
        <div className="hero-id">
          <span className="avatar">{initials}</span>
          <div>
            <small>Payments &amp; Brochures</small>
            <h1>{title}</h1>
            <p>{student.name} · {student.course} · Roll no. {student.roll}</p>
          </div>
        </div>
        <div className="hero-chip">Secure payments · 256-bit encrypted</div>
        <span className="ring r1" aria-hidden="true" /><span className="ring r2" aria-hidden="true" />
      </section>
      <div className="view">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles — same navy / crimson / gold theme as the student dashboard  */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');
.pay{--navy:#0f1d57;--navy2:#16276e;--crimson:#9b1230;--gold:#e3b82b;--ink:#1b2250;--mut:#6b7392;--line:#e6e9f5;--bg:#f6f7fc;--green:#14753f;
  font-family:'Poppins',system-ui,sans-serif;color:var(--ink);padding:28px 32px 48px;background:var(--bg);min-height:100%}
.pay *{box-sizing:border-box}
.pay button,.pay input,.pay select{font-family:inherit}
.pay button:focus-visible,.pay input:focus-visible,.pay select:focus-visible,.pay a:focus-visible{outline:3px solid var(--gold);outline-offset:2px}

.hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:28px 34px;border-radius:20px;color:#fff;
  background:linear-gradient(110deg,#0c1747 0%,#14246b 60%,#1a2c7c 100%);box-shadow:0 14px 30px rgba(15,29,87,.22)}
.hero-id{display:flex;gap:18px;align-items:center;position:relative;z-index:1}
.avatar{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:#fff;color:var(--navy);border:3px solid var(--gold);font:700 21px 'Playfair Display',serif}
.hero small{font-size:12.5px;color:#c8d0f5;letter-spacing:.03em}
.hero h1{margin:2px 0 4px;font:700 27px/1.2 'Playfair Display',serif}
.hero p{margin:0;font-size:13px;color:#d6dcf8}
.hero-chip{position:relative;z-index:1;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:13px;color:var(--gold)}
.ring{position:absolute;border-radius:50%;border:26px solid rgba(255,255,255,.05);pointer-events:none}
.r1{width:260px;height:260px;right:-50px;top:-120px}.r2{width:180px;height:180px;right:200px;bottom:-110px;border-color:rgba(227,184,43,.12)}

.view{margin-top:22px;display:grid;gap:20px;animation:rise .3s ease}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px 26px;box-shadow:0 2px 8px rgba(15,29,87,.04)}
.card-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.card h3{margin:0;font:700 21px 'Playfair Display',serif;color:var(--navy)}
.grid-2{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:start}
.stack{display:grid;gap:20px;align-content:start}
.lead{margin:0 0 14px;font-size:13.5px;color:var(--mut);line-height:1.6}
.sticky{position:sticky;top:16px}

.pill{display:inline-block;padding:3px 11px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}
.pill.gray{background:#eef0f8;color:var(--navy)}.pill.blue{background:#e4eaff;color:#233a9c}.pill.gold{background:#fff3cc;color:#7a5a00}
.pill.red{background:#fbe8ed;color:var(--crimson)}.pill.green{background:#e3f5ea;color:var(--green)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:0;border-radius:12px;cursor:pointer;text-decoration:none;
  background:linear-gradient(180deg,#b01836,var(--crimson));color:#fff;font-size:13.5px;font-weight:600;box-shadow:0 8px 18px rgba(155,18,48,.28);transition:transform .15s,box-shadow .15s}
.btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 22px rgba(155,18,48,.36)}
.btn:disabled{opacity:.6;cursor:not-allowed}
.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy);box-shadow:none}
.btn.ghost:hover:not(:disabled){background:#eef0f8;box-shadow:none}
.btn.full{width:100%}.btns{display:flex;gap:12px;flex-wrap:wrap}
.mini{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:10px;border:1px solid var(--navy);background:#fff;color:var(--navy);font-size:12.5px;font-weight:600;cursor:pointer}
.mini:hover{background:var(--navy);color:#fff}
.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

.notice{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:12px;font-size:13.5px;line-height:1.55}
.notice div{flex:1}.notice button{border:0;background:none;cursor:pointer;color:inherit;opacity:.7}
.notice.ok{background:#e8f6ee;color:var(--green);border:1px solid #c5e8d3}
.notice.warn,.notice.info{background:#fff6dc;color:#7a5a00;border:1px solid #f1dea0}
.notice.bad{background:#fdecef;color:#a3122a;border:1px solid #f3c4cc}

.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.stat{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;transition:transform .2s,box-shadow .2s}
.stat:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(15,29,87,.1)}
.stat span{font-size:13px;color:var(--mut)}.stat b{font:700 27px 'Playfair Display',serif;color:var(--navy)}.stat small{font-size:12px;color:var(--mut)}
.stat.good b{color:var(--green)}.stat.warn b{color:var(--crimson)}

.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{padding:9px 12px;text-align:left;font-size:12px;font-weight:500;color:var(--mut);border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:13px 12px;border-bottom:1px solid #f0f2fa;vertical-align:middle}
tr:last-child td{border-bottom:0}td small{display:block;font-size:11.5px;color:var(--mut)}
td.r,th.r{text-align:right}
tr.total td{background:#f3f5fd;font-weight:600;color:var(--navy);font-size:15px}
tr.total td.r{font:700 21px 'Playfair Display',serif}

.filters{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.search{flex:1;min-width:200px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:12px;background:#f0f3fc;border:1px solid #d6dbef}
.search input{flex:1;border:0;background:none;padding:12px 0;font-size:14px;color:var(--ink);outline:0!important}
.search:focus-within{background:#fff;border-color:var(--navy)}
.sel{padding:12px 14px;border-radius:12px;border:1px solid #d6dbef;background:#f0f3fc;font-size:13.5px;color:var(--ink)}
.empty{padding:34px 16px;text-align:center;color:var(--mut);font-size:14px}

/* checkout */
.methods{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.methods button{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;border-radius:14px;cursor:pointer;background:#fff;border:1.5px solid var(--line);color:var(--ink);font-size:13px;font-weight:500;transition:all .15s}
.methods button:hover{border-color:#b9c1e6}
.methods button.on{border-color:var(--navy);background:#f3f5fd;color:var(--navy);box-shadow:0 6px 14px rgba(15,29,87,.1)}
.methods button.on svg{color:var(--crimson)}
.f{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.f label{font-size:12px;font-weight:600;letter-spacing:.03em;color:#3a4170}
.f input,.f select{width:100%;padding:12px 14px;border:1px solid #d6dbef;border-radius:12px;background:#f0f3fc;font-size:14px;color:var(--ink)}
.f input:focus,.f select:focus{background:#fff;border-color:var(--navy)}
.f.bad input,.f.bad select{border-color:#d92d20;background:#fff6f5}
.f small{font-size:12px;color:#d92d20;font-weight:500}.f small.h{color:var(--mut);font-weight:400}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.summary{list-style:none;margin:0 0 14px;padding:0}
.summary li{display:flex;justify-content:space-between;gap:12px;padding:11px 0;font-size:13.5px;border-bottom:1px dashed var(--line)}
.summary li small{display:block;font-size:11.5px;color:var(--mut)}
.summary li.late b{color:var(--crimson)}
.summary li.sum{border-bottom:0;padding-top:16px;font-weight:600;color:var(--navy)}
.summary li.sum b{font:700 26px 'Playfair Display',serif}
.secure{display:flex;align-items:center;gap:8px;margin:12px 0 0;font-size:12px;color:var(--mut)}

.success{text-align:center;padding:34px 16px}
.success .tick{width:72px;height:72px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:#e3f5ea;color:var(--green);animation:pop .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
.success h3{margin:0 0 6px;font:700 26px 'Playfair Display',serif;color:var(--navy)}
.success p{margin:0 0 18px;color:var(--mut);font-size:14px}
.success .btns{justify-content:center}
.rc{display:inline-grid;grid-template-columns:auto auto;gap:6px 26px;text-align:left;margin:0 0 22px;padding:16px 22px;border-radius:14px;background:#f3f5fd;border:1px dashed #b4bce0;font-size:13px}
.rc dt{color:var(--mut)}.rc dd{margin:0;font-weight:600;color:var(--navy)}

/* dues + misc */
.pick{display:grid;gap:10px}
.pick label{display:grid;grid-template-columns:24px 1fr auto;gap:14px;align-items:center;padding:14px 16px;border:1.5px solid var(--line);border-radius:14px;cursor:pointer;transition:all .15s;background:#fff}
.pick label:hover{border-color:#b9c1e6}.pick label.on{border-color:var(--navy);background:#f3f5fd}
.pick input{width:18px;height:18px;accent-color:var(--crimson)}
.pick b{display:block;font-size:14px;font-weight:600}.pick small{font-size:12px;color:var(--mut)}
.pick .amt{text-align:right;font:700 18px 'Playfair Display',serif;color:var(--navy)}.pick .amt small{display:block;font:400 11.5px 'Poppins',sans-serif}
.catalog{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.cat{padding:16px;border:1.5px solid var(--line);border-radius:16px;background:#fff;display:flex;flex-direction:column;gap:10px;transition:all .15s}
.cat.on{border-color:var(--navy);background:#f3f5fd;box-shadow:0 8px 18px rgba(15,29,87,.1)}
.cat .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#eef0f8;color:var(--navy)}
.cat.on .ic{background:var(--navy);color:var(--gold)}
.cat b{font-size:14px}.cat .price{font:700 20px 'Playfair Display',serif;color:var(--navy)}
.qty{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;border:1px solid #d6dbef;border-radius:10px;background:#fff}
.qty button{width:32px;height:32px;border:0;background:none;cursor:pointer;color:var(--navy);display:grid;place-items:center;border-radius:8px}
.qty button:hover:not(:disabled){background:#eef0f8}.qty button:disabled{opacity:.35;cursor:not-allowed}
.qty span{min-width:26px;text-align:center;font-weight:600;font-size:14px}

/* brochure codes */
.codes{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:16px}
.code{position:relative;overflow:hidden;padding:20px;border-radius:18px;color:#fff;background:linear-gradient(120deg,#0c1747,#1a2c7c);box-shadow:0 10px 22px rgba(15,29,87,.2)}
.code.dim{background:linear-gradient(120deg,#4a5070,#6a7090);box-shadow:none}
.code::after{content:"";position:absolute;right:-40px;top:-50px;width:150px;height:150px;border-radius:50%;border:20px solid rgba(255,255,255,.07)}
.code small{color:#c8d0f5;font-size:12px}.code h4{margin:4px 0 14px;font-size:15px;font-weight:600;position:relative;z-index:1}
.code .val{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.12);border:1px dashed rgba(255,255,255,.4);position:relative;z-index:1}
.code .val code{font:600 15px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;color:var(--gold);overflow-wrap:anywhere}
.code .copy{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:0;background:#fff;color:var(--navy);font-size:12px;font-weight:600;cursor:pointer}
.code .copy.done{background:var(--green);color:#fff}
.code .foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;font-size:12px;color:#d6dcf8;position:relative;z-index:1}
.steps{margin:0;padding-left:18px;font-size:13.5px;color:var(--mut);line-height:1.9}

@media(max-width:1100px){.grid-2{grid-template-columns:1fr}.sticky{position:static}}
@media(max-width:760px){
  .pay{padding:16px 14px 36px}.hero{padding:22px 20px}.hero h1{font-size:22px}
  .stats{grid-template-columns:1fr}.row2{grid-template-columns:1fr}.card{padding:18px 16px}
  .methods button{font-size:11.5px}
}
@media(prefers-reduced-motion:reduce){.view,.success .tick,.btn,.stat,.spin{animation:none!important;transition:none!important}}
`;