import FeePaymentPage from "../../components/payments/FeePaymentPage";
import { listMyExamForms } from "../../services/paymentsService";

// An exam form in "pendingPayment" is waiting for its examination fee.
async function loadTargets() {
  const forms = await listMyExamForms();
  return forms
    .filter((f) => f.status === "pendingPayment" && f.feeAmountPaise > 0)
    .map((f) => ({
      key: f._id,
      label: `Examination fee - form ${String(f._id).slice(-6)}`,
      amountPaise: f.feeAmountPaise,
      dueAt: null,
      orderBody: { purpose: "exam", examFormId: f._id },
    }));
}

export default function Fees() {
  return (
    <FeePaymentPage
      purpose="exam"
      eyebrow="Student workspace"
      title="Fees"
      description="Pay your examination fee, review payment history, and download receipts."
      itemName="exam fee"
      loadTargets={loadTargets}
    />
  );
}
