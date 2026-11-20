import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Download, Receipt, Wallet } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card, { CardBody, CardHeader } from "../ui/Card";
import DataTable from "../ui/Table";
import Modal from "../ui/Modal";
import PageHeader from "../ui/PageHeader";
import StatCard from "../ui/StatCard";
import { downloadCsv } from "../../utils/csv";
import { downloadReceiptPdf, listPayments, payFee } from "../../services/paymentsService";

export const rupees = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");
const LABEL = { created: "Awaiting payment", paid: "Paid", failed: "Failed" };
const VARIANT = { created: "warning", paid: "success", failed: "error" };

/**
 * Shared screen for admission fees (applicant) and exam fees (student).
 * props: purpose, eyebrow, title, description, itemName, loadTargets()
 * loadTargets() returns payable items: [{ key, label, amountPaise, dueAt, orderBody }]
 */
export default function FeePaymentPage({ purpose, eyebrow, title, description, itemName, loadTargets }) {
  const [targets, setTargets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [t, p] = await Promise.all([loadTargets(), listPayments(purpose)]);
      setTargets(t);
      setPayments(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadTargets, purpose]);

  useEffect(() => { load(); }, [load]);

  const paidTotal = useMemo(() => payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountPaise, 0), [payments]);
  const dueTotal = useMemo(() => targets.reduce((s, t) => s + t.amountPaise, 0), [targets]);

  const handlePay = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await payFee(selected.orderBody, selected.label);
      setNotice(`Payment successful. Receipt: ${result.receiptNumber || "-"}`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message);
      setSelected(null);
      await load(); // an order may have been created even if paying failed
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    downloadCsv(`eromza-${purpose}-payments.csv`, [
      ["Receipt", "Amount (INR)", "Status", "Date"],
      ...payments.map((p) => [p.receiptNumber || p._id, p.amountPaise / 100, LABEL[p.status] || p.status, fmtDate(p.paidAt || p.createdAt)]),
    ]);
  };

  const columns = [
    {
      key: "id",
      header: "Payment",
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">{p.receiptNumber || "Receipt after payment"}</p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{p._id}</p>
        </div>
      ),
    },
    { key: "amount", header: "Amount", render: (p) => <span className="text-xs font-semibold text-eromza-text">{rupees(p.amountPaise)}</span> },
    { key: "date", header: "Date", render: (p) => <span className="text-xs text-eromza-muted">{fmtDate(p.paidAt || p.createdAt)}</span> },
    { key: "status", header: "Status", render: (p) => <Badge variant={VARIANT[p.status] || "neutral"}>{LABEL[p.status] || p.status}</Badge> },
    {
      key: "receipt",
      header: "Receipt",
      render: (p) => p.status === "paid" ? (
        <Button size="sm" variant="secondary" onClick={() => downloadReceiptPdf(p._id, p.receiptNumber).catch((e) => setError(e.message))}>
          <Download size={14} /> PDF
        </Button>
      ) : <span className="text-xs text-eromza-subtle">-</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <Button variant="secondary" onClick={handleExport} disabled={!payments.length}>
            <Download size={16} /> Export payments
          </Button>
        }
      />

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Amount due" value={rupees(dueTotal)} tone="warning" icon={Wallet} />
        <StatCard label="Total paid" value={rupees(paidTotal)} tone="success" icon={Receipt} />
        <StatCard label={`Pending ${itemName}s`} value={String(targets.length)} tone="accent" icon={CreditCard} />
        <StatCard label="Transactions" value={String(payments.length)} tone="info" icon={Receipt} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader title="Payment history" description="Transactions recorded for your account" />
          <DataTable columns={columns} rows={payments} loading={loading} getRowKey={(p) => p._id} emptyTitle="No payments recorded" emptyDescription="Payments appear here after you start one." />
        </Card>

        <Card>
          <CardHeader title={`Pay ${itemName}`} description="Fees waiting for payment" />
          <CardBody className="space-y-3">
            {!loading && !targets.length && (
              <p className="rounded-lg bg-eromza-bg p-3 text-xs text-eromza-muted">Nothing to pay right now.</p>
            )}
            {targets.map((t) => (
              <div key={t.key} className="rounded-xl bg-eromza-bg p-4">
                <p className="text-xs font-semibold text-eromza-text">{t.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-eromza-text">{rupees(t.amountPaise)}</p>
                {t.dueAt && <p className="mt-1 text-xs text-eromza-muted">Due by {fmtDate(t.dueAt)}</p>}
                <Button className="mt-3 w-full" onClick={() => setSelected(t)} disabled={busy}>
                  <CreditCard size={16} /> Pay now
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => !busy && setSelected(null)}
        title={`Pay ${itemName}`}
        description={selected ? `${selected.label} - ${rupees(selected.amountPaise)}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={busy}>Cancel</Button>
            <Button onClick={handlePay} disabled={busy}>
              <CreditCard size={16} /> {busy ? "Processing..." : "Pay now"}
            </Button>
          </>
        }
      >
        <p className="text-xs text-eromza-muted">
          The amount is fixed by the college fee structure on the server. Test mode: no real money is charged.
        </p>
      </Modal>
    </div>
  );
}
