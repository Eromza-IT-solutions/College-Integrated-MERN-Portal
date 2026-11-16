
import { useMemo, useState } from "react";
import {
  FileCheck,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Download,
  GraduationCap,
  CalendarDays,
  User,
  Mail,
  X,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";

const initialDocuments = [
  {
    id: "DOC001",
    applicationId: "ADM2026001",
    name: "Aarav Sharma",
    email: "aarav.sharma@gmail.com",
    course: "BCA",
    date: "2026-11-12",
    category: "Open",
    documents: [
      { name: "10th Marksheet", type: "PDF", status: "Verified" },
      { name: "12th Marksheet", type: "PDF", status: "Pending" },
      { name: "Aadhaar Card", type: "PDF", status: "Pending" },
      { name: "Passport Photo", type: "JPG", status: "Verified" },
    ],
    status: "Pending",
    initials: "AS",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "DOC002",
    applicationId: "ADM2026002",
    name: "Sara Khan",
    email: "sara.khan@gmail.com",
    course: "BBA",
    date: "2026-11-11",
    category: "OBC",
    documents: [
      { name: "10th Marksheet", type: "PDF", status: "Verified" },
      { name: "12th Marksheet", type: "PDF", status: "Verified" },
      { name: "Aadhaar Card", type: "PDF", status: "Verified" },
      { name: "Passport Photo", type: "JPG", status: "Verified" },
    ],
    status: "Verified",
    initials: "SK",
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "DOC003",
    applicationId: "ADM2026003",
    name: "Rahul Patil",
    email: "rahul.patil@gmail.com",
    course: "B.Com",
    date: "2026-11-10",
    category: "Open",
    documents: [
      { name: "10th Marksheet", type: "PDF", status: "Verified" },
      { name: "12th Marksheet", type: "PDF", status: "Rejected" },
      { name: "Aadhaar Card", type: "PDF", status: "Pending" },
      { name: "Passport Photo", type: "JPG", status: "Pending" },
    ],
    status: "Rejected",
    initials: "RP",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "DOC004",
    applicationId: "ADM2026004",
    name: "Zoya Shaikh",
    email: "zoya.shaikh@gmail.com",
    course: "BCA",
    date: "2026-11-09",
    category: "OBC",
    documents: [
      { name: "10th Marksheet", type: "PDF", status: "Verified" },
      { name: "12th Marksheet", type: "PDF", status: "Verified" },
      { name: "Aadhaar Card", type: "PDF", status: "Verified" },
      { name: "Passport Photo", type: "JPG", status: "Verified" },
    ],
    status: "Verified",
    initials: "ZS",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "DOC005",
    applicationId: "ADM2026005",
    name: "Arjun Deshmukh",
    email: "arjun.d@gmail.com",
    course: "BBA",
    date: "2026-11-08",
    category: "SC",
    documents: [
      { name: "10th Marksheet", type: "PDF", status: "Verified" },
      { name: "12th Marksheet", type: "PDF", status: "Rejected" },
      { name: "Aadhaar Card", type: "PDF", status: "Pending" },
      { name: "Passport Photo", type: "JPG", status: "Verified" },
    ],
    status: "Rejected",
    initials: "AD",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "DOC006",
    applicationId: "ADM2026006",
    name: "Ayesha Shaikh",
    email: "ayesha.shaikh@gmail.com",
    course: "BCA",
    date: "2026-11-07",
    category: "Open",
    documents: [
      { name: "10th Marksheet", type: "PDF", status: "Pending" },
      { name: "12th Marksheet", type: "PDF", status: "Pending" },
      { name: "Aadhaar Card", type: "PDF", status: "Verified" },
      { name: "Passport Photo", type: "JPG", status: "Verified" },
    ],
    status: "Pending",
    initials: "AS",
    color: "bg-rose-100 text-rose-700",
  },
];

const documentStatusStyles = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

function getOverallStatus(documents) {
  if (documents.some((doc) => doc.status === "Rejected")) return "Rejected";
  if (documents.every((doc) => doc.status === "Verified")) return "Verified";
  return "Pending";
}

function VerifyDocuments() {
  const [applications, setApplications] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const stats = useMemo(() => {
    const total = applications.length;
    const verified = applications.filter(
      (app) => app.status === "Verified"
    ).length;
    const pending = applications.filter(
      (app) => app.status === "Pending"
    ).length;
    const rejected = applications.filter(
      (app) => app.status === "Rejected"
    ).length;

    return { total, verified, pending, rejected };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const query = search.toLowerCase();

      const matchesSearch =
        app.name.toLowerCase().includes(query) ||
        app.applicationId.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || app.status === statusFilter;

      const matchesCourse =
        courseFilter === "All" || app.course === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [applications, search, statusFilter, courseFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredApplications.length / itemsPerPage)
  );

  const visibleApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const updateDocumentStatus = (applicationId, documentName, newStatus) => {
    setApplications((previous) =>
      previous.map((app) => {
        if (app.id !== applicationId) return app;

        const updatedDocuments = app.documents.map((doc) =>
          doc.name === documentName
            ? { ...doc, status: newStatus }
            : doc
        );

        return {
          ...app,
          documents: updatedDocuments,
          status: getOverallStatus(updatedDocuments),
        };
      })
    );

    setSelectedApplication((previous) => {
      if (!previous || previous.id !== applicationId) return previous;

      const updatedDocuments = previous.documents.map((doc) =>
        doc.name === documentName
          ? { ...doc, status: newStatus }
          : doc
      );

      return {
        ...previous,
        documents: updatedDocuments,
        status: getOverallStatus(updatedDocuments),
      };
    });
  };

  const updateAllDocuments = (application, newStatus) => {
    setApplications((previous) =>
      previous.map((app) =>
        app.id === application.id
          ? {
              ...app,
              documents: app.documents.map((doc) => ({
                ...doc,
                status: newStatus,
              })),
              status: newStatus,
            }
          : app
      )
    );

    setSelectedApplication((previous) =>
      previous?.id === application.id
        ? {
            ...previous,
            documents: previous.documents.map((doc) => ({
              ...doc,
              status: newStatus,
            })),
            status: newStatus,
          }
        : previous
    );
  };

  const statCards = [
    {
      title: "Total Applications",
      value: stats.total,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description: "Applications received",
    },
    {
      title: "Pending Verification",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      description: "Require document review",
    },
    {
      title: "Verified",
      value: stats.verified,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      description: "Documents approved",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      description: "Need correction",
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#172951] via-[#243F70] to-[#8E0018] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-100">
              ADMISSION MANAGEMENT / DOCUMENTS
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Verify Student Documents
            </h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Review submitted student documents, verify important records
              and manage document approval status.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                Academic Year 2026–27
              </span>
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1.5 text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Verification Centre Active
              </span>
            </div>
          </div>

          <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 md:flex">
            <ShieldCheck size={55} strokeWidth={1.3} />
          </div>
        </div>

        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[25px] border-white/5" />
        <div className="absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
      </section>

      {/* Heading */}
      <div>
        <h2 className="text-xl font-bold text-[#172951]">
          Document Verification Overview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Monitor document verification progress and student records.
        </p>
      </div>

      {/* Statistics */}
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
                <ClipboardCheck
                  size={19}
                  className="text-slate-300 transition group-hover:text-[#8E0018]"
                />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                {card.title}
              </p>
              <h3 className="mt-1 text-3xl font-bold text-[#172951]">
                {card.value}
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Verification Progress */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#172951]">
                Verification Progress
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Overall student document verification status
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <FileCheck size={21} />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {[
              {
                label: "Verified Applications",
                value: stats.verified,
                color: "bg-emerald-500",
                text: "text-emerald-600",
              },
              {
                label: "Pending Applications",
                value: stats.pending,
                color: "bg-amber-400",
                text: "text-amber-600",
              },
              {
                label: "Rejected Applications",
                value: stats.rejected,
                color: "bg-rose-500",
                text: "text-rose-600",
              },
            ].map((item) => {
              const percentage = stats.total
                ? Math.round((item.value / stats.total) * 100)
                : 0;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between gap-2">
                    <span className="text-sm font-medium text-slate-600">
                      {item.label}
                    </span>
                    <span className={`text-sm font-bold ${item.text}`}>
                      {item.value} ({percentage}%)
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

        <div className="rounded-2xl bg-gradient-to-br from-[#172951] to-[#304C7C] p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-white/10 p-3">
              <ShieldCheck size={23} />
            </div>
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
              Verification
            </span>
          </div>

          <p className="mt-5 text-sm text-blue-100">
            Verified Applications
          </p>
          <h3 className="mt-1 text-4xl font-bold">
            {stats.verified}
          </h3>
          <p className="mt-2 text-xs text-blue-200">
            Applications with all documents approved
          </p>

          <div className="mt-6 border-t border-white/15 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-blue-100">Verification rate</span>
              <span className="font-bold">
                {stats.total
                  ? Math.round((stats.verified / stats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{
                  width: `${
                    stats.total
                      ? (stats.verified / stats.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Student Documents Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-[#172951]">
                Student Document Records
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                View and verify documents submitted by applicants.
              </p>
            </div>

            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarDays size={15} />
              Academic Year 2026–27
            </span>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search student or application ID..."
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
                <option value="Verified">Verified</option>
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
                <th className="px-5 py-4 font-semibold">Student</th>
                <th className="px-5 py-4 font-semibold">Application ID</th>
                <th className="px-5 py-4 font-semibold">Course</th>
                <th className="px-5 py-4 font-semibold">Documents</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleApplications.map((app) => {
                const verifiedCount = app.documents.filter(
                  (doc) => doc.status === "Verified"
                ).length;

                return (
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
                        {app.applicationId}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {app.course}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#172951]">
                        {verifiedCount}/{app.documents.length} Verified
                      </p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${
                              (verifiedCount / app.documents.length) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${documentStatusStyles[app.status]}`}>
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
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}

              {visibleApplications.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Search size={24} />
                    </div>
                    <p className="mt-3 font-semibold text-slate-700">
                      No records found
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Try changing your search or filters.
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
            {filteredApplications.length
              ? (currentPage - 1) * itemsPerPage + 1
              : 0}
            {" "}to{" "}
            {Math.min(
              currentPage * itemsPerPage,
              filteredApplications.length
            )}
            {" "}of {filteredApplications.length} records
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>

            <span className="rounded-lg bg-[#172951] px-3.5 py-2 text-xs font-bold text-white">
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Document Review Modal */}
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
                  DOCUMENT VERIFICATION
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {selectedApplication.name}
                </h3>
                <p className="mt-1 text-xs text-blue-100">
                  {selectedApplication.applicationId}
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
              {/* Student Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${selectedApplication.color}`}>
                    {selectedApplication.initials}
                  </div>
                  <div>
                    <p className="font-bold text-[#172951]">
                      {selectedApplication.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedApplication.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedApplication.course} · {selectedApplication.category}
                    </p>
                  </div>
                </div>

                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${documentStatusStyles[selectedApplication.status]}`}>
                  {selectedApplication.status}
                </span>
              </div>

              {/* Document List */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#172951]">
                      Submitted Documents
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Review each document and update its status.
                    </p>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {selectedApplication.documents.length} Documents
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedApplication.documents.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-rose-50 p-3 text-[#8E0018]">
                          <FileText size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#172951]">
                            {doc.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {doc.type} Document · Demo record
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${documentStatusStyles[doc.status]}`}>
                          {doc.status}
                        </span>

                        <button
                          onClick={() =>
                            alert(
                              "This is a demo record. Connect an uploaded document URL to preview the actual file."
                            )
                          }
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-[#172951]"
                          title="Preview document"
                        >
                          <Eye size={16} />
                        </button>

                        {doc.status !== "Verified" && (
                          <button
                            onClick={() =>
                              updateDocumentStatus(
                                selectedApplication.id,
                                doc.name,
                                "Verified"
                              )
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Verify
                          </button>
                        )}

                        {doc.status !== "Rejected" && (
                          <button
                            onClick={() =>
                              updateDocumentStatus(
                                selectedApplication.id,
                                doc.name,
                                "Rejected"
                              )
                            }
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Actions */}
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  onClick={() =>
                    updateAllDocuments(selectedApplication, "Rejected")
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <XCircle size={17} />
                  Reject All
                </button>

                <button
                  onClick={() =>
                    updateAllDocuments(selectedApplication, "Verified")
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <CheckCircle size={17} />
                  Verify All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifyDocuments;
