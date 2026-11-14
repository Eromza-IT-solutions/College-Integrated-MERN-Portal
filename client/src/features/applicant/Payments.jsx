import { useState } from "react";
import { CreditCard, Download, Receipt, Wallet } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import {
  applicantPayment,
  applicantPaymentHistory,
} from "../../mocks/applicantData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const money = (value) => `₹${value.toLocaleString("en-IN")}`;

export default function Payments() {
  const [payment, setPayment] = useState(applicantPayment);
  const [history, setHistory] = useState(applicantPaymentHistory);
  const [modalOpen, setModalOpen] = useState(false);
  const [method, setMethod] = useState("UPI");

  const handlePay = (event) => {
    event.preventDefault();
    if (payment.status === "paid") return;

    setPayment((current) => ({ ...current, status: "paid" }));
    setHistory((current) => [
      {
        id: `APP-TXN-${Date.now()}`,
        description: "Admission fee",
        amount: payment.amount,
        method,
        date: "Today",
        status: "paid",
      },
      ...current,
    ]);
    setModalOpen(false);
  };

  const handleExport = () => {
    downloadCsv("eromza-applicant-payments.csv", [
      ["ID", "Description", "Amount", "Method", "Date", "Status"],
      ...history.map((row) => [
        row.id,
        row.description,
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
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className="text-xs font-semibold text-eromza-text">
          {money(row.amount)}
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admission portal"
        title="Payments"
        description="Pay your admission fee and review completed transactions."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export payments
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              disabled={payment.status === "paid"}
            >
              <CreditCard size={16} />
              Pay admission fee
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Admission fee"
          value={money(payment.amount)}
          tone="accent"
          icon={Wallet}
        />
        <StatCard
          label="Payment status"
          value={formatStatus(payment.status)}
          tone="warning"
          icon={CreditCard}
        />
        <StatCard
          label="Due date"
          value={payment.dueDate}
          tone="info"
          icon={Receipt}
        />
        <StatCard
          label="Transactions"
          value={String(history.length)}
          tone="success"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Payment history"
            description="Transactions linked to your application"
          />
          <DataTable
            columns={columns}
            rows={history}
            emptyTitle="No payments recorded"
          />
        </Card>

        <Card>
          <CardHeader
            title="Admission fee"
            description="Payment for the current application"
            action={
              <Badge variant={getStatusVariant(payment.status)}>
                {formatStatus(payment.status)}
              </Badge>
            }
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl bg-eromza-bg p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                Amount due
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-eromza-text">
                {money(payment.amount)}
              </p>
              <p className="mt-1 text-xs text-eromza-muted">
                Due by {payment.dueDate}
              </p>
            </div>
            <div className="rounded-lg bg-eromza-bg p-3 text-[11px] text-eromza-muted">
              Reference: {payment.reference}
            </div>
            <Button
              className="w-full"
              onClick={() => setModalOpen(true)}
              disabled={payment.status === "paid"}
            >
              <CreditCard size={16} />
              {payment.status === "paid" ? "Fee paid" : "Pay admission fee"}
            </Button>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Pay admission fee"
        description={`Amount due: ${money(payment.amount)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="applicant-payment-form">
              <CreditCard size={16} />
              Pay now
            </Button>
          </>
        }
      >
        <form
          id="applicant-payment-form"
          className="space-y-4"
          onSubmit={handlePay}
        >
          <Select
            label="Payment method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="UPI">UPI</option>
            <option value="Net banking">Net banking</option>
            <option value="Card">Debit or credit card</option>
          </Select>
          <div className="rounded-xl bg-eromza-bg p-4">
            <p className="text-xs text-eromza-muted">Amount to be charged</p>
            <p className="mt-1 text-lg font-semibold text-eromza-text">
              {money(payment.amount)}
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
