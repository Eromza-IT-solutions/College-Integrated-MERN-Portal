import { useState } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import RefundsPanel from "../../refunds/RefundsPanel";

const TABS = [
  { id: "admission", label: "Admission fees" },
  { id: "exam", label: "Exam fees" },
];

// Super Admin: approve or reject refunds raised by the Admission and Exam admins, and retry failed payouts.
export default function Refunds() {
  const [purpose, setPurpose] = useState("admission");

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Refunds"
        description="Approve or reject refund requests. You cannot decide a refund that you raised yourself."
      />

      <div className="flex gap-2 border-b border-eromza-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPurpose(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              purpose === t.id ? "border-eromza-accent text-eromza-accent" : "border-transparent text-eromza-muted hover:text-eromza-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <RefundsPanel key={purpose} purpose={purpose} canDecide showHeader={false} />
    </div>
  );
}
