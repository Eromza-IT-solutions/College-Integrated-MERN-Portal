import { useMemo, useState } from "react";
import { Ban, Check, Plus, RotateCw } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import { useApiData } from "../../hooks/useApiData";
import { listPayments } from "../../services/paymentsService";
import { decideRefund, listRefunds, requestRefund, retryRefund } from "../../services/refundsService";
import { formatDate, formatPaise } from "../../utils/format";

// Show the server's field-by-field errors when there are any.
const describe = (err) => {
  const list = err.cause?.response?.data?.error?.errors;
  return list?.length ? list.map((e) => `${e.field}: ${e.message}`).join(" | ") : err.message;
};

// An approved refund without gatewayRefundId has NOT been paid out yet.
function statusOf(refund) {
  if (refund.status === "approved") {
    return refund.gatewayRefundId
      ? { label: "Refunded", variant: "success" }
      : { label: "Approved, payout pending", variant: "info" };
  }
  if (refund.status === "rejected") return { label: "Rejected", variant: "error" };
  return { label: "Requested", variant: "warning" };
}

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const refundable = (payment) => (payment.amountPaise ?? 0) - (payment.reservedRefundPaise ?? 0);

/**
 * Refund list for one purpose ("admission" or "exam").
 *   canRequest - Admission Admin / Exam Admin: "Raise refund" button
 *   canDecide  - Super Admin: Approve, Reject and Retry payout buttons
 *   showHeader - false when a parent page already has its own header
 */
export default function RefundsPanel({ purpose, canRequest = false, canDecide = false, showHeader = true }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(null); // { type: "ok" | "error", text }

  const params = { page, ...(status ? { status } : {}) };
  const { data, loading, error, reload } = useApiData(
    () => listRefunds(purpose, params),
    JSON.stringify([purpose, params]),
  );
  const rows = data?.rows ?? [];
  const meta = data?.meta;

  // Paid payments: needed to pick one when raising a refund, and to show the receipt number in the list.
  // A role without permission to see payments simply gets no receipt numbers.
  const payments = useApiData(
    () => listPayments(purpose, { status: "paid" }).catch(() => []),
    purpose,
  );
  const paid = useMemo(() => payments.data ?? [], [payments.data]);
  const receiptOf = useMemo(() => Object.fromEntries(paid.map((p) => [p._id, p.receiptNumber])), [paid]);
  const refundablePayments = paid.filter((p) => refundable(p) > 0);

  /* ---- raise a refund ---- */
  const [raising, setRaising] = useState(false);
  const [form, setForm] = useState({ paymentId: "", amount: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const chosen = paid.find((p) => p._id === form.paymentId);

  const openRaise = () => { setForm({ paymentId: "", amount: "", reason: "" }); setFormError(""); setRaising(true); };
  const pickPayment = (e) => {
    const payment = paid.find((p) => p._id === e.target.value);
    setForm((f) => ({ ...f, paymentId: e.target.value, amount: payment ? String(refundable(payment) / 100) : "" }));
  };

  async function submitRaise() {
    setSaving(true);
    setFormError("");
    try {
      await requestRefund({
        paymentId: form.paymentId,
        amountPaise: Math.round(Number(form.amount) * 100),
        reason: form.reason.trim(),
      });
      setRaising(false);
      setNotice({ type: "ok", text: "Refund requested. The Super Admin will review it." });
      setPage(1);
      reload();
      payments.reload();
    } catch (err) {
      setFormError(describe(err));
    } finally {
      setSaving(false);
    }
  }

  /* ---- approve / reject / retry ---- */
  const [rejecting, setRejecting] = useState(null); // the refund being rejected
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function decide(refund, body, okText) {
    setBusyId(refund._id);
    setNotice(null);
    try {
      const result = await decideRefund(refund._id, body);
      const sent = body.approve && !result.gatewayRefundId;
      setNotice({
        type: sent ? "error" : "ok",
        text: sent ? "Refund approved, but the payout did not go through yet. Use Retry payout." : okText,
      });
      setRejecting(null);
      reload();
    } catch (err) {
      setNotice({ type: "error", text: describe(err) });
    } finally {
      setBusyId(null);
    }
  }

  const approve = (refund) => {
    const amount = formatPaise(refund.amountPaise);
    if (window.confirm(`Approve this refund of ${amount}? The money goes back through the payment gateway.`)) {
      decide(refund, { approve: true }, "Refund approved and sent.");
    }
  };

  async function retry(refund) {
    setBusyId(refund._id);
    setNotice(null);
    try {
      const result = await retryRefund(refund._id);
      setNotice(result.gatewayRefundId
        ? { type: "ok", text: "Refund sent." }
        : { type: "error", text: "The payout did not go through again. Please try later." });
      reload();
    } catch (err) {
      setNotice({ type: "error", text: describe(err) });
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    {
      key: "payment",
      header: "Payment",
      render: (r) => (
        <span className="font-medium text-eromza-text">{receiptOf[r.paymentId] || `...${String(r.paymentId).slice(-6)}`}</span>
      ),
    },
    { key: "amount", header: "Amount", render: (r) => <span className="text-xs font-semibold text-eromza-text">{formatPaise(r.amountPaise)}</span> },
    {
      key: "reason",
      header: "Reason",
      render: (r) => (
        <div className="max-w-xs">
          <p className="text-xs text-eromza-muted">{r.reason}</p>
          {r.decisionNote ? <p className="mt-1 text-[11px] text-eromza-subtle">Note: {r.decisionNote}</p> : null}
        </div>
      ),
    },
    { key: "date", header: "Raised", render: (r) => <span className="text-xs text-eromza-muted">{formatDate(r.createdAt)}</span> },
    { key: "status", header: "Status", render: (r) => { const s = statusOf(r); return <Badge variant={s.variant}>{s.label}</Badge>; } },
  ];

  if (canDecide) {
    columns.push({
      key: "actions",
      header: "Actions",
      render: (r) => {
        const busy = busyId === r._id;
        if (r.status === "requested") {
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => approve(r)}><Check size={13} /> Approve</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setNote(""); setRejecting(r); }}><Ban size={13} /> Reject</Button>
            </div>
          );
        }
        if (r.status === "approved" && !r.gatewayRefundId) {
          return <Button size="sm" variant="secondary" disabled={busy} onClick={() => retry(r)}><RotateCw size={13} /> Retry payout</Button>;
        }
        return <span className="text-xs text-eromza-muted">-</span>;
      },
    });
  }

  const label = purpose === "exam" ? "Exam fee" : "Admission fee";

  return (
    <div className="space-y-6">
      {showHeader ? (
        <PageHeader
          eyebrow={canDecide ? "Super Admin" : "Payments"}
          title="Refunds"
          description={canRequest
            ? `Raise a refund for a paid ${label.toLowerCase()} payment. The Super Admin approves it.`
            : `Review ${label.toLowerCase()} refund requests and send the money back.`}
        />
      ) : null}

      <Card>
        <CardHeader
          title={`${label} refunds`}
          description={meta ? `${meta.total} in total` : "Loading..."}
          action={canRequest ? <Button size="sm" onClick={openRaise}><Plus size={14} /> Raise refund</Button> : null}
        />
        <div className="p-5 pb-0">
          <Select
            label="Status"
            className="max-w-[200px]"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          {notice ? (
            <p role="status" className={`mt-3 text-xs ${notice.type === "ok" ? "text-emerald-700" : "text-eromza-error"}`}>{notice.text}</p>
          ) : null}
        </div>

        {error ? (
          <ErrorState description={error.message} onRetry={reload} />
        ) : (
          <DataTable columns={columns} rows={rows} loading={loading} getRowKey={(r) => r._id} emptyTitle="No refunds found" emptyDescription="Refund requests will appear here." />
        )}
        {meta && meta.totalPages > 1 ? (
          <div className="border-t border-eromza-border px-5 py-3">
            <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>

      {/* Raise a refund */}
      <Modal
        open={raising}
        onClose={() => setRaising(false)}
        title="Raise refund"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRaising(false)}>Cancel</Button>
            <Button onClick={submitRaise} disabled={saving || !form.paymentId || !form.amount || !form.reason.trim()}>
              {saving ? "Saving..." : "Request refund"}
            </Button>
          </>
        )}
      >
        <div className="grid gap-4">
          <Select label="Paid payment" value={form.paymentId} onChange={pickPayment}>
            <option value="">Select a payment...</option>
            {refundablePayments.map((p) => (
              <option key={p._id} value={p._id}>
                {(p.receiptNumber || `...${String(p._id).slice(-6)}`)} - {formatPaise(p.amountPaise)} (refundable {formatPaise(refundable(p))})
              </option>
            ))}
          </Select>
          {!payments.loading && refundablePayments.length === 0 ? (
            <p className="text-xs text-eromza-muted">No paid {label.toLowerCase()} payment with money left to refund.</p>
          ) : null}
          <Input
            label="Refund amount (Rs)"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={setField("amount")}
            hint={chosen ? `At most ${formatPaise(refundable(chosen))}` : undefined}
          />
          <Input label="Reason" value={form.reason} onChange={setField("reason")} hint="At least 3 letters" />
        </div>
        {formError ? <p role="alert" className="mt-3 text-xs text-eromza-error">{formError}</p> : null}
      </Modal>

      {/* Reject needs a reason */}
      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Reject refund"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button
              disabled={!note.trim() || busyId === rejecting?._id}
              onClick={() => decide(rejecting, { approve: false, note: note.trim() }, "Refund rejected.")}
            >
              Reject refund
            </Button>
          </>
        )}
      >
        <Input label="Why is it rejected?" value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>
    </div>
  );
}
