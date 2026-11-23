import { useNavigate } from "react-router-dom";
import { useApiData } from "../../../hooks/useApiData";
import { fetchContentStats } from "../../../services/websiteApi";

import {
  FileText,
  GraduationCap,
  Megaphone,
  Images,
  ArrowUpRight,
  ArrowRight,
  Pencil,
  CalendarDays,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import campusImage from "../../../assets/images/college-campus-reference.jpg";

function WebsiteAdminDashboard() {
  const navigate = useNavigate();
  const { data: contentStats } = useApiData(() => fetchContentStats());
  // Live counts from the database; a dash until they arrive (or if they cannot be loaded).
  const countOf = (...types) =>
    contentStats
      ? String(types.reduce((n, [type, field]) => n + (contentStats.byType?.[type]?.[field] ?? 0), 0))
      : "—";

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      title: "Website Pages",
      count: countOf(["page", "published"]),
      description: "Pages published",
      icon: FileText,
      color: "text-[#A00018]",
      bg: "bg-[#A00018]/10",
      border: "border-t-[#A00018]",
      path: "/website-admin/content",
    },
    {
      title: "Departments",
      count: countOf(["department", "total"], ["course", "total"]),
      description: "Departments & courses",
      icon: GraduationCap,
      color: "text-[#142B50]",
      bg: "bg-[#142B50]/10",
      border: "border-t-[#142B50]",
      path: "/website-admin/departments",
    },
    {
      title: "Notices",
      count: countOf(["notice", "total"]),
      description: "Announcements",
      icon: Megaphone,
      color: "text-[#B8860B]",
      bg: "bg-[#B8860B]/10",
      border: "border-t-[#B8860B]",
      path: "/website-admin/notices",
    },
    {
      title: "Gallery Items",
      count: countOf(["gallery", "total"], ["document", "total"]),
      description: "Photos & documents",
      icon: Images,
      color: "text-[#526A91]",
      bg: "bg-[#526A91]/10",
      border: "border-t-[#526A91]",
      path: "/website-admin/gallery",
    },
  ];

  const quickActions = [
    {
      title: "Add New Notice",
      description: "Publish a college announcement",
      icon: Megaphone,
      path: "/website-admin/notices",
    },
    {
      title: "Update Departments",
      description: "Manage courses and departments",
      icon: GraduationCap,
      path: "/website-admin/departments",
    },
    {
      title: "Manage Gallery",
      description: "Upload photos and documents",
      icon: Images,
      path: "/website-admin/gallery",
    },
    {
      title: "Edit Website Content",
      description: "Update pages and information",
      icon: Pencil,
      path: "/website-admin/content",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 pb-5">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#101D3A] via-[#172E55] to-[#8E0018] px-6 py-8 text-white shadow-xl md:px-9 md:py-10">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-white/10 px-3 py-1.5">
              <Sparkles size={14} className="text-[#FFD76A]" />
              <span className="text-xs font-semibold tracking-wide text-[#FFE8A3]">
                COLLEGE WEBSITE MANAGEMENT
              </span>
            </div>

            <p className="mb-2 text-sm font-medium text-white/70">
              Welcome back, Website Admin!
            </p>

            <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Manage Your College
              <span className="block text-[#FFD76A]">
                Website With Ease.
              </span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">
              Keep your college website updated with academic information,
              faculty details, gallery images and important announcements.
            </p>

            <button
              onClick={() => navigate("/website-admin/content")}
              className="mt-6 flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#172951] shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-[#F2D477]"
            >
              Manage Website
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="flex min-w-[190px] flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-[#FFE8A3]">
              <CalendarDays size={17} />
              <span className="text-xs font-semibold">TODAY'S DATE</span>
            </div>

            <p className="text-xl font-bold text-white">{today}</p>

            <div className="h-px bg-white/20" />

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34D399]" />
              <span className="text-sm font-medium text-white/90">
                Website is Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Heading */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#142B50]">
              Website Overview
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Your website statistics at a glance
            </p>
          </div>

          <span className="hidden rounded-full bg-[#A00018]/10 px-3 py-1.5 text-xs font-bold text-[#A00018] sm:block">
            ADMIN PANEL
          </span>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                onClick={() => navigate(item.path)}
                className={`group relative overflow-hidden rounded-2xl border border-gray-100 border-t-4 ${item.border} bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${item.bg} ${item.color}`}>
                    <Icon size={23} />
                  </div>

                  <ArrowUpRight
                    size={19}
                    className="text-gray-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#A00018]"
                  />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-gray-500">
                    {item.title}
                  </p>

                  <h3 className="mt-1 text-3xl font-extrabold text-[#142B50]">
                    {item.count}
                  </h3>

                  <p className={`mt-1 text-xs font-medium ${item.color}`}>
                    {item.description}
                  </p>
                </div>

                <div className="absolute -bottom-8 -right-5 h-24 w-24 rounded-full bg-gray-50/80 transition group-hover:scale-150" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Content */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* College Overview */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#142B50]">
                About Our College
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                College website information
              </p>
            </div>

            <div className="rounded-xl bg-[#A00018]/10 p-2.5 text-[#A00018]">
              <GraduationCap size={22} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
            {/* Campus Image */}
            <div className="group relative min-h-[250px] overflow-hidden rounded-2xl">
              <img
                src={campusImage}
                alt="Abeda Inamdar Senior College campus"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#101D3A]/90 via-[#101D3A]/10 to-transparent" />

              <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                M.C.E. Society's
              </div>

              <div className="absolute bottom-5 left-5 text-white">
                <p className="text-xs font-medium text-white/75">
                  EDUCATION • EXCELLENCE • FUTURE
                </p>

                <h3 className="mt-2 text-2xl font-extrabold leading-tight">
                  Abeda Inamdar
                  <span className="block text-[#FFD76A]">
                    Senior College
                  </span>
                </h3>
              </div>
            </div>

            {/* College Information */}
            <div className="flex flex-col justify-center">
              <span className="mb-3 flex w-fit items-center gap-2 rounded-full bg-[#D4AF37]/15 px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-[#997000]">
                <Sparkles size={13} />
                OUR COLLEGE
              </span>

              <h3 className="text-2xl font-extrabold leading-tight text-[#142B50]">
                Welcome to Abeda Inamdar Senior College
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-500">
                Manage and maintain your college website from one place.
                Keep students, faculty and visitors informed about the latest
                academic updates, events and announcements.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Academic information and updates
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Faculty and department details
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  Notices, events and gallery
                </div>
              </div>

              <button
                onClick={() => navigate("/website-admin/content")}
                className="mt-6 flex w-fit items-center gap-2 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-900/20 transition duration-300 hover:-translate-y-1 hover:bg-[#780013]"
              >
                Edit Website Content
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-[#142B50]">
                Quick Actions
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Frequently used options
              </p>
            </div>

            <div className="rounded-xl bg-[#D4AF37]/15 p-2.5 text-[#997000]">
              <Sparkles size={20} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-[#F8F9FC] p-3.5 text-left transition duration-300 hover:border-[#A00018]/20 hover:bg-[#A00018]/5 hover:shadow-sm"
                >
                  <div className="rounded-xl bg-white p-3 text-[#A00018] shadow-sm transition group-hover:bg-[#A00018] group-hover:text-white">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#142B50]">
                      {action.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {action.description}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#A00018]"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default WebsiteAdminDashboard;