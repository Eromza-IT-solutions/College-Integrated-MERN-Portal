import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  BookOpenCheck,
  TicketCheck,
  ClipboardList,
  Menu,
  X,
  Bell,
  ChevronRight,
  GraduationCap,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const collegeLogo =
  "/aisc-logo.png";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        path: "/exam-admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "EXAMINATION MANAGEMENT",
    items: [
      {
        name: "Exam Sessions",
        path: "/exam-admin/sessions",
        icon: CalendarDays,
      },
      {
        name: "Exam Timetables",
        path: "/exam-admin/timetables",
        icon: CalendarClock,
      },
      {
        name: "Subjects & Forms",
        path: "/exam-admin/subjects",
        icon: BookOpenCheck,
      },
      {
        name: "Hall Tickets",
        path: "/exam-admin/hall-tickets",
        icon: TicketCheck,
      },
      {
        name: "Marks & Results",
        path: "/exam-admin/results",
        icon: ClipboardList,
      },
    ],
  },
];

const pageNames = {
  "/exam-admin/dashboard": "Dashboard",
  "/exam-admin/sessions": "Exam Sessions",
  "/exam-admin/timetables": "Exam Timetables",
  "/exam-admin/subjects": "Subjects & Forms",
  "/exam-admin/hall-tickets": "Hall Tickets",
  "/exam-admin/results": "Marks & Results",
};

export default function ExamAdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentPage =
    pageNames[location.pathname] || "Examination Administration";

  return (
    <div className="min-h-screen bg-[#DBE9F5]/50 text-slate-800">
      <style>{`
        @keyframes aiscFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes aiscGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(242,194,0,0); }
          50% { box-shadow: 0 0 18px 2px rgba(242,194,0,.12); }
        }

        .aisc-page-enter {
          animation: aiscFadeIn .45s ease-out both;
        }

        .aisc-nav-link {
          position: relative;
          overflow: hidden;
        }

        .aisc-nav-link::before {
          content: "";
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 3px;
          border-radius: 0 5px 5px 0;
          background: #F2C200;
          transform: scaleY(0);
          transition: transform .25s ease;
        }

        .aisc-nav-link.active::before {
          transform: scaleY(1);
        }

        .aisc-logo {
          transition: transform .35s ease;
        }

        .aisc-logo:hover {
          transform: rotate(-4deg) scale(1.04);
        }

        @media (prefers-reduced-motion: reduce) {
          .aisc-page-enter { animation: none; }
          .aisc-logo { transition: none; }
        }
      `}</style>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-[#0B1730]/65 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col overflow-hidden bg-[#14264B] text-white shadow-[12px_0_45px_rgba(15,35,70,0.13)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Decorative background */}
        <div className="pointer-events-none absolute -right-24 top-32 h-64 w-64 rounded-full bg-[#A8212F]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#F2C200]/10 blur-3xl" />

        {/* College identity */}
        <div className="relative flex min-h-[112px] items-center gap-3 border-b border-white/10 px-5 py-5">
         <div
  className="aisc-logo relative flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-2xl border border-[#F2C200]/50 bg-white p-1.5 shadow-lg shadow-black/20"
>
  <img
    src={collegeLogo}
    alt="Abeda Inamdar Senior College Logo"
    style={{
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "contain",
      opacity: 1,
      visibility: "visible",
    }}
  />
</div>

          <div className="min-w-0 flex-1">
            <h1 className="max-w-[155px] text-[14px] font-extrabold leading-[1.45] tracking-wide text-white">
              Abeda Inamdar
              <span className="block">Senior College</span>
            </h1>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F2C200]" />
              <p className="text-[9px] font-bold tracking-[1.6px] text-[#E8D49A]">
                AUTONOMOUS · PUNE
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Portal identity */}
        <div className="relative mx-4 mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-inner">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[#F2C200]/10 blur-2xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F2C200] to-[#C69B16] text-[#14264B] shadow-lg shadow-[#F2C200]/10">
              <GraduationCap size={23} />
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-bold tracking-wide text-white">
                Examination Cell
              </p>
              <p className="mt-1 text-[10px] font-medium text-blue-100/65">
                Administration Portal
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
            <ShieldCheck size={13} className="text-[#F2C200]" />
            <span className="text-[9px] font-semibold tracking-wider text-blue-100/70">
              SECURE ADMINISTRATION
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative mt-7 flex-1 space-y-7 overflow-y-auto px-4 pb-6 [scrollbar-color:rgba(255,255,255,.2)_transparent] [scrollbar-width:thin]">
          {navigation.map((group) => (
            <div key={group.title}>
              <div className="mb-3 flex items-center gap-2 px-3">
                <span className="h-px w-3 bg-[#F2C200]/70" />
                <p className="text-[9px] font-extrabold tracking-[1.7px] text-blue-100/55">
                  {group.title}
                </p>
              </div>

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `aisc-nav-link group flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-[12px] font-semibold transition-all duration-200 ${
                          isActive
                            ? "active bg-gradient-to-r from-white to-[#F8F3E8] text-[#14264B] shadow-lg shadow-black/10"
                            : "text-blue-100/75 hover:translate-x-1 hover:bg-white/[0.08] hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                              isActive
                                ? "bg-[#F2C200]/20 text-[#A8212F]"
                                : "bg-white/[0.06] text-blue-100/70 group-hover:bg-white/10 group-hover:text-[#F2C200]"
                            }`}
                          >
                            <Icon size={17} strokeWidth={2.1} />
                          </span>

                          <span className="min-w-0 flex-1">
                            {item.name}
                          </span>

                          {isActive && (
                            <ChevronRight
                              size={16}
                              className="shrink-0 text-[#A8212F]"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="relative border-t border-white/10 bg-black/[0.08] p-4">
          <a
            href="https://www.abedainamdarcollege.org.in/"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[11px] font-semibold text-blue-100/80 transition hover:border-[#F2C200]/30 hover:bg-white/[0.09] hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <ExternalLink size={15} className="text-[#F2C200]" />
              College Website
            </span>
            <ChevronRight
              size={15}
              className="transition group-hover:translate-x-1"
            />
          </a>

          <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-[9px] font-medium tracking-wide text-blue-100/40">
              AISC · EXAMINATION CELL
            </p>
            <Sparkles size={12} className="text-[#F2C200]/60" />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-screen min-w-0 lg:pl-[278px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-[#14264B]/[0.07] bg-white/90 px-4 shadow-[0_4px_25px_rgba(20,38,75,0.04)] backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#14264B]/10 bg-[#DBE9F5]/50 text-[#14264B] transition hover:border-[#F2C200] hover:bg-[#F2C200]/15 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <p className="hidden text-[9px] font-bold uppercase tracking-[2px] text-[#A8212F] sm:block">
                Abeda Inamdar Senior College
              </p>

              <h2 className="truncate text-[15px] font-extrabold tracking-tight text-[#14264B] sm:mt-1 sm:text-[19px]">
                {currentPage}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
            <div className="hidden text-right md:block">
              <p className="text-[11px] font-bold text-[#14264B]">
                Examination Admin
              </p>
              <p className="mt-1 text-[9px] font-medium text-slate-400">
                College Administration
              </p>
            </div>

            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#14264B]/10 bg-[#DBE9F5]/45 text-[#14264B] transition hover:border-[#F2C200]/60 hover:bg-[#F2C200]/10">
              <Bell size={18} />
              <span className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full border-2 border-white bg-[#A8212F]" />
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F2C200]/50 bg-gradient-to-br from-[#FBF6EE] to-[#F2E7CE] text-sm font-extrabold text-[#14264B] shadow-sm">
              A
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto min-h-[calc(100vh-145px)] w-full max-w-[1700px] px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 sm:text-[11px]">
              <span className="transition hover:text-[#14264B]">
                College Portal
              </span>
              <ChevronRight size={13} />
              <span className="text-[#A8212F]">Examination</span>
              <ChevronRight size={13} />
              <span className="font-bold text-[#14264B]">{currentPage}</span>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-[#14264B]/10 bg-white/75 px-3 py-1.5 shadow-sm sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold tracking-wide text-slate-500">
                ADMIN PORTAL
              </span>
            </div>
          </div>

          <div key={location.pathname} className="aisc-page-enter">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-[#14264B]/[0.07] bg-white/80 px-5 py-4 text-center sm:flex-row sm:px-9 sm:text-left">
          <p className="text-[10px] font-medium text-slate-400">
            © {new Date().getFullYear()} Abeda Inamdar Senior College. All rights reserved.
          </p>
          <p className="text-[9px] font-semibold tracking-wide text-[#14264B]/45">
            EXAMINATION ADMINISTRATION PORTAL
          </p>
        </footer>
      </div>
    </div>
  );
}