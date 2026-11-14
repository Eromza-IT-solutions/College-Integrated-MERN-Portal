import { useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  IndianRupee,
  Plus,
  Receipt,
  RotateCcw,
  Wallet,
} from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { admissionPayments } from "../../../mocks/admissionAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FeesAndPayments() {
  const [rows, setRows] = useState(admissionPayments);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [form, setForm] = useState({
    applicant: "",
    program: "B.Com",
    amount: "",
    method: "UPI",
    status: "paid",
  });

  const methods = useMemo(
    () => [...new Set(rows.map((row) => row.method))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.applicant.toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesMethod =
        methodFilter === "all" || row.method === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [methodFilter, query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const paidTotal = rows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingTotal = rows
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount, 0);
  const refundRequests = rows.filter(
    (row) => row.status === "refund requested",
  ).length;

  const handleExport = () => {
    downloadCsv("eromza-admission-payments.csv", [
      ["Payment", "Applicant", "Program", "Amount", "Method", "Status", "Date"],
      ...filteredRows.map((row) => [
        row.id,
        row.applicant,
        row.program,
        row.amount,
        row.method,
        row.status,
        row.date,
      ]),
    ]);
  };

  const handleRecordPayment = (event) => {
    event.preventDefault();

    if (!form.applicant.trim() || !form.amount) return;

    const nextRow = {
      id: `PAY-${Date.now()}`,
      applicant: form.applicant.trim(),
      program: form.program,
      amount: Number(form.amount),
      method: form.method,
      status: form.status,
      date: "Today",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      applicant: "",
      program: "B.Com",
      amount: "",
      method: "UPI",
      status: "paid",
    });
    setIsRecordOpen(false);
    setPage(1);
  };

  const requestRefund = (paymentId) => {
    setRows((current) =>
      current.map((row) =>
        row.id === paymentId ? { ...row, status: "refund requested" } : row,
      ),
    );
    setSelectedPayment((current) =>
      current ? { ...current, status: "refund requested" } : current,
    );
  };

  const columns = [
    {
      key: "applicant",
      header: "Payment",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.applicant}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
        </div>
      ),
    },
    {
      key: "program",
      header: "Program",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.program}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className="text-xs font-semibold text-eromza-text">
          {formatAmount(row.amount)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => <Badge variant="neutral">{row.method}</Badge>,
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
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.date}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPayment(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Receipt size={14} />
          Receipt
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions administration"
        title="Fees & Payments"
        description="Record admission fee payments, track pending balances, and handle refund requests."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export payments
            </Button>
            <Button onClick={() => setIsRecordOpen(true)}>
              <Plus size={16} />
              Record payment
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Fees Collected"
          value={`₹${(paidTotal / 1000).toFixed(1)}K`}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="Pending Amount"
          value={`₹${(pendingTotal / 1000).toFixed(1)}K`}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Refund Requests"
          value={String(refundRequests)}
          icon={RotateCcw}
          tone="accent"
        />
        <StatCard
          label="Transactions"
          value={String(rows.length)}
          icon={CreditCard}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Payment ledger"
          description="Admission fee transactions for the current cycle"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by applicant or payment ID..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={methodFilter}
              onChange={(event) => {
                setMethodFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by payment method"
              className="min-w-[150px]"
            >
              <option value="all">All methods</option>
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by payment status"
              className="min-w-[170px]"
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refund requested">Refund requested</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No payments found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} transactions
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record payment"
        description="Add a new admission fee transaction to the ledger."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="payment-form">
              Record payment
            </Button>
          </>
        }
      >
        <form id="payment-form" onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Applicant name"
            value={form.applicant}
            onChange={(event) =>
              setForm({ ...form, applicant: event.target.value })
            }
            placeholder="Enter applicant name"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Program"
              value={form.program}
              onChange={(event) =>
                setForm({ ...form, program: event.target.value })
              }
            >
              <option value="B.Com">B.Com</option>
              <option value="B.Sc. Computer Science">
                B.Sc. Computer Science
              </option>
              <option value="BBA">BBA</option>
              <option value="BCA">BCA</option>
              <option value="M.Com">M.Com</option>
            </Select>

            <Input
              label="Amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
              placeholder="e.g. 18500"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Payment method"
              value={form.method}
              onChange={(event) =>
                setForm({ ...form, method: event.target.value })
              }
            >
              <option value="UPI">UPI</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
            </Select>

            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title="Payment receipt"
        description={selectedPayment?.id}
        footer={
          <>
            {selectedPayment?.status === "paid" ? (
              <Button
                variant="secondary"
                onClick={() => requestRefund(selectedPayment.id)}
              >
                <RotateCcw size={14} />
                Request refund
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setSelectedPayment(null)}>
              Close
            </Button>
          </>
        }
      >
        {selectedPayment ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-eromza-sidebar p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                Amount received
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatAmount(selectedPayment.amount)}
              </p>
              <p className="mt-1 text-xs text-white/70">
                {selectedPayment.applicant} · {selectedPayment.program}
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Method
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedPayment.method}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Status
                </dt>
                <dd className="mt-1">
                  <Badge variant={getStatusVariant(selectedPayment.status)}>
                    {formatStatus(selectedPayment.status)}
                  </Badge>
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Date
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedPayment.date}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Reference
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedPayment.id}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
