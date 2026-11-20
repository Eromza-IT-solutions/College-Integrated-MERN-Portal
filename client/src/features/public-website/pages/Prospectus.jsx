import { useState } from "react";
import { ArrowLeft, ListChecks, ExternalLink, Download, FileText } from "lucide-react";

/* ------------------------------------------------------------------ */
/* DATA                                                                */
/* ------------------------------------------------------------------ */

// Where the PDFs live. Keep the college site, or copy the PDFs into your own
// /public/pdf folder and change this to "/pdf".
const PDF_BASE = "https://abedainamdarcollege.org.in/assets/pdf";

const ADMISSION_PDF = `${PDF_BASE}/AdmissionProcess.pdf`;

const STEPS = [
  "FILL ONLINE APPLICATION FORM",
  "ADMISSION FORM IS APPROVED BY THE COLLEGE",
  "PAY FEE ONLINE",
  "SUBMIT HARD COPIES OF ADMISSION FORM AT COLLEGE WITHIN 3 DAYS",
  "AFTER SUBMISSION OF ORIGINAL DOCUMENTS RECEIVE ID CARD",
];

/*
  type "page"  -> internal route (opens in your app)
  type "steps" -> the Admission Process card
  type "pdf"   -> shown inside the page in a PDF viewer
  type "info"  -> text panel; fill `body` when you have the content
*/
const TABS = [
  { id: "about", label: "About Us", type: "page", href: "/about-us" },
  { id: "process", label: "View Admission Process", type: "steps" },
  { id: "eligibility", label: "Eligibility & Documents", type: "pdf", file: `${PDF_BASE}/DOCUMENTS-LIST.pdf` },
  { id: "programmes", label: "Programmes Offered", type: "pdf", file: `${PDF_BASE}/Program_Offered_Under_Autonomy_NEP.pdf` },
  { id: "outcomes", label: "Programme Outcomes", type: "pdf", file: `${PDF_BASE}/Program-Specific-Objectives-and-Outcomes.pdf` },
  { id: "diploma", label: "Diploma & Certificate Courses", type: "pdf", file: `${PDF_BASE}/Diploma-and-Certificate-Courses.pdf` },
  { id: "fees", label: "Fees Structure", type: "info", body: [] },
  { id: "scholarships", label: "Scholarships", type: "pdf", file: `${PDF_BASE}/Scholarships.pdf` },
  { id: "extension", label: "Extension Activities for Students", type: "info", body: [] },
  { id: "sports", label: "Sports and Physical Education", type: "info", body: [] },
  { id: "infra", label: "Infrastructure", type: "page", href: "/infrastructure" },
  { id: "abc", label: "ABC ID CREATION STEPS", type: "pdf", file: `${PDF_BASE}/Steps_to_create_ABC_Id_2023-24.pdf` },
  { id: "katta", label: "CAREER KATTA", type: "pdf", file: `${PDF_BASE}/Career_Katta.pdf` },
  { id: "insurance", label: "INSURANCE", type: "pdf", file: `${PDF_BASE}/Insurance.pdf` },
];

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

function AdmissionSteps() {
  return (
    <section className="process">
      <h2>Admission Process</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={i}>
            <span className="step-no"><ListChecks size={18} /> STEP {i + 1}</span>
            <span className="step-txt">{s}</span>
          </li>
        ))}
        <li>
          <a className="step-dl" href={ADMISSION_PDF} target="_blank" rel="noopener noreferrer">
            <Download size={18} /> DOWNLOAD - ADMISSION PROCESS
          </a>
        </li>
      </ol>
    </section>
  );
}

function PdfViewer({ tab }) {
  return (
    <section className="viewer">
      <div className="viewer-bar">
        <h2>{tab.label}</h2>
        <div className="viewer-actions">
          <a href={tab.file} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open in new tab</a>
          <a href={tab.file} download><Download size={14} /> Download</a>
        </div>
      </div>
      <iframe title={tab.label} src={`${tab.file}#view=FitH`} loading="lazy" />
      <p className="viewer-note">
        Can't see the document? <a href={tab.file} target="_blank" rel="noopener noreferrer">Open the PDF</a> directly.
      </p>
    </section>
  );
}

function InfoPanel({ tab }) {
  return (
    <section className="process">
      <h2>{tab.label}</h2>
      {tab.body.length ? (
        tab.body.map((p, i) => <p key={i} className="para">{p}</p>)
      ) : (
        <p className="empty"><FileText size={18} /> Details for “{tab.label}” will be displayed here soon.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProspectusPage({ onBack }) {
  const [active, setActive] = useState("process");
  const current = TABS.find((t) => t.id === active);

  const goHome = (e) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="pros">
      <style>{css}</style>

      <header className="banner">
        <a href="/" className="back" onClick={goHome}>
          <ArrowLeft size={14} /> Back to Home
        </a>
        <h1>Prospectus</h1>
      </header>

      <div className="layout">
        <nav className="side" aria-label="Prospectus sections">
          <ul>
            {TABS.map((t) =>
              t.type === "page" ? (
                <li key={t.id}><a className="tab" href={t.href}>{t.label}</a></li>
              ) : (
                <li key={t.id}>
                  <button
                    type="button"
                    className={"tab" + (active === t.id ? " active" : "")}
                    aria-current={active === t.id ? "true" : undefined}
                    onClick={() => setActive(t.id)}
                  >
                    {t.label}
                  </button>
                </li>
              )
            )}
          </ul>
        </nav>

        <main className="content" key={active}>
          {current.type === "steps" && <AdmissionSteps />}
          {current.type === "pdf" && <PdfViewer tab={current} />}
          {current.type === "info" && <InfoPanel tab={current} />}
        </main>
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
.pros{--navy:#1d3567;--red:#e11d48;--ink:#2a2f40;--line:#d9dce6;
  font-family:'Open Sans',system-ui,sans-serif;color:var(--ink);background:#fff;min-height:100vh}
.pros *{box-sizing:border-box}

.banner{position:relative;height:150px;display:grid;place-items:center;
  background:linear-gradient(rgba(20,25,50,.78),rgba(20,25,50,.78)),linear-gradient(115deg,#5b3a1e,#2b2f3a 45%,#6a4a2a)}
.banner h1{margin:0;color:#fff;font:700 38px 'Open Sans',sans-serif}
.back{position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;
  color:#fff;text-decoration:none;font:600 12px 'Open Sans',sans-serif;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(4px);transition:background .15s}
.back:hover{background:rgba(255,255,255,.24)}
.back:focus-visible,.tab:focus-visible{outline:3px solid #e3b82b;outline-offset:2px}

.layout{width:min(1180px,100%);margin:0 auto;padding:56px 20px 72px;display:grid;grid-template-columns:262px 1fr;gap:16px 20px;align-items:start}

.side ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.tab{display:flex;align-items:center;width:100%;min-height:43px;padding:10px 18px;text-align:left;cursor:pointer;text-decoration:none;
  background:var(--navy);color:#fff;border:0;border-right:6px solid var(--red);font:400 14px/1.5 'Open Sans',sans-serif;
  transition:background .15s,transform .15s}
.tab:hover{background:#27447f}
.tab.active{background:#14264f;font-weight:700;transform:translateX(4px)}

.content{min-width:0;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* admission process card */
.process{padding:36px 34px 32px;border:5px solid #f1f1f1;background:#fff}
.process h2{margin:0 0 22px;text-align:center;font-size:24px;font-weight:700;color:#2a2f40}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;column-gap:40px}
.steps li{padding:16px 0 20px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:2px}
.steps li:nth-last-child(-n+2){border-bottom:0}
.step-no{display:flex;align-items:center;gap:6px;font-size:18px;font-weight:700;color:#2a2f40}
.step-no svg{color:#0000e0}
.step-txt{font-size:18px;font-weight:700;color:#3a3f4f;line-height:1.45}
.step-dl{display:inline-flex;align-items:center;gap:6px;font-size:18px;font-weight:700;color:#0000e0;text-decoration:none}
.step-dl:hover{text-decoration:underline}

/* pdf viewer */
.viewer{border:5px solid #f1f1f1;padding:20px}
.viewer-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.viewer-bar h2{margin:0;font-size:20px;color:var(--navy)}
.viewer-actions{display:flex;gap:10px}
.viewer-actions a{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;font-size:13px;font-weight:600;
  color:var(--navy);text-decoration:none;border:1px solid var(--navy);border-radius:6px}
.viewer-actions a:hover{background:var(--navy);color:#fff}
.viewer iframe{width:100%;height:78vh;min-height:480px;border:1px solid var(--line);background:#f6f7fb}
.viewer-note{margin:10px 0 0;font-size:12.5px;color:#6b7080}
.viewer-note a{color:var(--navy)}

.para{font-size:15px;line-height:1.75;color:#444a5e;text-align:justify}
.empty{display:flex;align-items:center;gap:10px;margin:0;padding:18px;background:#f4f6fc;border:1px dashed #c4cbe3;color:#444a5e;font-size:14.5px}

@media(max-width:860px){
  .layout{grid-template-columns:1fr;padding:32px 16px 56px}
  .banner{height:130px}.banner h1{font-size:30px;margin-top:26px}
  .tab.active{transform:none}
  .process{padding:24px 18px}
  .steps{grid-template-columns:1fr}
  .steps li:nth-last-child(2){border-bottom:1px solid var(--line)}
  .step-no,.step-txt,.step-dl{font-size:16px}
  .viewer iframe{height:65vh}
}
@media(prefers-reduced-motion:reduce){.content{animation:none}.tab,.back{transition:none}}
`;