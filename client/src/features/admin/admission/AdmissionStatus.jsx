
import { useMemo, useState } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  GraduationCap,
  CalendarDays,
  ArrowUpRight,
  ClipboardCheck,
  UserCheck,
  FileCheck,
  Wallet,
  X,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const initialStudents = [
  {
    id: "ADM2026001",
    name: "Aarav Sharma",
    email: "aarav.sharma@gmail.com",
    phone: "+91 98765 43210",
    course: "BCA",
    date: "2026-11-12",
    percentage: "89%",
    category: "Open",
    city: "Pune",
    status: "Under Review",
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
    percentage: "92%",
    category: "OBC",
    city: "Pune",
    status: "Admitted",
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
    percentage: "78%",
    category: "Open",
    city: "Mumbai",
    status: "On Hold",
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
    percentage: "95%",
    category: "OBC",
    city: "Pune",
    status: "Fee Pending",
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
    percentage: "67%",
    category: "SC",
    city: "Satara",
    status: "Rejected",
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
    percentage: "91%",
    category: "Open",
    city: "Pune",
    status: "Documents Verified",
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
    percentage: "82%",
    category: "OBC",
    city: "Pune",
    status: "Application Submitted",
    initials: "FM",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    id: "ADM2026008",
    name: "Meera Joshi",
    email: "meera.joshi@gmail.com",
    phone: "+91 98765 55555",
    course: "BCA",
    date: "2026-11-05",
    percentage: "88%",
    category: "Open",
    city: "Pune",
    status: "Admitted",
    initials: "MJ",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "ADM2026009",
    name: "Kabir Ahmed",
    email: "kabir.ahmed@gmail.com",
    phone: "+91 98765 66666",
    course: "BBA",
    date: "2026-11-04",
    percentage: "85%",
    category: "OBC",
    city: "Mumbai",
    status: "Under Review",
    initials: "KA",
    color: "bg-orange-100 text-orange-700",
  },
  {
    id: "ADM2026010",
    name: "Ananya More",
    email: "ananya.more@gmail.com",
    phone: "+91 98765 77777",
    course: "B.Com",
    date: "2026-11-03",
    percentage: "90%",
    category: "Open",
    city: "Pune",
    status: "Admitted",
    initials: "AM",
    color: "bg-teal-100 text-teal-700",
  },
  {
    id: "ADM2026011",
    name: "Ibrahim Khan",
    email: "ibrahim.khan@gmail.com",
    phone: "+91 98765 88888",
    course: "BCA",
    date: "2026-11-02",
    percentage: "76%",
    category: "OBC",
    city: "Pune",
    status: "Under Review",
    initials: "IK",
    color: "bg-violet-100 text-violet-700",
  },
  {
    id: "ADM2026012",
    name: "Priya Kulkarni",
    email: "priya.k@gmail.com",
    phone: "+91 98765 99999",
    course: "BBA",
    date: "2026-11-01",
    percentage: "94%",
    category: "Open",
    city: "Nashik",
    status: "Admitted",
    initials: "PK",
    color: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    id: "ADM2026013",
    name: "Sameer Shaikh",
    email: "sameer.s@gmail.com",
    phone: "+91 98765 12121",
    course: "B.Com",
    date: "2026-10-30",
    percentage: "72%",
    category: "OBC",
    city: "Pune",
    status: "Rejected",
    initials: "SS",
    color: "bg-red-100 text-red-700",
  },
  {
    id: "ADM2026014",
    name: "Riya Desai",
    email: "riya.desai@gmail.com",
    phone: "+91 98765 13131",
    course: "BCA",
    date: "2026-10-29",
    percentage: "87%",
    category: "Open",
    city: "Pune",
    status: "Under Review",
    initials: "RD",
    color: "bg-sky-100 text-sky-700",
  },
  {
    id: "ADM2026015",
    name: "Omar Siddiqui",
    email: "omar.s@gmail.com",
    phone: "+91 98765 14141",
    course: "BBA",
    date: "2026-10-28",
    percentage: "81%",
    category: "OBC",
    city: "Mumbai",
    status: "On Hold",
    initials: "OS",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "ADM2026016",
    name: "Neha Pawar",
    email: "neha.pawar@gmail.com",
    phone: "+91 98765 15151",
    course: "B.Com",
    date: "2026-10-27",
    percentage: "86%",
    category: "Open",
    city: "Pune",
    status: "Under Review",
    initials: "NP",
    color: "bg-lime-100 text-lime-700",
  },
  {
    id: "ADM2026017",
    name: "Hassan Patel",
    email: "hassan.p@gmail.com",
    phone: "+91 98765 16161",
    course: "BCA",
    date: "2026-10-26",
    percentage: "93%",
    category: "OBC",
    city: "Pune",
    status: "Admitted",
    initials: "HP",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "ADM2026018",
    name: "Sana Merchant",
    email: "sana.m@gmail.com",
    phone: "+91 98765 17171",
    course: "BBA",
    date: "2026-10-25",
    percentage: "84%",
    category: "Open",
    city: "Pune",
    status: "Admitted",
    initials: "SM",
    color: "bg-rose-100 text-rose-700",
  },
];

const workflow = [
  "Application Submitted",
  "Under Review",
  "Documents Verified",
  "Fee Pending",
  "Admitted",
];

const statusStyles = {
  "Application Submitted": "bg-blue-50 text-blue-700 border-blue-200",
  "Under Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Documents Verified": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Fee Pending": "bg-orange-50 text-orange-700 border-orange-200",
  Admitted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  "On Hold": "bg-slate-100 text-slate-700 border-slate-200",
};

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AdmissionStatus() {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const stats = useMemo(() => ({
    total: students.length,
    review: students.filter((s) => s.status === "Under Review").length,
    admitted: students.filter((s) => s.status === "Admitted").length,
    pending: students.filter((s) =>
      ["Application Submitted", "Documents Verified", "Fee Pending"].includes(s.status)
    ).length,
    rejected: students.filter((s) => s.status === "Rejected").length,
    hold: students.filter((s) => s.status === "On Hold").length,
    verified: students.filter((s) =>
      ["Documents Verified", "Fee Pending", "Admitted"].includes(s.status)
    ).length,
    feePending: students.filter((s) => s.status === "Fee Pending").length,
  }), [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = search.toLowerCase();

      const matchesSearch =
        student.name.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || student.status === statusFilter;

      const matchesCourse =
        courseFilter === "All" || student.course === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [students, search, statusFilter, courseFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / itemsPerPage)
  );

  const visibleStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const updateStatus = (studentId, newStatus) => {
    setStudents((previous) =>
      previous.map((student) =>
        student.id === studentId
          ? { ...student, status: newStatus }
          : student
      )
    );

    setSelectedStudent((previous) =>
      previous?.id === studentId
        ? { ...previous, status: newStatus }
        : previous
    );
  };

  const statCards = [
    {
      title: "Total Applications",
      value: stats.total,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description: "All student applications",
    },
    {
      title: "Under Review",
      value: stats.review,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      description: "Currently being reviewed",
    },
    {
      title: "Admitted Students",
      value: stats.admitted,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      description: "Admission confirmed",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      description: "Applications declined",
    },
  ];

  const progressStages = [
    {
      label: "Application Submitted",
      icon: ClipboardCheck,
      count: stats.total,
    },
    {
      label: "Documents Verified",
      icon: FileCheck,
      count: 12,
    },
    {
      label: "Fee Pending",
      icon: Wallet,
      count: 8,
    },
    {
      label: "Admission Confirmed",
      icon: ShieldCheck,
      count: stats.admitted,
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#172951] via-[#243F70] to-[#8E0018] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-100">
              ADMISSION MANAGEMENT / STATUS
            </p>
            <h2 className="text-2xl font-bold md:text-3xl">
              Admission Status Tracking
            </h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Monitor every student's admission journey and track their
              progress from application submission to final confirmation.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                Academic Year 2026–27
              </span>
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1.5 text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Admission Tracking Active
              </span>
            </div>
          </div>

          <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 md:flex">
            <GraduationCap size={58} strokeWidth={1.3} />
          </div>
        </div>

        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[25px] border-white/5" />
        <div className="absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
      </section>

      {/* Page Heading */}
      <div>
        <h2 className="text-xl font-bold text-[#172951]">
          Admission Overview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Track student application progress and admission decisions.
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
                <ArrowUpRight
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

      {/* Admission Progress */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#172951]">
                Admission Journey Overview
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Student progress across important admission stages
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <ClipboardCheck size={21} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {progressStages.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <div
                  key={stage.label}
                  className="relative rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#8E0018] shadow-sm">
                    <Icon size={20} />
                  </div>
                  <h4 className="mt-4 text-2xl font-bold text-[#172951]">
                    {stage.count}
                  </h4>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                    {stage.label}
                  </p>
                  <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-300">
                    0{index + 1}
                  </span>
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
              Current Summary
            </span>
          </div>

          <p className="mt-5 text-sm text-blue-100">
            Successful Admissions
          </p>
          <h3 className="mt-1 text-4xl font-bold">
            {stats.admitted}
          </h3>
          <p className="mt-2 text-xs text-blue-200">
            Students whose admission is confirmed
          </p>

          <div className="mt-6 border-t border-white/15 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-blue-100">Admission rate</span>
              <span className="font-bold">
                {stats.total
                  ? Math.round((stats.admitted / stats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{
                  width: `${
                    stats.total
                      ? (stats.admitted / stats.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Student Admission Records */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-[#172951]">
                Student Admission Records
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Review and update the admission status of applicants.
              </p>
            </div>

            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarDays size={15} />
              Academic Year 2026–27
            </span>
          </div>

          {/* Search and Filters */}
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
                placeholder="Search student, ID or email..."
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
                {[
                  "Application Submitted",
                  "Under Review",
                  "Documents Verified",
                  "Fee Pending",
                  "Admitted",
                  "Rejected",
                  "On Hold",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
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
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 font-semibold">Student Details</th>
                <th className="px-5 py-4 font-semibold">Application ID</th>
                <th className="px-5 py-4 font-semibold">Course</th>
                <th className="px-5 py-4 font-semibold">Applied Date</th>
                <th className="px-5 py-4 font-semibold">Admission Status</th>
                <th className="px-5 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleStudents.map((student) => (
                <tr
                  key={student.id}
                  className="transition hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${student.color}`}>
                        {student.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#172951]">
                          {student.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold text-[#8E0018]">
                      {student.id}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      {student.course}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(student.date)}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[student.status]}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {student.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#172951] transition hover:border-[#8E0018] hover:bg-[#8E0018] hover:text-white"
                    >
                      <Eye size={15} />
                      Track
                    </button>
                  </td>
                </tr>
              ))}

              {visibleStudents.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Search size={24} />
                    </div>
                    <p className="mt-3 font-semibold text-slate-700">
                      No student records found
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
            {filteredStudents.length
              ? (currentPage - 1) * itemsPerPage + 1
              : 0}
            {" "}to{" "}
            {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
            {" "}of {filteredStudents.length} students
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

      {/* Admission Tracking Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#172951] to-[#304C7C] p-5 text-white">
              <div>
                <p className="text-xs text-blue-100">
                  ADMISSION TRACKING
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {selectedStudent.name}
                </h3>
                <p className="mt-1 text-xs text-blue-100">
                  {selectedStudent.id}
                </p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5">

              {/* Student Information */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${selectedStudent.color}`}>
                    {selectedStudent.initials}
                  </div>
                  <div>
                    <p className="font-bold text-[#172951]">
                      {selectedStudent.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedStudent.course} · {selectedStudent.category}
                    </p>
                  </div>
                </div>

                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[selectedStudent.status]}`}>
                  {selectedStudent.status}
                </span>
              </div>

              {/* Details */}
              <div>
                <h4 className="mb-3 font-bold text-[#172951]">
                  Student Information
                </h4>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Info icon={Mail} label="Email Address" value={selectedStudent.email} />
                  <Info icon={Phone} label="Phone Number" value={selectedStudent.phone} />
                  <Info icon={MapPin} label="City" value={selectedStudent.city} />
                  <Info icon={GraduationCap} label="Applied Course" value={selectedStudent.course} />
                  <Info icon={CalendarDays} label="Applied Date" value={formatDate(selectedStudent.date)} />
                  <Info icon={CheckCircle} label="HSC Percentage" value={selectedStudent.percentage} />
                </div>
              </div>

              {/* Admission Timeline */}
              <div>
                <div className="mb-4">
                  <h4 className="font-bold text-[#172951]">
                    Admission Journey
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Current progress through the admission process.
                  </p>
                </div>

                {selectedStudent.status === "Rejected" ||
                selectedStudent.status === "On Hold" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle size={19} />
                      <p className="text-sm font-bold">
                        {selectedStudent.status}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-amber-700/80">
                      This application is currently outside the standard
                      admission workflow.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {workflow.map((stage, index) => {
                      const currentIndex = workflow.indexOf(
                        selectedStudent.status
                      );
                      const completed = index <= currentIndex;
                      const active = index === currentIndex;

                      const StageIcon = [
                        ClipboardCheck,
                        Clock,
                        FileCheck,
                        Wallet,
                        ShieldCheck,
                      ][index];

                      return (
                        <div key={stage} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                completed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {completed ? (
                                <CheckCircle size={18} />
                              ) : (
                                <StageIcon size={18} />
                              )}
                            </div>

                            {index !== workflow.length - 1 && (
                              <div
                                className={`h-9 w-0.5 ${
                                  completed
                                    ? "bg-emerald-300"
                                    : "bg-slate-200"
                                }`}
                              />
                            )}
                          </div>

                          <div className="pb-6 pt-1">
                            <p
                              className={`text-sm font-semibold ${
                                completed
                                  ? "text-[#172951]"
                                  : "text-slate-400"
                              }`}
                            >
                              {stage}
                              {active && (
                                <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                                  CURRENT
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {completed
                                ? "Stage completed or currently in progress"
                                : "Waiting for previous stage"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Update Status */}
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw size={18} className="text-[#8E0018]" />
                  <h4 className="font-bold text-[#172951]">
                    Update Admission Status
                  </h4>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Select the latest status for this student.
                </p>

                <select
                  value={selectedStudent.status}
                  onChange={(e) =>
                    updateStatus(selectedStudent.id, e.target.value)
                  }
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#8E0018] focus:ring-2 focus:ring-[#8E0018]/10"
                >
                  {[
                    "Application Submitted",
                    "Under Review",
                    "Documents Verified",
                    "Fee Pending",
                    "Admitted",
                    "Rejected",
                    "On Hold",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-xl bg-[#172951] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8E0018]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
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

export default AdmissionStatus;
