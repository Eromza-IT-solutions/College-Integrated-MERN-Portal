
import { useMemo, useState } from "react";
import {
  Wallet,
  IndianRupee,
  CheckCircle,
  Clock,
  Search,
  Eye,
  X,
  Download,
  TrendingUp,
  CreditCard,
  GraduationCap,
  CalendarDays,
  Filter,
  ArrowUpRight,
  Receipt,
} from "lucide-react";

const initialPayments = [
  { id: "PAY1001", name: "Aarav Sharma", appId: "APP2026001", course: "BCA", amount: 45000, paid: 45000, date: "12 Nov 2026", method: "UPI", status: "Paid" },
  { id: "PAY1002", name: "Sara Khan", appId: "APP2026002", course: "BBA", amount: 52000, paid: 52000, date: "11 Nov 2026", method: "Card", status: "Paid" },
  { id: "PAY1003", name: "Rahul Patil", appId: "APP2026003", course: "B.Com", amount: 38000, paid: 20000, date: "10 Nov 2026", method: "UPI", status: "Partial" },
  { id: "PAY1004", name: "Zoya Shaikh", appId: "APP2026004", course: "BCA", amount: 45000, paid: 0, date: "-", method: "-", status: "Pending" },
  { id: "PAY1005", name: "Arjun Deshmukh", appId: "APP2026005", course: "B.Sc", amount: 42000, paid: 42000, date: "09 Nov 2026", method: "Net Banking", status: "Paid" },
  { id: "PAY1006", name: "Ayesha Shaikh", appId: "APP2026006", course: "BBA", amount: 52000, paid: 30000, date: "08 Nov 2026", method: "UPI", status: "Partial" },
  { id: "PAY1007", name: "Faiz Mansuri", appId: "APP2026007", course: "BCA", amount: 45000, paid: 0, date: "-", method: "-", status: "Pending" },
  { id: "PAY1008", name: "Iqra Khan", appId: "APP2026008", course: "B.Com", amount: 38000, paid: 38000, date: "06 Nov 2026", method: "Card", status: "Paid" },
  { id: "PAY1009", name: "Junaid Khan", appId: "APP2026009", course: "B.Sc", amount: 42000, paid: 42000, date: "05 Nov 2026", method: "UPI", status: "Paid" },
];

const courseFees = [
  { name: "BCA", fee: 45000, collected: 315000, total: 405000 },
  { name: "BBA", fee: 52000, collected: 82000, total: 312000 },
  { name: "B.Com", fee: 38000, collected: 58000, total: 228000 },
  { name: "B.Sc", fee: 42000, collected: 84000, total: 252000 },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function FeesPayments() {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState(null);

  const stats = useMemo(() => {
    const collected = payments.reduce((sum, p) => sum + p.paid, 0);
    const pending = payments.reduce((sum, p) => sum + (p.amount - p.paid), 0);

    return {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      collected,
      pending,
      transactions: payments.filter((p) => p.paid > 0).length,
    };
  }, [payments]);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.name.toLowerCase().includes(search.toLowerCase()) ||
      payment.appId.toLowerCase().includes(search.toLowerCase()) ||
      payment.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || payment.status === statusFilter;

    const matchesCourse =
      courseFilter === "All" || payment.course === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  const markAsPaid = (id) => {
    setPayments((prev) =>
      prev.map((payment) =>
        payment.id === id
          ? {
              ...payment,
              paid: payment.amount,
              status: "Paid",
              date: "15 Nov 2026",
              method: "UPI",
            }
          : payment
      )
    );

    setSelectedPayment((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            paid: prev.amount,
            status: "Paid",
            date: "15 Nov 2026",
            method: "UPI",
          }
        : prev
    );
  };

  const statusStyle = (status) => {
    if (status === "Paid") return "bg-emerald-50 text-emerald-700";
    if (status === "Partial") return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-700";
  };

  const summaryCards = [
    {
      title: "Total Fee Amount",
      value: formatCurrency(stats.total),
      description: "Total expected collection",
      icon: Wallet,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Collected Fees",
      value: formatCurrency(stats.collected),
      description: "Successfully received",
      icon: CheckCircle,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Pending Fees",
      value: formatCurrency(stats.pending),
      description: "Remaining fee amount",
      icon: Clock,
      color: "bg-amber-50 text-amber-700",
    },
    {
      title: "Transactions",
      value: stats.transactions,
      description: "Payments received",
      icon: CreditCard,
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#172951] via-[#243D70] to-[#49315F] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
              <Wallet size={17} />
              <span>Admission Administration / Fees & Payments</span>
            </div>
            <h2 className="text-2xl font-bold md:text-3xl">
              Fees & Payments Management
            </h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Track student fee collections, monitor pending payments and
              manage admission transactions from one place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <CalendarDays size={25} className="text-yellow-300" />
            <div>
              <p className="text-xs text-blue-100">Academic Year</p>
              <p className="text-lg font-bold">2026–27</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="absolute -bottom-28 right-48 h-64 w-64 rounded-full border-[35px] border-white/5" />
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-xl p-3 ${card.color}`}>
                  <Icon size={22} />
                </div>
                <ArrowUpRight
                  size={19}
                  className="text-slate-300 transition group-hover:text-[#8E0018]"
                />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">
                {card.title}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-[#172951]">
                {card.value}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Collection Overview */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#172951]">
                Fee Collection Overview
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Overall collection performance
              </p>
            </div>
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              Academic Year 2026–27
            </span>
          </div>

          <div className="mt-7 grid grid-cols-1 items-center gap-7 sm:grid-cols-2">
            <div className="flex justify-center">
              <div
                className="relative flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#16845B 0% ${
                    stats.total ? (stats.collected / stats.total) * 100 : 0
                  }%, #F1B94B ${
                    stats.total ? (stats.collected / stats.total) * 100 : 0
                  }% 100%)`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-xs text-slate-500">Collected</span>
                  <span className="mt-1 text-2xl font-bold text-[#172951]">
                    {stats.total
                      ? Math.round((stats.collected / stats.total) * 100)
                      : 0}%
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Fee collection
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">
                    Collected Amount
                  </span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(stats.collected)}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{
                      width: `${
                        stats.total
                          ? (stats.collected / stats.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">
                    Pending Amount
                  </span>
                  <span className="font-bold text-amber-700">
                    {formatCurrency(stats.pending)}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{
                      width: `${
                        stats.total
                          ? (stats.pending / stats.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-5 pt-1 text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  Collected
                </span>
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Pending
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Highlights */}
        <div className="rounded-2xl bg-gradient-to-br from-[#8E0018] to-[#B52B45] p-6 text-white shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <TrendingUp size={23} />
          </div>
          <h3 className="mt-5 text-lg font-bold">Payment Highlights</h3>
          <p className="mt-1 text-sm text-red-100">
            Current payment activity
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <span className="text-sm text-red-100">Paid Transactions</span>
              <span className="text-xl font-bold">
                {stats.transactions}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <span className="text-sm text-red-100">Partial Payments</span>
              <span className="text-xl font-bold">
                {payments.filter((p) => p.status === "Partial").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-100">Pending Payments</span>
              <span className="text-xl font-bold">
                {payments.filter((p) => p.status === "Pending").length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Course Fee Overview */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <GraduationCap size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#172951]">
              Course-wise Fee Overview
            </h3>
            <p className="text-sm text-slate-500">
              Fee collection by academic programme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {courseFees.map((course) => (
            <div
              key={course.name}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#172951]">{course.name}</h4>
                <GraduationCap size={19} className="text-[#8E0018]" />
              </div>
              <p className="mt-3 text-xs text-slate-500">Annual Course Fee</p>
              <p className="mt-1 text-lg font-bold text-[#172951]">
                {formatCurrency(course.fee)}
              </p>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">Collection</span>
                <span className="font-semibold text-emerald-700">
                  {Math.round((course.collected / course.total) * 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#243D70]"
                  style={{
                    width: `${(course.collected / course.total) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formatCurrency(course.collected)} collected
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Payments Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-lg font-bold text-[#172951]">
              Student Payment Records
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              View and manage student admission fee payments
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or ID..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#243D70] sm:w-56"
              />
            </div>

            <div className="relative">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-[#243D70]"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#243D70]"
            >
              <option value="All">All Courses</option>
              <option value="BCA">BCA</option>
              <option value="BBA">BBA</option>
              <option value="B.Com">B.Com</option>
              <option value="B.Sc">B.Sc</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Application ID</th>
                <th className="px-5 py-4">Course</th>
                <th className="px-5 py-4">Total Fee</th>
                <th className="px-5 py-4">Paid Amount</th>
                <th className="px-5 py-4">Payment Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="transition hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#172951]">
                      {payment.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {payment.id}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {payment.appId}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {payment.course}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                    {formatCurrency(payment.paid)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#172951] transition hover:border-[#8E0018] hover:bg-red-50 hover:text-[#8E0018]"
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row">
          <span>
            Showing {filteredPayments.length} of {payments.length} payment
            records
          </span>
          <span>Academic Year 2026–27</span>
        </div>
      </section>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#172951] to-[#344B78] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="font-bold">Payment Details</h3>
                  <p className="text-xs text-blue-100">
                    Transaction ID: {selectedPayment.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="rounded-lg p-2 transition hover:bg-white/15"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Student Name</p>
                <p className="mt-1 text-lg font-bold text-[#172951]">
                  {selectedPayment.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedPayment.appId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Course</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedPayment.course}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment Method</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedPayment.method}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Fee</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid Amount</p>
                  <p className="mt-1 font-semibold text-emerald-700">
                    {formatCurrency(selectedPayment.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remaining Amount</p>
                  <p className="mt-1 font-semibold text-red-600">
                    {formatCurrency(
                      selectedPayment.amount - selectedPayment.paid
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment Date</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedPayment.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Payment Status
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle(
                    selectedPayment.status
                  )}`}
                >
                  {selectedPayment.status}
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                {selectedPayment.status !== "Paid" && (
                  <button
                    onClick={() => markAsPaid(selectedPayment.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8E0018] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#700014]"
                  >
                    <CheckCircle size={17} />
                    Mark as Paid
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#172951] transition hover:bg-slate-50"
                >
                  <Download size={17} />
                  Print Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeesPayments;
