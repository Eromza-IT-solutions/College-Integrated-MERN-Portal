import { Printer, ArrowRight } from "lucide-react";
import ApplicationSheet from "./ApplicationSheet";
import { Card, Notice, PageShell, useAdmission } from "./AdmissionShared";

export default function AdmissionPrintForm() {
  const { application, go } = useAdmission();

  return (
    <PageShell title="Print Form">
      {!application ? (
        <Card title="Print form">
          <Notice tone="warn">You haven’t submitted an admission form yet, so there is nothing to print.</Notice>
          <div className="btns" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => go("fill")}>Fill form <ArrowRight size={15} /></button>
          </div>
        </Card>
      ) : (
        <>
          <Card title="Print your application">
            <p className="lead">Check the preview below, then print it. Choose “Save as PDF” in the print window if you want a PDF copy.</p>
            <div className="btns">
              <button type="button" className="btn" onClick={() => window.print()}><Printer size={16} /> Print form</button>
              <button type="button" className="btn ghost" onClick={() => go("download")}>Download instead</button>
            </div>
          </Card>
          <ApplicationSheet application={application} />
        </>
      )}
    </PageShell>
  );
}