
import { useMemo, useState } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Download,
  Filter,
  GraduationCap,
  CalendarDays,
  ArrowUpRight,
  FileCheck,
  X,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ClipboardList,
} from "lucide-react";

const initialApplications = [
  {
    id: "ADM2026001",
    name: "Aarav Sharma",
    email: "aarav.sharma@gmail.com",
    phone: "+91 98765 43210",
    course: "BCA",
    date: "2026-11-12",
    qualification: "HSC",
    percentage: "89%",
    category: "Open",
    city: "Pune",
    status: "Pending",
    documents: "Under Review",
    initials: "AS",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "ADM2026002",
    name: "Sara Khan",
    email: "sara.khan@gmail.com",
    phone: "+91 98765 12345",
    course: "BBA",
    date: "2026-11-11",
    qualification: "HSC",
    percentage: "92%",
    category: "OBC",
    city: "Pune",
    status: "Approved",
    documents: "Verified",
    initials: "SK",
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "ADM2026003",
    name: "Rahul Patil",
    email: "rahul.patil@gmail.com",
    phone: "+91 98765 67890",
    course: "B.Com",
    date: "2026-11-10",
    qualification: "HSC",
    percentage: "78%",
    category: "Open",
    city: "Mumbai",
    status: "Pending",
    documents: "Pending",
    initials: "RP",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "ADM2026004",
    name: "Zoya Shaikh",
    email: "zoya.shaikh@gmail.com",
    phone: "+91 98765 11111",
    course: "BCA",
    date: "2026-11-09",
    qualification: "HSC",
    percentage: "95%",
    category: "OBC",
    city: "Pune",
    status: "Approved",
    documents: "Verified",
    initials: "ZS",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "ADM2026005",
    name: "Arjun Deshmukh",
    email: "arjun.d@gmail.com",
    phone: "+91 98765 22222",
    course: "BBA",
    date: "2026-11-08",
    qualification: "HSC",
    percentage: "67%",
    category: "SC",
    city: "Satara",
    status: "Rejected",
    documents: "Incomplete",
    initials: "AD",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "ADM2026006",
    name: "Ayesha Shaikh",
    email: "ayesha.shaikh@gmail.com",
    phone: "+91 98765 33333",
    course: "BCA",
    date: "2026-11-07",
    qualification: "HSC",
    percentage: "91%",
    category: "Open",
    city: "Pune",
    status: "Pending",
    documents: "Under Review",
    initials: "AS",
    color: "bg-rose-100 text-rose-700",
  },
  {
    id: "ADM2026007",
    name: "Faiz Mansuri",
    email: "faiz.mansuri@gmail.com",
    phone: "+91 98765 44444",
    course: "B.Com",
    date: "2026-11-06",
    qualification: "HSC",
    percentage: "82%",
    category: "OBC",
    city: "Pune",
    status: "Approved",
    documents: "Verified",
    initials: "FM",
    color: "bg-cyan-100 text-cyan-700",
  },
];

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

function ManageApplications() {
  const [applications, setApplications] = useState(initialApplications);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter((app) => app.status === "Pending").length,
    approved: applications.filter((app) => app.status === "Approved").length,
    rejected: applications.filter((app) => app.status === "Rejected").length,
  }), [applications]);

  const processedCount = stats.approved + stats.rejected;

  const completionPercentage = stats.total
    ? Math.round((processedCount / stats.total) * 100)
    : 0;

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const searchMatch =
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.id.toLowerCase().includes(search.toLowerCase()) ||
        app.email.toLowerCase().includes(search.toLowerCase());

      const statusMatch =
        statusFilter === "All" || app.status === statusFilter;

      const courseMatch =
        courseFilter === "All" || app.course === courseFilter;

      return searchMatch && statusMatch && courseMatch;
    });
  }, [applications, search, statusFilter, courseFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredApplications.length / itemsPerPage)
  );

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const updateStatus = (id, newStatus) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status: newStatus,
              documents:
                newStatus === "Approved" ? "Verified" : app.documents,
            }
          : app
      )
    );

    setSelectedApplication((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            status: newStatus,
            documents:
              newStatus === "Approved" ? "Verified" : prev.documents,
          }
        : prev
    );
  };

  const exportCSV = () => {
    const headers = [
      "Application ID",
      "Student Name",
      "Email",
      "Course",
      "Applied Date",
      "Status",
    ];

    const rows = filteredApplications.map((app) => [
      app.id,
      app.name,
      app.email,
      app.course,
      app.date,
      app.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admission-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: "Total Applications",
      value: stats.total,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      change: "All received applications",
    },
    {
      title: "Pending Review",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      change: "Awaiting decision",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      change: "Successfully accepted",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      change: "Not accepted",
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#172951] via-[#243F70] to-[#8E0018] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-100">
              ADMISSION MANAGEMENT / APPLICATIONS
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Manage Applications
            </h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Review student applications, monitor admission progress and
              manage application decisions from one place.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                Academic Year 2026–27
              </span>
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1.5 text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Admission Portal Active
              </span>
            </div>
          </div>

          <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 md:flex">
            <ClipboardList size={55} strokeWidth={1.3} />
          </div>
        </div>

        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[25px] border-white/5" />
        <div className="absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
      </section>

      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[#172951]">
            Application Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track and manage all student admission applications.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#8E0018] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#700014] hover:shadow-lg"
        >
          <Download size={17} />
          Export Applications
        </button>
      </div>

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon size={23} className={card.color} />
                </div>
                <ArrowUpRight
                  size={19}
                  className="text-slate-300 transition group-hover:text-[#8E0018]"
                />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                {card.title}
              </p>
              <h3 className="mt-1 text-3xl font-bold text-[#172951]">
                {card.value.toLocaleString()}
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {card.change}
              </p>
            </div>
          );
        })}
      </section>

      {/* Application Progress */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Admission Processing */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#172951]">
                Admission Processing
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Current application status distribution
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <FileCheck size={20} />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {[
              {
                label: "Approved Applications",
                count: stats.approved,
                color: "bg-emerald-500",
                text: "text-emerald-600",
              },
              {
                label: "Pending Applications",
                count: stats.pending,
                color: "bg-amber-400",
                text: "text-amber-600",
              },
              {
                label: "Rejected Applications",
                count: stats.rejected,
                color: "bg-rose-500",
                text: "text-rose-600",
              },
            ].map((item) => {
              const percentage =
                stats.total > 0
                  ? Math.round((item.count / stats.total) * 100)
                  : 0;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-600">
                      {item.label}
                    </span>
                    <span className={`text-sm font-bold ${item.text}`}>
                      {item.count} ({percentage}%)
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* New Processing Overview Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:shadow-md">

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#172951]">
                Processing Overview
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Admission performance summary
              </p>
            </div>

            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live Overview
            </span>
          </div>

          {/* Mini Statistics */}
          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <UserCheck size={19} />
              </div>

              <h3 className="mt-3 text-3xl font-bold text-[#172951]">
                {processedCount}
              </h3>

              <p className="mt-1 text-[11px] font-medium text-slate-600">
                Applications Processed
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                <CheckCircle size={19} />
              </div>

              <h3 className="mt-3 text-3xl font-bold text-emerald-700">
                {completionPercentage}%
              </h3>

              <p className="mt-1 text-[11px] font-medium text-slate-600">
                Overall Completion
              </p>
            </div>

          </div>

          {/* Processing Progress */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Processing Progress
              </span>

              <span className="text-sm font-bold text-emerald-600">
                {completionPercentage}%
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                style={{
                  width: `${completionPercentage}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Based on approved and rejected applications
            </p>
          </div>
        </div>
      </section>

      {/* Applications Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-bold text-[#172951]">
                All Applications
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Search, filter and review student applications.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarDays size={15} />
              Academic Year 2026–27
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search name, ID or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#8E0018] focus:bg-white focus:ring-2 focus:ring-[#8E0018]/10"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm text-slate-600 outline-none focus:border-[#8E0018]"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="relative">
              <GraduationCap
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-600 outline-none focus:border-[#8E0018]"
              >
                <option value="All">All Courses</option>
                <option value="BCA">BCA</option>
                <option value="BBA">BBA</option>
                <option value="B.Com">B.Com</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-semibold">Student Details</th>
                <th className="px-5 py-4 font-semibold">Application ID</th>
                <th className="px-5 py-4 font-semibold">Course</th>
                <th className="px-5 py-4 font-semibold">Applied Date</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedApplications.map((app) => (
                <tr
                  key={app.id}
                  className="transition hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${app.color}`}>
                        {app.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#172951]">
                          {app.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {app.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold text-[#8E0018]">
                      {app.id}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {app.course}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(`${app.date}T00:00:00`).toLocaleDateString(
                      "en-IN",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[app.status]}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {app.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => setSelectedApplication(app)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#172951] transition hover:border-[#8E0018] hover:bg-[#8E0018] hover:text-white"
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedApplications.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Search size={24} />
                    </div>
                    <p className="mt-3 font-semibold text-slate-700">
                      No applications found
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Try changing your search or filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">
            Showing{" "}
            {filteredApplications.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}
            {" "}to{" "}
            {Math.min(currentPage * itemsPerPage, filteredApplications.length)}
            {" "}of {filteredApplications.length} applications
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>

            <span className="rounded-lg bg-[#172951] px-3.5 py-2 text-xs font-bold text-white">
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#172951] to-[#304C7C] p-5 text-white">
              <div>
                <p className="text-xs text-blue-100">
                  APPLICATION DETAILS
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {selectedApplication.name}
                </h3>
                <p className="mt-1 text-xs text-blue-100">
                  {selectedApplication.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">Application Status</p>
                  <span className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[selectedApplication.status]}`}>
                    {selectedApplication.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Applied Date</p>
                  <p className="mt-1 text-sm font-semibold text-[#172951]">
                    {new Date(`${selectedApplication.date}T00:00:00`).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-bold text-[#172951]">
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Detail icon={Mail} label="Email Address" value={selectedApplication.email} />
                  <Detail icon={Phone} label="Phone Number" value={selectedApplication.phone} />
                  <Detail icon={MapPin} label="City" value={selectedApplication.city} />
                  <Detail icon={GraduationCap} label="Applied Course" value={selectedApplication.course} />
                  <Detail icon={ClipboardList} label="Qualification" value={selectedApplication.qualification} />
                  <Detail icon={CheckCircle} label="Percentage" value={selectedApplication.percentage} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="mb-3 font-bold text-[#172951]">
                  Document Verification
                </h4>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Document status
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {selectedApplication.documents}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Student Category
                  </span>
                  <span className="text-sm font-semibold text-[#172951]">
                    {selectedApplication.category}
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>

                {selectedApplication.status !== "Rejected" && (
                  <button
                    onClick={() =>
                      updateStatus(selectedApplication.id, "Rejected")
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <XCircle size={17} />
                    Reject
                  </button>
                )}

                {selectedApplication.status !== "Approved" && (
                  <button
                    onClick={() =>
                      updateStatus(selectedApplication.id, "Approved")
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <CheckCircle size={17} />
                    Approve Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#172951]">
          {value}
        </p>
      </div>
    </div>
  );
}

export default ManageApplications;
