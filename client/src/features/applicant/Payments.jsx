import FeePaymentPage from "../../components/payments/FeePaymentPage";
import { listMyApplications } from "../../services/paymentsService";

// An approved application is waiting for its admission fee.
async function loadTargets() {
  const apps = await listMyApplications();
  return apps
    .filter((a) => a.status === "approved" && a.feeAmountPaise > 0)
    .map((a) => ({
      key: a.id,
      label: `Admission fee - ${a.applicationNumber || "application"}`,
      amountPaise: a.feeAmountPaise,
      dueAt: a.feeDueAt,
      orderBody: { purpose: "admission", applicationId: a.id },
    }));
}

export default function Payments() {
  return (
    <FeePaymentPage
      purpose="admission"
      eyebrow="Admission portal"
      title="Payments"
      description="Pay your admission fee and review completed transactions."
      itemName="admission fee"
      loadTargets={loadTargets}
    />
  );
}
