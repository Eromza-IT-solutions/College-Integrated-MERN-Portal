import { sheetRows } from "./AdmissionSchema";
import { fmt, useAdmission } from "./AdmissionShared";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Sections shown on the printed form (photo & signature are placed separately). */
function sections(values) {
  return sheetRows(values)
    .filter((s) => s.id !== "photo")
    .map((s) => ({ ...s, files: s.files.map(([l, f]) => [l, f ? `Uploaded (${f.name})` : "Not uploaded"]) }));
}

export function fileName(application) {
  return `Admission-Form-${application.ref}.html`;
}

/** A self-contained HTML copy of the form, used by the Download page. */
export function buildHtml(application, academicYear) {
  const v = application.values;
  const body = sections(v)
    .map((s, i) => `<h4>${i + 1}. ${esc(s.title)}</h4><table>${[...s.rows, ...s.files]
      .map(([l, val]) => `<tr><td>${esc(l)}</td><td>${esc(val)}</td></tr>`).join("")}</table>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(application.ref)} — Admission Form</title>
<style>body{font-family:Arial,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px}
.h{display:flex;justify-content:space-between;gap:16px;border-bottom:3px double #222;padding-bottom:14px;margin-bottom:16px}
.h small{color:#9b1230;letter-spacing:.14em;font-size:11px;font-weight:700}.h h1{margin:2px 0;font-size:24px;color:#0f1d57}.h p{margin:2px 0;font-size:13px}
.h img,.ph{width:105px;height:130px;object-fit:cover;border:1px solid #999}
h4{margin:18px 0 6px;padding:5px 10px;background:#e9edf8;color:#0f1d57;font-size:13px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;font-size:13px}td{border:1px solid #d0d4e2;padding:5px 10px}td:first-child{width:38%;background:#fafbfe}
.s{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;font-size:13px}.s div{min-width:200px;border-top:1px solid #222;text-align:center;padding-top:4px}.s img{height:50px;display:block;margin:0 auto 4px}
@media print{body{margin:0}}</style></head><body>
<div class="h"><div><small>M.C.E. SOCIETY'S</small><h1>Abeda Inamdar Senior College</h1>
<p>Admission Application Form · Academic Year ${esc(academicYear)}</p>
<p><b>Application No.:</b> ${esc(application.ref)}</p><p><b>Submitted on:</b> ${esc(fmt(new Date(application.submittedOn)))}</p>
<p><b>Class:</b> ${esc(v.class)}</p></div>
${v.photo ? `<img src="${esc(v.photo.data)}" alt="Student photo">` : `<div class="ph"></div>`}</div>
${body}
<div class="s"><div>Date</div><div>${v.signature ? `<img src="${esc(v.signature.data)}" alt="">` : ""}Student's signature</div></div>
</body></html>`;
}

/** The printable form shown on the Print Form page. */
export default function ApplicationSheet({ application }) {
  const { academicYear } = useAdmission();
  const v = application.values;
  return (
    <article className="sheet" aria-label="Admission application form">
      <header className="sheet-h">
        <div>
          <small>M.C.E. SOCIETY'S</small>
          <h2>Abeda Inamdar Senior College</h2>
          <p>Admission Application Form · Academic Year {academicYear}</p>
          <p><b>Application No.:</b> {application.ref}</p>
          <p><b>Submitted on:</b> {fmt(new Date(application.submittedOn))}</p>
          <p><b>Class:</b> {v.class}</p>
        </div>
        {v.photo ? <img className="sheet-photo" src={v.photo.data} alt="Student" /> : <div className="sheet-photo">Paste<br />photo here</div>}
      </header>

      {sections(v).map((s, i) => (
        <section key={s.id}>
          <h4>{i + 1}. {s.title}</h4>
          <table>
            <tbody>
              {[...s.rows, ...s.files].map(([l, val]) => (
                <tr key={l}><td>{l}</td><td>{val}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <footer className="sheet-sign">
        <div>Date</div>
        <div>{v.signature && <img src={v.signature.data} alt="" />}Student's signature</div>
      </footer>
    </article>
  );
}