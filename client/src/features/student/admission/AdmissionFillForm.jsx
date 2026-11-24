import FormWizard from "./FormWizard";
import { PageShell } from "./AdmissionShared";

export default function AdmissionFillForm() {
  return (
    <PageShell title="Fill Form">
      <FormWizard mode="fill" />
    </PageShell>
  );
}