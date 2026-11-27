import { useState } from "react";
import { ArrowLeft, ExternalLink, Download, FileText, Info } from "lucide-react";

// Where the PDFs live. Keep the college site, or copy the PDFs into your own
// /public/pdf folder and change this to "/pdf".
export const PDF_BASE = "https://abedainamdarcollege.org.in/assets/pdf";

/* Banner with the "Back to Home" button + page title */
export function IQACLayout({ title, onBack, wide = false, side = null, children }) {
  const goHome = (e) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };
  return (
    <div className="iqac">
      <style>{css}</style>
      <header className="banner">
        <a href="/" className="back" onClick={goHome}><ArrowLeft size={14} /> Back to Home</a>
        <h1>{title}</h1>
      </header>
      <div className={"layout" + (side ? " has-side" : "") + (wide ? " wide" : "")}>
        {side}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

/* One titled list of documents. Clicking a row opens it in the page. */
export function DocSection({ title, docs, onOpen }) {
  return (
    <section className="doc-sec">
      <h2>{title}</h2>
      <ul>
        {docs.map((d) => (
          <li key={d.label}>
            <button type="button" onClick={() => onOpen(d)}>
              <FileText size={15} /> {d.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* A single-document header bar (e.g. "Administrative Setup (Organogram)") */
export function DocBar({ doc, onOpen }) {
  return (
    <section className="doc-sec">
      <h2 className="bar">
        <button type="button" onClick={() => onOpen(doc)}>{doc.label}</button>
      </h2>
    </section>
  );
}

export function EmptyNote({ children }) {
  return <p className="empty"><Info size={18} /> {children}</p>;
}

/* In-page PDF viewer */
export function PdfViewer({ doc, onClose }) {
  return (
    <section className="viewer">
      <div className="viewer-bar">
        <button type="button" className="close" onClick={onClose}><ArrowLeft size={14} /> Back to list</button>
        <div className="viewer-actions">
          <a href={doc.file} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open in new tab</a>
          <a href={doc.file} download><Download size={14} /> Download</a>
        </div>
      </div>
      <h3>{doc.label}</h3>
      <iframe title={doc.label} src={`${doc.file}#view=FitH`} />
      <p className="viewer-note">
        Can't see the document? <a href={doc.file} target="_blank" rel="noopener noreferrer">Open the PDF</a> directly.
      </p>
    </section>
  );
}

/* Hook: which document is open */
export function useOpenDoc() {
  const [doc, setDoc] = useState(null);
  return [doc, (d) => { setDoc(d); window.scrollTo({ top: 0, behavior: "smooth" }); }, () => setDoc(null)];
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
.iqac{--navy:#1d3567;--red:#e11d48;--ink:#2a2f40;--line:#dcdfe8;
  font-family:'Open Sans',system-ui,sans-serif;color:var(--ink);background:#fff;min-height:100vh}
.iqac *{box-sizing:border-box}

.banner{position:relative;height:150px;display:grid;place-items:center;
  background:linear-gradient(rgba(20,25,50,.78),rgba(20,25,50,.78)),linear-gradient(115deg,#5b3a1e,#2b2f3a 45%,#6a4a2a)}
.banner h1{margin:0;color:#fff;font:700 38px 'Open Sans',sans-serif}
.back{position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;
  color:#fff;text-decoration:none;font:600 12px 'Open Sans',sans-serif;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(4px);transition:background .15s}
.back:hover{background:rgba(255,255,255,.24)}
.iqac button:focus-visible,.iqac a:focus-visible{outline:3px solid #e3b82b;outline-offset:2px}

.layout{width:min(1100px,100%);margin:0 auto;padding:56px 20px 72px}
.layout.has-side{display:grid;grid-template-columns:360px 1fr;gap:30px;align-items:start}
.layout:not(.has-side){max-width:820px}
.content{min-width:0;border:6px solid #f1f1f1;padding:30px 34px 34px;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

.side ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.tab{display:flex;align-items:center;width:100%;min-height:43px;padding:10px 20px;text-align:left;cursor:pointer;
  background:var(--navy);color:#fff;border:0;border-right:6px solid var(--red);font:400 14px/1.4 'Open Sans',sans-serif;
  transition:background .15s,transform .15s}
.tab:hover{background:#27447f}
.tab.active{background:#14264f;font-weight:700;transform:translateX(4px)}

.doc-sec{margin-bottom:24px;border:1px solid var(--line)}
.doc-sec h2{margin:0;padding:22px 10px 18px;background:#d9ecf5;border-bottom:2px solid #222;font-size:18px;font-weight:700;color:#23283a}
.doc-sec h2.bar{padding:0}
.doc-sec h2.bar button{width:100%;padding:22px 10px 18px;text-align:left;border:0;background:none;font:inherit;color:inherit;cursor:pointer}
.doc-sec h2.bar button:hover{color:var(--navy);text-decoration:underline}
.doc-sec ul{list-style:none;margin:0;padding:0}
.doc-sec li{border-bottom:1px solid var(--line)}
.doc-sec li:last-child{border-bottom:0}
.doc-sec li button{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:0;background:none;text-align:left;
  font:400 14px 'Open Sans',sans-serif;color:#767b8c;cursor:pointer}
.doc-sec li button svg{color:#a3a8b8;flex-shrink:0}
.doc-sec li button:hover{background:#f4f7fc;color:var(--navy)}
.doc-sec li button:hover svg{color:var(--red)}

.viewer-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.close,.viewer-actions a{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;font:600 13px 'Open Sans',sans-serif;
  color:var(--navy);text-decoration:none;background:#fff;border:1px solid var(--navy);border-radius:6px;cursor:pointer}
.close:hover,.viewer-actions a:hover{background:var(--navy);color:#fff}
.viewer-actions{display:flex;gap:10px}
.viewer h3{margin:16px 0 12px;font-size:18px;color:var(--navy)}
.viewer iframe{width:100%;height:76vh;min-height:460px;border:1px solid var(--line);background:#f6f7fb}
.viewer-note{margin:10px 0 0;font-size:12.5px;color:#6b7080}
.viewer-note a{color:var(--navy)}

.panel-title{margin:0 0 18px;font-size:20px;font-weight:700;color:var(--navy)}
.empty{display:flex;align-items:center;gap:10px;margin:0;padding:18px;background:#f4f6fc;border:1px dashed #c4cbe3;font-size:14px;color:#555b70}

@media(max-width:900px){
  .layout{padding:32px 16px 56px}
  .layout.has-side{grid-template-columns:1fr}
  .banner{height:130px}.banner h1{font-size:28px;margin-top:26px}
  .content{padding:20px 16px}
  .tab.active{transform:none}
  .viewer iframe{height:62vh}
}
@media(prefers-reduced-motion:reduce){.content{animation:none}.tab,.back{transition:none}}
`;