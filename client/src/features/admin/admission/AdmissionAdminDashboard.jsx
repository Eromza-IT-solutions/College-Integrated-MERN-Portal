
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Wallet,
  ArrowRight,
  CalendarDays,
  Eye,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";

const stats = [
  {
    title: "Total Applications",
    value: "1,248",
    change: "+12.5%",
    description: "Compared to last month",
    icon: Users,
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "Pending Applications",
    value: "286",
    change: "Needs attention",
    description: "Applications awaiting review",
    icon: Clock,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Approved Applications",
    value: "784",
    change: "+8.2%",
    description: "Successfully approved",
    icon: CheckCircle,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Rejected Applications",
    value: "178",
    change: "14.2% of total",
    description: "Applications rejected",
    icon: XCircle,
    color: "bg-red-50 text-red-600",
  },
];

const quickActions = [
  {
    title: "Manage Applications",
    description: "View and review student applications",
    icon: FileText,
    color: "bg-purple-100 text-purple-700",
    link: "/admission-admin/applications",
  },
  {
    title: "Verify Documents",
    description: "Review submitted student documents",
    icon: Eye,
    color: "bg-blue-100 text-blue-700",
    link: "/admission-admin/documents",
  },
  {
    title: "Admission Status",
    description: "Track admission decisions",
    icon: GraduationCap,
    color: "bg-green-100 text-green-700",
    link: "/admission-admin/status",
  },
  {
    title: "Fees & Payments",
    description: "Check student fee payments",
    icon: Wallet,
    color: "bg-orange-100 text-orange-700",
    link: "/admission-admin/fees",
  },
];

const applicationStatus = [
  {
    label: "Approved",
    value: "784",
    percent: "62.8%",
    color: "bg-green-500",
    textColor: "text-green-600",
    width: "62.8%",
    dot: "#16A36A",
  },
  {
    label: "Pending",
    value: "286",
    percent: "22.9%",
    color: "bg-amber-400",
    textColor: "text-amber-600",
    width: "22.9%",
    dot: "#F2B544",
  },
  {
    label: "Rejected",
    value: "178",
    percent: "14.3%",
    color: "bg-[#C9253D]",
    textColor: "text-[#C9253D]",
    width: "14.3%",
    dot: "#C9253D",
  },
];

function AdmissionAdminDashboard() {
  return (
    <div className="w-full space-y-6 pb-8">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#102D4F] via-[#183D63] to-[#54213B] p-6 text-white shadow-md md:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-white/70">
              ADMISSION ADMINISTRATION
            </p>

            <h1 className="text-2xl font-bold md:text-3xl">
              Welcome to Admission Dashboard!
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Manage student applications, verify documents, monitor admission
              status and track fee payments from one place.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/80">
              <span className="flex items-center gap-2">
                <CalendarDays size={15} />
                Academic Year 2026–27
              </span>

              <span className="rounded-full bg-white/15 px-3 py-1">
                Admission Portal Active
              </span>
            </div>
          </div>

          <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 md:flex">
            <GraduationCap size={65} strokeWidth={1.3} />
          </div>
        </div>

        <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
        <div className="absolute -bottom-28 right-36 h-52 w-52 rounded-full bg-white/5" />
      </section>

      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[#172B45]">
            Dashboard Overview
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Monitor your college admission activities.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
          <CalendarDays size={16} className="text-[#C9253D]" />
          Academic Year 2026–27
        </div>
      </div>

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-xl p-3 ${item.color}`}>
                  <Icon size={23} />
                </div>

                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-500">
                {item.title}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-bold text-[#172B45]">
                  {item.value}
                </h3>

                <span className="text-xs font-semibold text-green-600">
                  {item.change}
                </span>
              </div>

              <p className="mt-2 text-xs text-gray-400">
                {item.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Application Overview and Quick Actions */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* Attractive Application Overview */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#172B45]">
                Application Overview
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Current admission application status
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              Academic Year 2026–27
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 items-center gap-8 md:grid-cols-2">

            {/* Donut Chart */}
            <div className="flex flex-col items-center justify-center">

              <div className="group relative h-64 w-64">

                <svg
                  viewBox="0 0 220 220"
                  className="h-full w-full -rotate-90 drop-shadow-sm"
                >
                  <circle
                    cx="110"
                    cy="110"
                    r="82"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="25"
                  />

                  {/* Approved */}
                  <circle
                    cx="110"
                    cy="110"
                    r="82"
                    fill="none"
                    stroke="#16A36A"
                    strokeWidth="25"
                    strokeDasharray="323.8 515.2"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out hover:opacity-80"
                  />

                  {/* Pending */}
                  <circle
                    cx="110"
                    cy="110"
                    r="82"
                    fill="none"
                    stroke="#F2B544"
                    strokeWidth="25"
                    strokeDasharray="118.1 515.2"
                    strokeDashoffset="-332"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out hover:opacity-80"
                  />

                  {/* Rejected */}
                  <circle
                    cx="110"
                    cy="110"
                    r="82"
                    fill="none"
                    stroke="#C9253D"
                    strokeWidth="25"
                    strokeDasharray="73.7 515.2"
                    strokeDashoffset="-457"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out hover:opacity-80"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#17365D]">
                    <GraduationCap size={22} />
                  </div>

                  <h2 className="text-4xl font-extrabold tracking-tight text-[#172B45]">
                    1,248
                  </h2>

                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Total Applications
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1">
                    <CheckCircle size={12} className="text-green-600" />
                    <span className="text-[10px] font-bold text-green-700">
                      62.8% Approved
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <p className="text-xs font-medium text-gray-500">
                  Illustrative dashboard data
                </p>
              </div>
            </div>

            {/* Status Details */}
            <div className="space-y-6">

              <div>
                <h4 className="mb-1 text-sm font-bold text-[#172B45]">
                  Application Breakdown
                </h4>
                <p className="text-xs text-gray-400">
                  Status-wise application distribution
                </p>
              </div>

              {applicationStatus.map((item) => (
                <div key={item.label} className="group">

                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${item.color}`} />

                      <span className="text-sm font-semibold text-gray-600">
                        {item.label}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-[#172B45]">
                        {item.value}
                      </span>

                      <span className={`ml-2 text-xs font-semibold ${item.textColor}`}>
                        {item.percent}
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out group-hover:brightness-110`}
                      style={{ width: item.width }}
                    />
                  </div>

                </div>
              ))}

              {/* Summary Card */}
              <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">
                      Processing Progress
                    </p>

                    <h3 className="mt-1 text-2xl font-bold text-[#172B45]">
                      62.8%
                    </h3>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
                    <CheckCircle size={23} />
                  </div>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  784 applications have been approved successfully.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-bold text-[#172B45]">
              Quick Actions
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Frequently used admission options
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <a
                  key={action.title}
                  href={action.link}
                  className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-purple-200 hover:bg-purple-50/50"
                >
                  <div className={`rounded-lg p-3 ${action.color}`}>
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-[#172B45]">
                      {action.title}
                    </h4>

                    <p className="mt-1 text-xs text-gray-500">
                      {action.description}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#C9253D]"
                  />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Admission Fee Management Banner */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <Wallet size={24} />
          </div>

          <div>
            <h3 className="font-bold text-[#172B45]">
              Admission Fee Management
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Manage student payment records and pending admission fees.
            </p>
          </div>
        </div>

        <a
          href="/admission-admin/fees"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800"
        >
          Manage Payments <ArrowRight size={17} />
        </a>
      </section>

    </div>
  );
}

export default AdmissionAdminDashboard;
