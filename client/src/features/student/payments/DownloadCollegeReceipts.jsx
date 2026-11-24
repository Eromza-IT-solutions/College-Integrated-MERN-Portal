import ReceiptsList from "./ReceiptsList";
import { PageShell } from "./PaymentsShared";

export default function DownloadCollegeReceipts() {
  return (
    <PageShell title="Download College Receipts">
      <ReceiptsList source="college" />
    </PageShell>
  );
}