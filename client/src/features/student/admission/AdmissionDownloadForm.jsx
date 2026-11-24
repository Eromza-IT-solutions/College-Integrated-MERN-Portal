import { Download, FileText, Printer, ArrowRight } from "lucide-react";
import { buildHtml, fileName } from "./ApplicationSheet";
import { Card, Notice, PageShell, fmt, useAdmission } from "./AdmissionShared";

export default function AdmissionDownloadForm() {
  const { application, academicYear, go } = useAdmission();

  const download = () => {
    const blob = new Blob([buildHtml(application, academicYear)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(application);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <PageShell title="Download Form">
      {!application ? (
        <Card title="Download form">
          <Notice tone="warn">You haven’t submitted an admission form yet, so there is nothing to download.</Notice>
          <div className="btns" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => go("fill")}>Fill form <ArrowRight size={15} /></button>
          </div>
        </Card>
      ) : (
        <div className="grid-2">
          <Card title="Your admission form">
            <dl className="kv" style={{ marginBottom: 20 }}>
              <div><dt>File</dt><dd><FileText size={14} style={{ verticalAlign: -2 }} /> {fileName(application)}</dd></div>
              <div><dt>Application no.</dt><dd>{application.ref}</dd></div>
              <div><dt>Submitted on</dt><dd>{fmt(new Date(application.submittedOn))}</dd></div>
              <div><dt>Class</dt><dd>{application.values.class}</dd></div>
            </dl>
            <div className="btns">
              <button type="button" className="btn" onClick={download}><Download size={16} /> Download form</button>
              <button type="button" className="btn ghost" onClick={() => go("print")}><Printer size={16} /> Print / save as PDF</button>
            </div>
          </Card>
          <Card title="How to use the file">
            <ol className="lead" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
              <li>Download the form to your device.</li>
              <li>Open it in any web browser.</li>
              <li>Press <b>Print</b> and choose <b>Save as PDF</b> for a PDF copy.</li>
              <li>Submit the printed form with your original documents at the college within 3 days.</li>
            </ol>
          </Card>
        </div>
      )}
    </PageShell>
  );
}