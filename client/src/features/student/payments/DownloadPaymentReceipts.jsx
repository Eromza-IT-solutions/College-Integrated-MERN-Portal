import ReceiptsList from "./ReceiptsList";
import { PageShell } from "./PaymentsShared";

export default function DownloadPaymentReceipts() {
  return (
    <PageShell title="Download Payment Receipts">
      <ReceiptsList source="online" />
    </PageShell>
  );
}