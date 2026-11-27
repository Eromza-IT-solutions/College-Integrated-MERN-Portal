import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { FileText, CreditCard, BadgeCheck, Camera, RotateCcw, LayoutDashboard, CheckCircle2, AlertCircle, X } from "lucide-react";

export const DEFAULT_STUDENT = { name: "Ayesha Khan", course: "B.Sc. Computer Science", semester: 5, roll: "CS2023-045" };
export const DEFAULT_SESSION = "Semester 5 · Nov/Dec 2026 Examinations";

export const DEFAULT_EXAMS = [
  { code: "CS501", name: "Data Structures", credits: 4, marks: 62, date: "2026-11-30", time: "10:00 AM – 1:00 PM", venue: "Room 204" },
  { code: "CS502", name: "Database Management", credits: 4, marks: 71, date: "2026-12-02", time: "10:00 AM – 1:00 PM", venue: "Room 204" },
  { code: "CS503", name: "Operating Systems", credits: 4, marks: 58, date: "2026-12-04", time: "10:00 AM – 1:00 PM", venue: "Lab 2" },
  { code: "CS504", name: "Web Technologies", credits: 3, marks: 77, date: "2026-12-07", time: "10:00 AM – 1:00 PM", venue: "Room 110" },
  { code: "CS505", name: "Computer Networks", credits: 3, marks: 66, date: "2026-12-09", time: "10:00 AM – 1:00 PM", venue: "Room 110" },
];

export const DEFAULT_DEADLINES = {
  form: "2026-11-25",
  fee: "2026-11-26",
  photo: "2026-11-25",
};

export const FEE_ITEMS = [
  { label: "Examination fee (5 subjects)", amount: 1000 },
  { label: "Mark sheet / statement of marks", amount: 150 },
  { label: "Student welfare fund", amount: 50 },
];
export const REVAL_FEE = 500; // per subject

export const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "form", label: "Examination Form", icon: FileText },
  { id: "fee", label: "Form Fee Payment", icon: CreditCard },
  { id: "abc", label: "ABC ID", icon: BadgeCheck },
  { id: "photo", label: "Upload Student Photo", icon: Camera },
  { id: "reval", label: "Revaluation Form", icon: RotateCcw },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const inr = (n) => "₹" + n.toLocaleString("en-IN");
export const dateOf = (s) => new Date(`${s}T00:00:00`);
export const fmt = (s, o = { day: "numeric", month: "short", year: "numeric" }) => dateOf(s).toLocaleDateString("en-IN", o);

function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const daysLeft = (s, now) => Math.ceil((dateOf(s) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
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


/* ------------------------------------------------------------------ */
/* Shared state + page shell                                           */
/* ------------------------------------------------------------------ */

// Default URL of every page. Change these to match your router.
export const ROUTES = {
  dashboard: "/student/examinations",
  form: "/student/examinations/form",
  fee: "/student/examinations/fee",
  abc: "/student/examinations/abc-id",
  photo: "/student/examinations/photo",
  reval: "/student/examinations/revaluation",
};

const ExamContext = createContext(null);
export const useExam = () => useContext(ExamContext);

/**
 * Wrap ALL examination routes in this provider once, so progress (form submitted,
 * fee paid, ABC ID, photo) is shared between the separate pages:
 *   <ExamProvider onNavigate={(id) => navigate(ROUTES[id])}> ...routes... </ExamProvider>
 */
export function ExamProvider({
  children,
  student = DEFAULT_STUDENT,
  session = DEFAULT_SESSION,
  exams = DEFAULT_EXAMS,
  deadlines = DEFAULT_DEADLINES,
  onNavigate,
}) {
  const [status, setStatus] = useState({ form: null, fee: null, abc: null, photo: null, reval: [] });
  const now = useNow();
  const go = (id) => (onNavigate ? onNavigate(id) : (window.location.href = ROUTES[id]));

  const steps = useMemo(() => {
    const s = [
      { id: "form", label: "Examination form", go: "form", done: !!status.form, doneText: `Submitted · ${status.form?.ref}`, todoText: "Choose your subjects and submit" },
      { id: "fee", label: "Form fee payment", go: "fee", done: !!status.fee, locked: !status.form, doneText: `Paid · ${status.fee?.receipt}`, todoText: "Pay the examination fee online" },
      { id: "abc", label: "ABC ID", go: "abc", done: !!status.abc, doneText: "ABC ID linked", todoText: "Add your 12-digit ABC ID" },
      { id: "photo", label: "Student photo", go: "photo", done: !!status.photo, doneText: "Photo uploaded", todoText: "Upload a passport-size JPG under 500 KB" },
    ];
    s.push({ id: "ticket", label: "Hall ticket", done: false, locked: !s.every((x) => x.done), doneText: "", todoText: "Download your hall ticket" });
    return s;
  }, [status]);

  const progress = Math.round((steps.slice(0, 4).filter((s) => s.done).length / 4) * 100);

  return (
    <ExamContext.Provider value={{ student, session, exams, deadlines, status, setStatus, steps, progress, now, go }}>
      {children}
    </ExamContext.Provider>
  );
}

/** Banner + styles used by every page (no sidebar, no top bar). */
export function PageShell({ title, children }) {
  const { student, now } = useExam();
  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="ex">
      <style>{css}</style>
      <section className="hero">
        <div className="hero-id">
          <span className="avatar">{initials}</span>
          <div>
            <small>Examinations</small>
            <h1>{title}</h1>
            <p>{student.name} · {student.course} · Semester {student.semester} · Roll no. {student.roll}</p>
          </div>
        </div>
        <div className="hero-date">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        <span className="ring r1" aria-hidden="true" /><span className="ring r2" aria-hidden="true" />
      </section>
      <div className="view" style={{ marginTop: 22 }}>{children}</div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');
.ex{--navy:#0f1d57;--navy2:#16276e;--crimson:#9b1230;--gold:#e3b82b;--ink:#1b2250;--mut:#6b7392;--line:#e6e9f5;--bg:#f6f7fc;
  font-family:'Poppins',system-ui,sans-serif;color:var(--ink);padding:28px 32px 48px;background:var(--bg);min-height:100%}
.ex *{box-sizing:border-box}
.ex button{font-family:inherit}
.ex button:focus-visible,.ex input:focus-visible,.ex textarea:focus-visible,.ex label:focus-within{outline:3px solid var(--gold);outline-offset:2px}

/* hero */
.hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  padding:30px 34px;border-radius:20px;color:#fff;background:linear-gradient(110deg,#0c1747 0%,#14246b 60%,#1a2c7c 100%);box-shadow:0 14px 30px rgba(15,29,87,.22)}
.hero-id{display:flex;gap:18px;align-items:center;position:relative;z-index:1}
.avatar{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:#fff;color:var(--navy);
  border:3px solid var(--gold);font:700 22px 'Playfair Display',serif}
.hero small{font-size:12.5px;color:#c8d0f5;letter-spacing:.04em}
.hero h1{margin:2px 0 4px;font:700 27px/1.2 'Playfair Display',serif}
.hero p{margin:0;font-size:13px;color:#d6dcf8}
.hero-date{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:13px;font-weight:500;color:var(--gold)}
.ring{position:absolute;border-radius:50%;border:26px solid rgba(255,255,255,.05);pointer-events:none}
.r1{width:260px;height:260px;right:-50px;top:-120px}
.r2{width:180px;height:180px;right:140px;bottom:-110px;border-color:rgba(227,184,43,.12)}

.view{animation:rise .3s ease}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* cards */
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px 26px;box-shadow:0 2px 8px rgba(15,29,87,.04)}
.card-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.card h3{margin:0;font:700 21px 'Playfair Display',serif;color:var(--navy)}
.stack{display:grid;gap:20px;align-content:start}
.grid-2{display:grid;grid-template-columns:1.7fr 1fr;gap:20px;align-items:start}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:20px}
.stat{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;
  box-shadow:0 2px 8px rgba(15,29,87,.04);transition:transform .2s,box-shadow .2s}
.stat:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(15,29,87,.1)}
.stat-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--mut)}
.stat-top i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#eef0f8;color:var(--navy)}
.stat b{margin-top:10px;font:700 28px 'Playfair Display',serif;color:var(--navy)}
.stat small{font-size:12px;color:var(--mut)}
.stat.good b{color:#14753f}.stat.good i{background:#e3f5ea;color:#14753f}
.stat.warn b{color:var(--crimson)}.stat.warn i{background:#fbe8ed;color:var(--crimson)}
.stat.warn small{color:var(--crimson)}

/* journey */
.pct{font-size:12.5px;font-weight:600;color:var(--crimson)}
.bar{height:8px;border-radius:99px;background:#e8ebf6;overflow:hidden;margin-bottom:20px}
.bar div{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--navy2),var(--gold));transition:width .6s cubic-bezier(.2,.8,.2,1)}
.journey{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.journey li{display:grid;grid-template-columns:28px 1fr auto;gap:12px;align-items:center;padding:12px 10px;border-radius:12px;position:relative}
.journey li:hover{background:#f6f7fc}
.journey li b{display:block;font-size:14px;font-weight:600}
.journey small{font-size:12px;color:var(--mut)}
.journey .dot{display:grid;place-items:center;color:#b3b9d3}
.journey .done .dot{color:#14753f}
.journey .todo .dot{color:var(--crimson)}
.journey .locked{opacity:.6}
.link{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:0;border-radius:9px;background:#eef0f8;color:var(--navy);
  font-size:12.5px;font-weight:600;cursor:pointer}
.link:hover{background:var(--navy);color:#fff}

/* table */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:var(--mut);border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:12px 10px;border-bottom:1px solid #f0f2fa;vertical-align:middle}
tr:last-child td{border-bottom:0}
td small{display:block;font-size:11.5px;color:var(--mut)}
.muted{color:var(--mut);text-align:center}

.pill{display:inline-block;padding:3px 11px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}
.pill.gray{background:#eef0f8;color:var(--navy)}
.pill.blue{background:#e4eaff;color:#233a9c}
.pill.gold{background:#fff3cc;color:#7a5a00}
.pill.red{background:#fbe8ed;color:var(--crimson)}
.pill.green{background:#e3f5ea;color:#14753f}

/* quick actions + dates */
.actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.actions button{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px;border-radius:14px;cursor:pointer;
  background:#fff;border:1px solid var(--line);color:var(--ink);font-size:13px;font-weight:500;text-align:left;transition:all .15s}
.actions button svg{color:var(--crimson)}
.actions button:hover{border-color:var(--navy);transform:translateY(-2px);box-shadow:0 8px 18px rgba(15,29,87,.1)}
.dates{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.dates li{display:grid;grid-template-columns:20px 1fr auto;gap:10px;align-items:center}
.dates svg{color:var(--navy)}
.dates b{display:block;font-size:13px;font-weight:500}
.dates small{font-size:12px;color:var(--mut)}

/* forms */
.lead{margin:0 0 16px;font-size:13.5px;color:var(--mut);line-height:1.6}
.narrow{max-width:460px}
.subjects{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:16px}
.subject{position:relative;display:flex;gap:12px;align-items:center;padding:14px 16px;border:1.5px solid var(--line);border-radius:14px;cursor:pointer;
  background:#fff;transition:all .15s}
.subject input{position:absolute;opacity:0;inset:0;cursor:pointer}
.subject .tick{color:#ccd1e6;display:grid}
.subject b{display:block;font-size:14px;font-weight:600}
.subject small{font-size:12px;color:var(--mut)}
.subject.on{border-color:var(--navy);background:#f3f5fd}
.subject.on .tick{color:var(--navy)}
.subject.off{opacity:.65;cursor:not-allowed}
.subject .pill{margin-left:auto}
.summary-line{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;margin-bottom:14px;border-radius:12px;background:#f3f5fd;font-size:13.5px}
.summary-line b{color:var(--navy)}
.agree{display:flex;gap:10px;align-items:flex-start;margin-bottom:14px;font-size:13px;color:var(--mut);line-height:1.5}
.agree input{margin-top:3px;accent-color:var(--crimson)}
.field{display:grid;gap:6px;margin-bottom:14px}
.field span{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#3a4170}
.field b{color:var(--crimson)}
.field input,.field textarea{width:100%;padding:12px 14px;border:1px solid #d6dbef;border-radius:12px;background:#f0f3fc;font:400 14px 'Poppins',sans-serif;color:var(--ink)}
.field textarea{resize:vertical}
.err{margin:0 0 12px;font-size:12.5px;color:#c4162a;font-weight:500}
.hint{display:flex;align-items:center;gap:6px;margin:12px 0 0;font-size:12px;color:var(--mut)}
.hint.ok{color:#14753f}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:0;border-radius:12px;cursor:pointer;
  background:linear-gradient(180deg,#b01836,var(--crimson));color:#fff;font-size:13.5px;font-weight:600;box-shadow:0 8px 18px rgba(155,18,48,.28);transition:transform .15s,box-shadow .15s}
.btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 22px rgba(155,18,48,.36)}
.btn:disabled{opacity:.7;cursor:progress}
.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy);box-shadow:none}
.btn.wide{width:100%}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.notice{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;margin-bottom:16px;border-radius:12px;font-size:13.5px;line-height:1.5}
.notice div{flex:1}
.notice button{border:0;background:none;cursor:pointer;color:inherit;opacity:.7}
.notice.ok{background:#e8f6ee;color:#14753f;border:1px solid #c5e8d3}
.notice.warn,.notice.info{background:#fff6dc;color:#7a5a00;border:1px solid #f1deA0}
.next-step{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.next-step p{margin:0;font-size:13.5px;color:var(--mut)}

/* fee */
.fee-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:32px}
.fees{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.fees li{display:flex;justify-content:space-between;gap:12px;padding:14px 18px;font-size:13.5px;border-bottom:1px solid #f0f2fa}
.fees .total{background:#f3f5fd;border-bottom:0;font-size:15px;color:var(--navy)}
.fees .total b{font:700 21px 'Playfair Display',serif}
.sub{margin:0 0 12px;font-size:14px;font-weight:600}
.methods{display:grid;gap:8px;margin-bottom:16px}
.methods label{display:flex;gap:10px;align-items:center;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;font-size:13.5px;cursor:pointer}
.methods label.on{border-color:var(--navy);background:#f3f5fd}
.methods input{accent-color:var(--crimson)}
.receipt{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:0 0 18px}
.receipt div{padding:14px 16px;border-radius:12px;background:#f3f5fd}
.receipt dt{font-size:12px;color:var(--mut)}
.receipt dd{margin:2px 0 0;font-weight:600;color:var(--navy);overflow-wrap:anywhere}

/* photo */
.photo-grid{display:grid;grid-template-columns:230px 1fr;gap:30px;align-items:center}
.drop{height:280px;border:2px dashed #c5cbe8;border-radius:18px;display:grid;place-items:center;overflow:hidden;background:#f6f7fc;transition:all .15s}
.drop.drag{border-color:var(--crimson);background:#fdf1f4}
.drop img{width:100%;height:100%;object-fit:cover}
.drop-in{display:grid;gap:4px;justify-items:center;text-align:center;padding:16px;color:var(--navy)}
.drop-in small{color:var(--mut)}
.rules{margin:0 0 20px;padding-left:18px;font-size:13.5px;color:var(--mut);line-height:1.9}

@media(max-width:1100px){.grid-2{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){
  .ex{padding:16px 14px 36px}
  .hero{padding:22px 20px}.hero h1{font-size:21px}
  .stats{grid-template-columns:1fr 1fr;gap:12px}.stat b{font-size:23px}
  .fee-grid,.photo-grid{grid-template-columns:1fr;gap:22px}
  .drop{height:240px;max-width:230px}
  .card{padding:18px 16px}
  .journey li{grid-template-columns:24px 1fr}.journey .link{grid-column:2;justify-self:start}
}
@media(prefers-reduced-motion:reduce){.view,.stat,.tabs button,.bar div,.btn,.spin{animation:none;transition:none}}
`;