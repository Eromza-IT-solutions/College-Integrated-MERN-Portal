import { useMemo } from "react";
import { CreditCard, Download, Receipt, Wallet } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import {
  downloadPaymentReceiptPdf,
  fetchExamForms,
  fetchAvailableExams,
  fetchPayments,
} from "../../services/studentApi";
import { formatDateTime, formatPaise } from "../../utils/format";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const METHOD_LABELS = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  other: "Other",
};

function loadFees() {
  return Promise.all([
    fetchPayments("exam"),
    fetchPayments("admission"),
    fetchExamForms(),
    fetchAvailableExams(),
  ]).then(([examPayments, admissionPayments, forms, available]) => ({
    payments: [...examPayments, ...admissionPayments],
    forms,
    available,
  }));
}

function methodOf(payment) {
  const method = payment.gatewayMethod
    ? METHOD_LABELS[payment.gatewayMethod] || METHOD_LABELS.other
    : null;
  return method || String(payment.gateway || "Gateway").replace(/^./, (char) =>
    char.toUpperCase(),
  );
}

export default function Fees() {
  const { data, loading, error, reload } = useApiData(loadFees);

  const payments = useMemo(
    () =>
      (data?.payments ?? [])
        .map((payment) => ({
          id: payment._id,
          description:
            payment.purpose === "exam"
              ? "Examination fee"
              : "Admission fee",
          receiptNumber: payment.receiptNumber || "Receipt pending",
          amount: formatPaise(payment.amountPaise),
          method: methodOf(payment),
          date: formatDateTime(payment.paidAt || payment.createdAt, "Not set"),
          status: payment.status,
          payment,
        }))
        .sort((a, b) =>
          new Date(b.payment.createdAt) - new Date(a.payment.createdAt),
        ),
    [data],
  );

  const pendingForms = useMemo(() => {
    const examOf = new Map(
      (data?.available ?? []).map((exam) => [String(exam._id), exam.name]),
    );
    return (data?.forms ?? [])
      .filter((form) => form.status === "pendingPayment")
      .map((form) => ({
        id: form._id,
        exam: examOf.get(String(form.examId)) || "Examination",
        amount: formatPaise(form.feeAmountPaise),
        amountPaise: form.feeAmountPaise ?? 0,
      }));
  }, [data]);

  const paidTotal = (data?.payments ?? [])
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + (payment.amountPaise ?? 0), 0);
  const pendingPayments = payments.filter(
    (payment) => payment.status === "created",
  ).length;
  const pendingFormTotal = pendingForms.reduce(
    (sum, form) => sum + form.amountPaise,
    0,
  );

  const handleExport = () => {
    downloadCsv("eromza-student-fees.csv", [
      ["ID", "Description", "Receipt", "Amount", "Method", "Date", "Status"],
      ...payments.map((row) => [
        row.id,
        row.description,
        row.receiptNumber,
        row.amount,
        row.method,
        row.date,
        row.status,
      ]),
    ]);
  };

  const columns = [
    {
      key: "description",
      header: "Payment",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.description}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.receiptNumber}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className="text-xs font-semibold text-eromza-text">
          {row.amount}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.method}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.date}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: "receipt",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={row.status !== "paid"}
          onClick={() => downloadPaymentReceiptPdf(row.payment)}
        >
          <Download size={14} />
          Receipt
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Fees"
        description="Review recorded payments, receipts, and exam form payment status."
        actions={
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={payments.length === 0}
          >
            <Download size={16} />
            Export statement
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Loader label="Loading payments..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load payments"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Paid to date"
              value={formatPaise(paidTotal, "0")}
              tone="success"
              icon={Receipt}
            />
            <StatCard
              label="Payment records"
              value={String(payments.length)}
              tone="info"
              icon={Wallet}
            />
            <StatCard
              label="Pending payments"
              value={String(pendingPayments)}
              tone="warning"
              icon={CreditCard}
            />
            <StatCard
              label="Forms awaiting fee"
              value={String(pendingForms.length)}
              tone="accent"
              icon={Receipt}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader
                title="Payment history"
                description="Payments recorded for your account"
              />
              <DataTable
                columns={columns}
                rows={payments}
                getRowKey={(row) => row.id}
                emptyTitle="No payments recorded"
                emptyDescription="Completed and pending payments will appear here."
              />
            </Card>

            <Card>
              <CardHeader
                title="Exam form fees"
                description="Exam forms waiting for payment"
                action={
                  <Badge variant={pendingForms.length ? "warning" : "success"}>
                    {pendingForms.length ? "Action needed" : "Clear"}
                  </Badge>
                }
              />
              <CardBody className="space-y-4">
                <div className="rounded-xl bg-eromza-bg p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                    Amount awaiting payment
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-eromza-text">
                    {formatPaise(pendingFormTotal, "0")}
                  </p>
                  <p className="mt-1 text-xs text-eromza-muted">
                    Across {pendingForms.length} exam form
                    {pendingForms.length === 1 ? "" : "s"}
                  </p>
                </div>
                {pendingForms.length ? (
                  <div className="space-y-2">
                    {pendingForms.map((form) => (
                      <div
                        key={form.id}
                        className="flex items-center justify-between rounded-lg border border-eromza-border p-3"
                      >
                        <span className="text-xs text-eromza-muted">
                          {form.exam}
                        </span>
                        <span className="text-xs font-semibold text-eromza-text">
                          {form.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-eromza-muted">
                    No exam form is waiting for payment.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
