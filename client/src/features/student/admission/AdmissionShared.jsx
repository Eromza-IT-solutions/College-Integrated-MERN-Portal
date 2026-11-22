import { createContext, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { INITIAL_VALUES } from "./AdmissionSchema";

/* ------------------------------------------------------------------ */
/* SAMPLE DATA — replace with your API data (or pass as props).        */
/* ------------------------------------------------------------------ */

export const DEFAULT_STUDENT = { name: "Ayesha Khan" };
export const DEFAULT_YEAR = "2026–27";

// Form submission schedule. status (Past / Open / Upcoming) is worked out from today's date.
export const DEFAULT_DATES = [
  { id: "start", title: "Online form filling starts", date: "2026-11-10", note: "Fill the online admission form on the student portal." },
  { id: "last", title: "Last date to submit the form", date: "2026-12-05", note: "Submit the form and upload all required documents." },
  { id: "late", title: "Last date with late fee", date: "2026-12-12", note: "Forms submitted after the last date attract a late fee." },
  { id: "merit", title: "Merit list display", date: "2026-12-16", note: "Check your status in My Admission Info." },
  { id: "verify", title: "Document verification", date: "2026-12-18", end: "2026-12-22", note: "Bring original documents to the college office." },
  { id: "fee", title: "Fee payment for selected students", date: "2026-12-23", end: "2026-12-29", note: "Pay the fee online using the pay fee menu." },
  { id: "classes", title: "Commencement of classes", date: "2027-01-04", note: "Collect your ID card after document submission." },
];

// Fee structure per section (sample amounts)
export const DEFAULT_FEES = {
  Arts: [["Tuition fee", 4500], ["Admission fee", 500], ["Library fee", 300], ["Gymkhana fee", 400], ["Development fund", 1000], ["Student welfare fund", 200], ["University enrolment / eligibility", 450]],
  Commerce: [["Tuition fee", 5500], ["Admission fee", 500], ["Library fee", 300], ["Gymkhana fee", 400], ["Development fund", 1000], ["Student welfare fund", 200], ["University enrolment / eligibility", 450]],
  Science: [["Tuition fee", 6500], ["Admission fee", 500], ["Laboratory fee", 1500], ["Library fee", 300], ["Gymkhana fee", 400], ["Development fund", 1000], ["Student welfare fund", 200], ["University enrolment / eligibility", 450]],
};

export const TRACKER = ["Form submitted", "Under review", "Approved", "Fee payment", "Documents verified", "Admission confirmed"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const inr = (n) => "₹" + n.toLocaleString("en-IN");
export const dateOf = (s) => new Date(`${s}T00:00:00`);
export const fmt = (s, o = { day: "numeric", month: "short", year: "numeric" }) =>
  (s instanceof Date ? s : dateOf(s)).toLocaleDateString("en-IN", o);
export const daysLeft = (s, now) => Math.ceil((dateOf(s) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);

function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Shared state                                                        */
/* ------------------------------------------------------------------ */

// Default URL of every page. Change these to match your router / sidebar.
export const ROUTES = {
  fill: "/student/admission/fill-form",
  update: "/student/admission/update-form",
  print: "/student/admission/print-form",
  download: "/student/admission/download-form",
  dates: "/student/admission/submission-dates",
  fee: "/student/admission/fee-details",
  info: "/student/admission/my-admission-info",
};

const Ctx = createContext(null);
export const useAdmission = () => useContext(Ctx);

/**
 * Wrap ALL admission routes in this provider once, so the draft and the submitted
 * application are shared between the separate pages:
 *   <AdmissionProvider onNavigate={(id) => navigate(ROUTES[id])}> ...routes... </AdmissionProvider>
 */
export function AdmissionProvider({
  children,
  student = DEFAULT_STUDENT,
  academicYear = DEFAULT_YEAR,
  dates = DEFAULT_DATES,
  fees = DEFAULT_FEES,
  onNavigate,
  onPayFee,
  onSubmitApplication, // async (application) => void — send to your backend here
}) {
  const [draft, setDraft] = useState(INITIAL_VALUES);
  const [application, setApplication] = useState(null);
  const now = useNow();

  const go = (id) => (onNavigate ? onNavigate(id) : (window.location.href = ROUTES[id]));

  const submitApplication = async (values) => {
    const app = {
      ref: `AISC-ADM-${Date.now().toString().slice(-7)}`,
      submittedOn: new Date().toISOString(),
      updatedOn: null,
      statusIndex: 1, // 0 submitted, 1 under review … set from your backend
      values,
    };
    await onSubmitApplication?.(app);
    setApplication(app);
    return app;
  };
  const updateApplication = async (values) => {
    const next = { ...application, values, updatedOn: new Date().toISOString() };
    await onSubmitApplication?.(next);
    setApplication(next);
  };

  return (
    <Ctx.Provider value={{ student, academicYear, dates, fees, draft, setDraft, application, submitApplication, updateApplication, onPayFee, now, go }}>
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

/** Banner + styles used by every page (no sidebar, no top bar). */
export function PageShell({ title, children, wide = false }) {
  const { student, academicYear, application } = useAdmission();
  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="ad">
      <style>{css}</style>
      <section className="hero">
        <div className="hero-id">
          <span className="avatar">{initials}</span>
          <div>
            <small>Admission · Academic Year {academicYear}</small>
            <h1>{title}</h1>
            <p>{student.name}</p>
          </div>
        </div>
        <div className="hero-chip">
          {application ? <>Application <b>{application.ref}</b></> : "Application not submitted yet"}
        </div>
        <span className="ring r1" aria-hidden="true" /><span className="ring r2" aria-hidden="true" />
      </section>
      <div className={"view" + (wide ? " wide" : "")}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles — same navy / crimson / gold theme as the student dashboard  */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');
.ad{--navy:#0f1d57;--navy2:#16276e;--crimson:#9b1230;--gold:#e3b82b;--ink:#1b2250;--mut:#6b7392;--line:#e6e9f5;--bg:#f6f7fc;--green:#14753f;
  font-family:'Poppins',system-ui,sans-serif;color:var(--ink);padding:28px 32px 48px;background:var(--bg);min-height:100%}
.ad *{box-sizing:border-box}
.ad button,.ad input,.ad select,.ad textarea{font-family:inherit}
.ad button:focus-visible,.ad input:focus-visible,.ad select:focus-visible,.ad textarea:focus-visible,.ad a:focus-visible{outline:3px solid var(--gold);outline-offset:2px}

.hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  padding:28px 34px;border-radius:20px;color:#fff;background:linear-gradient(110deg,#0c1747 0%,#14246b 60%,#1a2c7c 100%);box-shadow:0 14px 30px rgba(15,29,87,.22)}
.hero-id{display:flex;gap:18px;align-items:center;position:relative;z-index:1}
.avatar{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:#fff;color:var(--navy);border:3px solid var(--gold);font:700 21px 'Playfair Display',serif}
.hero small{font-size:12.5px;color:#c8d0f5;letter-spacing:.03em}
.hero h1{margin:2px 0 4px;font:700 27px/1.2 'Playfair Display',serif}
.hero p{margin:0;font-size:13px;color:#d6dcf8}
.hero-chip{position:relative;z-index:1;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:13px;color:#e8ecff}
.hero-chip b{color:var(--gold);font-weight:600}
.ring{position:absolute;border-radius:50%;border:26px solid rgba(255,255,255,.05);pointer-events:none}
.r1{width:260px;height:260px;right:-50px;top:-120px}
.r2{width:180px;height:180px;right:170px;bottom:-110px;border-color:rgba(227,184,43,.12)}

.view{margin-top:22px;animation:rise .3s ease;display:grid;gap:20px}
.view.wide{max-width:none}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px 26px;box-shadow:0 2px 8px rgba(15,29,87,.04)}
.card-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.card h3{margin:0;font:700 21px 'Playfair Display',serif;color:var(--navy)}
.grid-2{display:grid;grid-template-columns:1.6fr 1fr;gap:20px;align-items:start}
.stack{display:grid;gap:20px;align-content:start}
.lead{margin:0 0 16px;font-size:13.5px;color:var(--mut);line-height:1.6}
.muted{color:var(--mut)}

.pill{display:inline-block;padding:3px 11px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}
.pill.gray{background:#eef0f8;color:var(--navy)}.pill.blue{background:#e4eaff;color:#233a9c}
.pill.gold{background:#fff3cc;color:#7a5a00}.pill.red{background:#fbe8ed;color:var(--crimson)}.pill.green{background:#e3f5ea;color:var(--green)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:0;border-radius:12px;cursor:pointer;text-decoration:none;
  background:linear-gradient(180deg,#b01836,var(--crimson));color:#fff;font-size:13.5px;font-weight:600;box-shadow:0 8px 18px rgba(155,18,48,.28);transition:transform .15s,box-shadow .15s}
.btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 22px rgba(155,18,48,.36)}
.btn:disabled{opacity:.65;cursor:not-allowed}
.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy);box-shadow:none}
.btn.ghost:hover:not(:disabled){background:#eef0f8;box-shadow:none}
.btn.navy{background:linear-gradient(180deg,var(--navy2),var(--navy));box-shadow:0 8px 18px rgba(15,29,87,.28)}
.btns{display:flex;gap:12px;flex-wrap:wrap}

.notice{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:12px;font-size:13.5px;line-height:1.55}
.notice div{flex:1}.notice button{border:0;background:none;cursor:pointer;color:inherit;opacity:.7}
.notice.ok{background:#e8f6ee;color:var(--green);border:1px solid #c5e8d3}
.notice.warn,.notice.info{background:#fff6dc;color:#7a5a00;border:1px solid #f1dea0}
.notice.bad{background:#fdecef;color:#a3122a;border:1px solid #f3c4cc}

/* ---- wizard ---- */
.stepper{list-style:none;margin:0;padding:0;display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.stepper li{flex:1;min-width:92px}
.stepper button{width:100%;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border:0;background:none;cursor:pointer;color:var(--mut);font-size:11.5px;font-weight:500}
.stepper .n{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:600;background:#eef0f8;color:var(--navy);border:2px solid transparent;transition:all .2s}
.stepper li.done .n{background:var(--green);color:#fff}
.stepper li.cur .n{background:var(--navy);color:#fff;border-color:var(--gold);box-shadow:0 0 0 4px rgba(227,184,43,.25)}
.stepper li.cur button{color:var(--navy);font-weight:600}
.stepper button:disabled{cursor:not-allowed;opacity:.55}
.prog{display:flex;align-items:center;gap:14px;margin:6px 0 4px}
.bar{flex:1;height:8px;border-radius:99px;background:#e8ebf6;overflow:hidden}
.bar div{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--navy2),var(--gold));transition:width .5s cubic-bezier(.2,.8,.2,1)}
.prog span{font-size:12.5px;color:var(--mut);white-space:nowrap}.prog b{color:var(--crimson)}

.step-h{margin:0 0 4px;font:700 22px 'Playfair Display',serif;color:var(--navy)}
.fields{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 20px;margin-top:18px}
.field{display:flex;flex-direction:column;gap:6px;min-width:0}
.field.wide,.field.check-f{grid-column:1/-1}
.field>label,.field>.lbl{font-size:12px;font-weight:600;letter-spacing:.03em;color:#3a4170}
.field .req{color:var(--crimson)}
.field input[type=text],.field input[type=email],.field input[type=tel],.field input[type=date],.field select{width:100%;padding:12px 14px;border:1px solid #d6dbef;border-radius:12px;background:#f0f3fc;font-size:14px;color:var(--ink);transition:border .15s,background .15s}
.field input:focus,.field select:focus{background:#fff;border-color:var(--navy)}
.field input:disabled,.field select:disabled{background:#e9ecf6;color:#69708f;cursor:not-allowed}
.field.bad input,.field.bad select,.field.bad .drop{border-color:#d92d20;background:#fff6f5}
.field small.e{font-size:12px;color:#d92d20;font-weight:500}
.field small.h{font-size:11.5px;color:var(--mut)}
.check{display:flex;gap:10px;align-items:center;padding:13px 16px;border-radius:12px;background:#f3f5fd;border:1px solid var(--line);font-size:13.5px;cursor:pointer}
.check input{width:18px;height:18px;accent-color:var(--crimson)}
.check.disabled{opacity:.6;cursor:not-allowed}
.radios{display:flex;gap:10px}
.radios label{display:flex;gap:8px;align-items:center;padding:11px 20px;border:1.5px solid var(--line);border-radius:12px;font-size:13.5px;cursor:pointer;background:#fff}
.radios label.on{border-color:var(--navy);background:#f3f5fd}
.radios input{accent-color:var(--crimson)}

.drop{display:flex;align-items:center;gap:14px;padding:14px;border:2px dashed #c5cbe8;border-radius:14px;background:#f6f7fc}
.drop .thumb{width:54px;height:54px;border-radius:10px;object-fit:cover;background:#e5e8f4;flex-shrink:0;display:grid;place-items:center;color:var(--navy)}
.drop .meta{flex:1;min-width:0;font-size:13px}
.drop .meta b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drop .meta small{color:var(--mut)}
.mini{padding:8px 14px;border-radius:10px;border:1px solid var(--navy);background:#fff;color:var(--navy);font-size:12.5px;font-weight:600;cursor:pointer}
.mini:hover{background:var(--navy);color:#fff}

.nav-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:26px;padding-top:20px;border-top:1px solid var(--line)}
.saved{font-size:12px;color:var(--green);display:inline-flex;align-items:center;gap:6px}

.review{display:grid;gap:16px;margin-top:16px}
.review-sec{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.review-sec header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f3f5fd}
.review-sec h4{margin:0;font-size:14px;color:var(--navy)}
.review-sec dl{display:grid;grid-template-columns:repeat(2,1fr);gap:0 24px;margin:0;padding:6px 16px 12px}
.review-sec dl div{padding:8px 0;border-bottom:1px solid #f0f2fa;min-width:0}
.review-sec dt{font-size:11.5px;color:var(--mut)}.review-sec dd{margin:2px 0 0;font-size:13.5px;font-weight:500;overflow-wrap:anywhere}
.agree{display:flex;gap:10px;align-items:flex-start;margin:18px 0 4px;font-size:13px;color:var(--mut);line-height:1.5}
.agree input{margin-top:3px;accent-color:var(--crimson)}

.success{text-align:center;padding:36px 20px}
.success .tick{width:70px;height:70px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:#e3f5ea;color:var(--green);animation:pop .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
.success h3{margin:0 0 6px;font:700 26px 'Playfair Display',serif;color:var(--navy)}
.success p{margin:0 0 20px;color:var(--mut);font-size:14px}
.success .btns{justify-content:center}
.refbox{display:inline-block;margin:6px 0 22px;padding:10px 22px;border-radius:12px;background:#f3f5fd;border:1px dashed #b4bce0;font:600 18px 'Poppins',sans-serif;color:var(--navy);letter-spacing:.04em}

/* ---- timeline ---- */
.tl{list-style:none;margin:0;padding:0;position:relative}
.tl::before{content:"";position:absolute;left:19px;top:8px;bottom:8px;width:2px;background:var(--line)}
.tl li{position:relative;display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:start;padding:12px 0}
.tl .mk{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid var(--line);color:var(--mut);z-index:1}
.tl li.past .mk{background:var(--green);border-color:var(--green);color:#fff}
.tl li.now .mk{background:var(--crimson);border-color:var(--crimson);color:#fff;box-shadow:0 0 0 6px rgba(155,18,48,.15);animation:pulse 2s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 10px rgba(155,18,48,.05)}}
.tl b{display:block;font-size:14.5px}.tl small{display:block;font-size:12.5px;color:var(--mut);margin-top:2px}
.tl .when{font-size:13px;font-weight:600;color:var(--navy);margin-bottom:2px}
.tl li.next-up .mk{border-color:var(--gold);color:#7a5a00;background:#fff8e1}

/* ---- tables / lists ---- */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{padding:9px 12px;text-align:left;font-size:12px;font-weight:500;color:var(--mut);border-bottom:1px solid var(--line)}
td{padding:13px 12px;border-bottom:1px solid #f0f2fa}
tr:last-child td{border-bottom:0}
td.r,th.r{text-align:right}
tr.total td{background:#f3f5fd;font-weight:600;color:var(--navy);font-size:15px}
tr.total td.r{font:700 21px 'Playfair Display',serif}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}
.kv div{padding:14px 16px;border-radius:12px;background:#f3f5fd;min-width:0}
.kv dt{font-size:11.5px;color:var(--mut)}.kv dd{margin:3px 0 0;font-weight:600;color:var(--navy);overflow-wrap:anywhere}
.kv{margin:0}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.stat{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;transition:transform .2s,box-shadow .2s}
.stat:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(15,29,87,.1)}
.stat span{font-size:13px;color:var(--mut)}.stat b{font:700 26px 'Playfair Display',serif;color:var(--navy)}.stat small{font-size:12px;color:var(--mut)}
.stat.good b{color:var(--green)}.stat.warn b{color:var(--crimson)}

.track{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:6px;position:relative}
.track li{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;font-size:12px;color:var(--mut);position:relative}
.track li::before{content:"";position:absolute;top:17px;left:-50%;width:100%;height:3px;background:var(--line);z-index:0}
.track li:first-child::before{display:none}
.track li.done::before,.track li.cur::before{background:var(--green)}
.track .n{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#eef0f8;color:var(--navy);font-weight:600;z-index:1;font-size:13px}
.track li.done .n{background:var(--green);color:#fff}
.track li.cur .n{background:var(--navy);color:#fff;box-shadow:0 0 0 5px rgba(227,184,43,.3)}
.track li.cur{color:var(--navy);font-weight:600}

/* ---- print sheet ---- */
.sheet{background:#fff;border:1px solid var(--line);border-radius:6px;padding:34px 38px;max-width:860px;margin:0 auto;color:#111}
.sheet-h{display:grid;grid-template-columns:1fr 110px;gap:20px;align-items:start;padding-bottom:16px;border-bottom:3px double #222;margin-bottom:18px}
.sheet-h small{letter-spacing:.14em;font-size:11px;font-weight:600;color:var(--crimson)}
.sheet-h h2{margin:2px 0;font:700 24px 'Playfair Display',serif;color:var(--navy)}
.sheet-h p{margin:2px 0;font-size:12.5px;color:#444}
.sheet-photo{width:110px;height:136px;border:1px solid #999;object-fit:cover;display:grid;place-items:center;font-size:11px;color:#888;text-align:center}
.sheet h4{margin:18px 0 6px;padding:5px 10px;background:#e9edf8;font-size:13px;color:var(--navy);text-transform:uppercase;letter-spacing:.04em}
.sheet table{font-size:12.5px}.sheet td{padding:5px 10px;border:1px solid #d8dbe6}
.sheet td:first-child{width:38%;background:#fafbfe;font-weight:500}
.sheet-sign{display:flex;justify-content:space-between;align-items:flex-end;margin-top:34px;font-size:12.5px}
.sheet-sign img{height:50px;display:block;margin-bottom:4px}
.sheet-sign div{min-width:200px;border-top:1px solid #222;padding-top:4px;text-align:center}

@media print{
  body *{visibility:hidden!important}
  .sheet,.sheet *{visibility:visible!important}
  .sheet{position:absolute;left:0;top:0;width:100%;max-width:none;border:0;padding:0}
}

@media(max-width:1100px){.grid-2{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){
  .ad{padding:16px 14px 36px}
  .hero{padding:22px 20px}.hero h1{font-size:22px}
  .fields,.review-sec dl{grid-template-columns:1fr}
  .card{padding:18px 16px}
  .stepper li{min-width:64px}.stepper button{font-size:0}.stepper .n{font-size:13px}
  .stats{grid-template-columns:1fr 1fr;gap:12px}
  .track{grid-template-columns:1fr;gap:14px}.track li{flex-direction:row;text-align:left}.track li::before{display:none}
  .tl li{grid-template-columns:40px 1fr}.tl li>:last-child{grid-column:2}
  .sheet{padding:20px 16px}
}
@media(prefers-reduced-motion:reduce){.view,.bar div,.success .tick,.tl .mk,.btn,.stat{animation:none!important;transition:none!important}}
`;