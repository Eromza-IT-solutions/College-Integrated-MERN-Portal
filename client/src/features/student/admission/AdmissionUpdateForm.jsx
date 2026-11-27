import FormWizard from "./FormWizard";
import { PageShell } from "./AdmissionShared";

export default function AdmissionUpdateForm() {
  return (
    <PageShell title="Update Form">
      <FormWizard mode="update" />
    </PageShell>
  );
}