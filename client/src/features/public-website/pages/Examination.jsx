import { useState } from "react";
import { ArrowLeft, Download, Mail, Phone, MapPin, FileText } from "lucide-react";

/* ------------------------------------------------------------------ */
/* DATA — edit here, the layout below does not need to change          */
/* ------------------------------------------------------------------ */

const SITE = "https://abedainamdarcollege.org.in";

// Add the PDF link for each programme in `file` (e.g. "/pdf/exam/handbook-ba.pdf").
// Rows with an empty `file` show "Not available" instead of a dead link.
const HANDBOOKS = [
  { name: "BA", file: "" },
  { name: "MA", file: "" },
  { name: "BCOM", file: "" },
  { name: "BBA(CA)", file: "" },
  { name: "BBA", file: "" },
  { name: "B.VOC. Retail Management", file: "" },
  { name: "MCOM", file: "" },
  { name: "B.SC.Regular", file: "" },
  { name: "B.Sc. Computer Science", file: "" },
  { name: "BCA Science", file: "" },
  { name: "B.Voc. Data Science", file: "" },
  { name: "M.Sc.", file: "" },
];

const CORE_STAFF = [
  ["Prof. Dr. Shaila Bootwala", ["Principal,", "Chief Controller of Examination"], ["M.COM., M. Phil.,", "Ph.D."]],
  ["Dr. Aftab Alam", ["Controller of Examination"], ["M.A. MPM,", "Ph.D.(Economics)"]],
  ["Mr. Asif Shaikh", ["Deputy Controller of Examination"], ["M.Sc., B.Ed."]],
];

const SUPPORT_STAFF = [
  ["Mr. Nayeem A. Shaikh", "Clerk", "B.Sc."],
  ["Ms. Summaiya I. Shaikh", "Clerk", "M.Com."],
  ["Mr. Amin C. Shaikh", "Peon", "B. Com."],
  ["Mr. Sahil M. Shaikh", "Peon", "M.Com."],
];

// Lists the college posts during the year. Shape: { title, date: "DD/MM/YYYY", file }
const NOTICES = [];
const TIMETABLES = [];
const INTERNAL_MARKS = [];
const RESULTS = [];

const CREDIT_SHEET = `${SITE}/assets/pdf/exam/Credit_and_Grade_point_Calculation_Sheet.pdf`;
const EXAM_EMAIL = "examdep221@gmail.com";
const EXAM_PHONE = "72760 11754";

const TABS = [
  { id: "handbook", label: "Examination Handbook" },
  { id: "committee", label: "Examination Committee" },
  { id: "notices", label: "Examination Notices/Circulars" },
  { id: "timetable", label: "Examination Timetable" },
  { id: "marks", label: "Internal Marks" },
  { id: "results", label: "Results" },
  { id: "credit", label: "Credit and Grade point Calculation Sheet", href: CREDIT_SHEET },
  { id: "contact", label: "Contact Us" },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function DownloadLink({ file }) {
  if (!file) return <span className="na">Not available</span>;
  return (
    <a className="dl" href={file} target="_blank" rel="noopener noreferrer" download>
      <Download size={14} /> Download
    </a>
  );
}

function DocList({ rows, empty }) {
  if (!rows.length) {
    return (
      <p className="empty">
        <FileText size={18} /> {empty}
      </p>
    );
  }
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr><th>Sr.No</th><th>Title</th><th>Date</th><th>File</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.title}</td>
              <td>{r.date}</td>
              <td><DownloadLink file={r.file} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ id }) {
  switch (id) {
    case "handbook":
      return (
        <>
          <h2>Examination Handbook</h2>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Sr.No</th><th>Name of Programme</th><th>Examination Handbook</th></tr>
              </thead>
              <tbody>
                {HANDBOOKS.map((h, i) => (
                  <tr key={h.name}>
                    <td>{i + 1}</td>
                    <td>{h.name}</td>
                    <td><DownloadLink file={h.file} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "committee":
      return (
        <>
          <h2>Department of Examination</h2>
          <p>
            The department of examinations is entrusted with responsibility of conducting fair and timely exams as per
            the academic and examination calendar for various UG/PG/Ph.D programmes.
          </p>
          <p>
            Under the mentorship and guidance of the members of the BOS, Faculty, Examination Committee, Head of the
            Departments, Members of AC, the Principal and the Director of Examination, SPPU, the examination cell of
            the college strives to achieve great heights of success.
          </p>
          <p className="callout">
            For all exam related queries students can contact the examination cell.
            <br />
            <Mail size={14} /> Examination Email Id: <a href={`mailto:${EXAM_EMAIL}`}>{EXAM_EMAIL}</a>
            <br />
            <Phone size={14} /> Mob. No: <a href={`tel:+91${EXAM_PHONE.replace(/\s/g, "")}`}>{EXAM_PHONE}</a>
          </p>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Sr. No.</th><th>Name of the staff</th><th>Designation</th><th>Qualification</th></tr>
              </thead>
              <tbody>
                {CORE_STAFF.map(([n, d, q], i) => (
                  <tr key={n}>
                    <td>{i + 1}.</td>
                    <td>{n}</td>
                    <td>{d.map((l, k) => <div key={k}>{l}</div>)}</td>
                    <td>{q.map((l, k) => <div key={k}>{l}</div>)}</td>
                  </tr>
                ))}
                <tr className="band"><td colSpan={4}>Supporting Staff</td></tr>
                {SUPPORT_STAFF.map(([n, d, q], i) => (
                  <tr key={n}>
                    <td>{i + 1}.</td><td>{n}</td><td>{d}</td><td>{q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "notices":
      return (
        <>
          <h2>Examination Notices / Circulars</h2>
          <DocList rows={NOTICES} empty="No examination notices have been published yet." />
          <p className="more"><a href="/notice">View all college notices / circulars →</a></p>
        </>
      );

    case "timetable":
      return (
        <>
          <h2>Examination Timetable</h2>
          <DocList rows={TIMETABLES} empty="The examination timetable will be displayed here once it is published." />
        </>
      );

    case "marks":
      return (
        <>
          <h2>Internal Marks</h2>
          <DocList rows={INTERNAL_MARKS} empty="Internal marks will be displayed here once they are published." />
        </>
      );

    case "results":
      return (
        <>
          <h2>Results</h2>
          <DocList rows={RESULTS} empty="Results will be displayed here once they are declared." />
        </>
      );

    case "contact":
      return (
        <>
          <h2>Contact Us</h2>
          <p>For all exam related queries students can contact the examination cell.</p>
          <ul className="contact">
            <li><Mail size={18} /><span>Examination Email Id<br /><a href={`mailto:${EXAM_EMAIL}`}>{EXAM_EMAIL}</a></span></li>
            <li><Phone size={18} /><span>Mobile<br /><a href={`tel:+91${EXAM_PHONE.replace(/\s/g, "")}`}>{EXAM_PHONE}</a></span></li>
            <li>
              <MapPin size={18} />
              <span>
                Abeda Inamdar College, 2390-B, K.B. Hidayatullah Road, Azam Campus, Camp, Pune 411001, Maharashtra,
                India.
              </span>
            </li>
          </ul>
        </>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ExaminationPage({ onBack }) {
  const [active, setActive] = useState("handbook");

  const goHome = (e) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="exam">
      <style>{css}</style>

      <header className="banner">
        <a href="/" className="back" onClick={goHome}>
          <ArrowLeft size={14} /> Back to Home
        </a>
        <h1>Examination</h1>
      </header>

      <div className="layout">
        <nav className="side" aria-label="Examination sections">
          <ul role="tablist">
            {TABS.map((t) => (
              <li key={t.id}>
                {t.href ? (
                  <a className="tab" href={t.href} target="_blank" rel="noopener noreferrer">
                    {t.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active === t.id}
                    className={"tab" + (active === t.id ? " active" : "")}
                    onClick={() => setActive(t.id)}
                  >
                    {t.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <main className="content" role="tabpanel" key={active}>
          <Panel id={active} />
        </main>
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
.exam{--navy:#1d3567;--red:#e11d48;--ink:#2a2f40;--mut:#6b7080;--line:#e3e6ef;
  font-family:'Open Sans',system-ui,sans-serif;color:var(--ink);background:#fff;min-height:100vh}
.exam *{box-sizing:border-box}

.banner{position:relative;height:150px;display:grid;place-items:center;
  background:
    linear-gradient(rgba(20,25,50,.78),rgba(20,25,50,.78)),
    linear-gradient(115deg,#5b3a1e,#2b2f3a 45%,#6a4a2a);
  background-size:cover;background-position:center}
.banner h1{margin:0;color:#fff;font:700 38px 'Open Sans',sans-serif;letter-spacing:.01em}
.back{position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;
  color:#fff;text-decoration:none;font:600 12px 'Open Sans',sans-serif;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(4px);transition:background .15s}
.back:hover{background:rgba(255,255,255,.24)}
.back:focus-visible,.tab:focus-visible{outline:3px solid #e3b82b;outline-offset:2px}

.layout{width:min(1180px,100%);margin:0 auto;padding:56px 20px 72px;display:grid;grid-template-columns:262px 1fr;gap:64px;align-items:start}

.side ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.tab{display:flex;align-items:center;width:100%;min-height:43px;padding:10px 18px;text-align:left;cursor:pointer;text-decoration:none;
  background:var(--navy);color:#fff;border:0;border-right:6px solid var(--red);font:400 14px/1.5 'Open Sans',sans-serif;
  transition:background .15s,transform .15s}
.tab:hover{background:#27447f}
.tab.active{background:#14264f;font-weight:700;transform:translateX(4px)}

.content{min-width:0;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.content h2{margin:0 0 18px;font-size:22px;font-weight:700;color:var(--navy);padding-bottom:10px;border-bottom:3px solid var(--red);display:inline-block}
.content p{margin:0 0 14px;font-size:14.5px;line-height:1.75;color:#444a5e;text-align:justify}
.content a{color:var(--navy)}
.callout{padding:14px 18px;background:#f4f6fc;border-left:4px solid var(--navy);text-align:left!important}
.callout svg{vertical-align:-2px;margin-right:6px;color:var(--navy)}

.tbl-wrap{overflow-x:auto;margin-top:6px}
table{width:100%;border-collapse:collapse;border:1px solid var(--line);font-size:14px}
th,td{padding:9px 8px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{font-weight:700;color:#111;border-bottom:2px solid #222;white-space:nowrap}
th:first-child,td:first-child{width:78px;padding-left:8px}
td{color:#444a5e}
tbody tr:hover td{background:#f8f9fd}
tr.band td{background:#eef1fa;font-weight:700;color:var(--navy)}
.dl{display:inline-flex;align-items:center;gap:6px;color:#6b7080;text-decoration:none}
.dl:hover{color:var(--red);text-decoration:underline}
.na{color:#a3a8b8;font-size:13px;font-style:italic}

.empty{display:flex;align-items:center;gap:10px;padding:18px;background:#f4f6fc;border:1px dashed #c4cbe3;text-align:left!important}
.more{margin-top:18px!important}
.contact{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:14px}
.contact li{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;background:#f4f6fc;border-left:4px solid var(--red);line-height:1.6;font-size:14.5px}
.contact svg{color:var(--navy);margin-top:3px;flex-shrink:0}

@media(max-width:860px){
  .layout{grid-template-columns:1fr;gap:28px;padding:32px 16px 56px}
  .banner{height:130px}.banner h1{font-size:30px;margin-top:26px}
  .tab.active{transform:none}
}
@media(prefers-reduced-motion:reduce){.content{animation:none}.tab,.back{transition:none}}
`;