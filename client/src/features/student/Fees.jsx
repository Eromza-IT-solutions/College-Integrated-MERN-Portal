import { useState } from "react";
import { CreditCard, Download, Receipt, Wallet } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import {
  studentFeeSummary,
  studentFeeTransactions,
} from "../../mocks/studentData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

const money = (value) => `₹${value.toLocaleString("en-IN")}`;

export default function Fees() {
  const [summary, setSummary] = useState(studentFeeSummary);
  const [transactions, setTransactions] = useState(studentFeeTransactions);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    amount: String(studentFeeSummary.pending),
    method: "UPI",
  });

  const handlePay = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > summary.pending) {
      return;
    }

    const nextPending = summary.pending - amount;
    setSummary((current) => ({
      ...current,
      paid: current.paid + amount,
      pending: nextPending,
      status: nextPending === 0 ? "paid" : "unpaid",
    }));
    setTransactions((current) => [
      {
        id: `TXN-${Date.now()}`,
        description: "Semester V fee payment",
        amount,
        method: form.method,
        date: "Today",
        status: "paid",
      },
      ...current,
    ]);
    setForm({ amount: "", method: "UPI" });
    setModalOpen(false);
  };

  const handleExport = () => {
    downloadCsv("eromza-student-fees.csv", [
      ["ID", "Description", "Amount", "Method", "Date", "Status"],
      ...transactions.map((row) => [
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
        eyebrow="Student workspace"
        title="Fees"
        description="Review your semester fee balance, payment history, and receipts."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export statement
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              disabled={summary.pending === 0}
            >
              <CreditCard size={16} />
              Pay fees
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total fees"
          value={money(summary.total)}
          tone="info"
          icon={Wallet}
        />
        <StatCard
          label="Paid"
          value={money(summary.paid)}
          tone="success"
          icon={Receipt}
        />
        <StatCard
          label="Pending"
          value={money(summary.pending)}
          tone="warning"
          icon={CreditCard}
        />
        <StatCard
          label="Due date"
          value={summary.dueDate}
          tone="accent"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Payment history"
            description="Fee transactions recorded for your account"
          />
          <DataTable
            columns={columns}
            rows={transactions}
            emptyTitle="No fee transactions"
          />
        </Card>

        <Card>
          <CardHeader
            title="Fee summary"
            description="Current semester balance"
            action={
              <Badge variant={getStatusVariant(summary.status)}>
                {formatStatus(summary.status)}
              </Badge>
            }
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl bg-eromza-bg p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                Outstanding balance
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-eromza-text">
                {money(summary.pending)}
              </p>
              <p className="mt-1 text-xs text-eromza-muted">
                Due by {summary.dueDate}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-eromza-muted">Paid</span>
                <span className="font-semibold text-eromza-text">
                  {money(summary.paid)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-eromza-success"
                  style={{
                    width: `${Math.round((summary.paid / summary.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setModalOpen(true)}
              disabled={summary.pending === 0}
            >
              <CreditCard size={16} />
              Pay outstanding fees
            </Button>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Pay fees"
        description={`Outstanding balance: ${money(summary.pending)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="student-fee-form">
              <CreditCard size={16} />
              Pay now
            </Button>
          </>
        }
      >
        <form id="student-fee-form" className="space-y-4" onSubmit={handlePay}>
          <Input
            label="Amount"
            type="number"
            min="1"
            max={summary.pending}
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({ ...current, amount: event.target.value }))
            }
            required
          />
          <Select
            label="Payment method"
            value={form.method}
            onChange={(event) =>
              setForm((current) => ({ ...current, method: event.target.value }))
            }
          >
            <option value="UPI">UPI</option>
            <option value="Net banking">Net banking</option>
            <option value="Card">Debit or credit card</option>
          </Select>
        </form>
      </Modal>
    </div>
  );
}
