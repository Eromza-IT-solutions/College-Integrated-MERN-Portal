import { useState } from "react";
import {
  LayoutDashboard,
  User,
  ClipboardCheck,
  FilePenLine,
  GraduationCap,
  CalendarClock,
  Ticket,
  Award,
  Wallet,
  Megaphone,
  ChevronDown,
  LogOut,
} from "lucide-react";

/*
  Setup:
    npm i lucide-react
  Add to index.html <head> (or index.css):
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
*/

// Items with a single entry are plain links; items with several `children` expand.
export const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User }, // "My Profile"
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  {
    id: "admission",
    label: "Admission",
    icon: FilePenLine,
    children: [
      "Fill Form",
      "Update Form",
      "Print Form",
      "Download Form",
      "Form Submission Dates",
      "View Fee Details",
      "My Admission Info",
    ],
  },
  {
    id: "examinations",
    label: "Examinations",
    icon: GraduationCap,
    children: [
      "Dashboard",
      "Examination Form",
      "Form Fee Payment",
      "ABC ID",
      "Upload Student Photo",
      "Revaluation Form",
    ],
  },
  { id: "timetable", label: "Timetable", icon: CalendarClock },
  { id: "hall-tickets", label: "Hall Tickets", icon: Ticket },
  { id: "results", label: "Results", icon: Award },
  {
    id: "payments",
    label: "Payments & Brochures",
    icon: Wallet,
    children: [
      "View Brochure Codes",
      "Pay Admission Fee",
      "Pay Pending Fee",
      "Pay Miscellaneous Fee",
      "Download Payment Receipts",
      "Download College Receipts",
    ],
  },
  { id: "notices", label: "Notices", icon: Megaphone },
];

export const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Sidebar({
  logo = "/logo.png",
  collegeName = "Abeda Inamdar",
  collegeSub = "Senior College",
  activePage = "dashboard",
  onNavigate = () => {},
  onLogout = () => {},
}) {
  const [openId, setOpenId] = useState(null);
  const active = activePage;

  const select = (key) => {
  onNavigate(key);
};
  const toggleGroup = (id) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#16285a] to-[#0b1536] text-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Logo + college name */}
      <div className="flex flex-col items-center px-4 pb-5 pt-6">
       <div className="h-[120px] w-[120px] overflow-hidden bg-transparent">
          <img src={logo} alt="College logo" className="h-full w-full object-contain" />
        </div>
        <h1
          className="mt-4 text-center text-[22px] font-bold leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {collegeName}
        </h1>
        <h2
          className="text-center text-[22px] font-bold leading-tight text-[#f5b800]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {collegeSub}
        </h2>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      {/* Menu */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2.5 pb-3">
        <ul className="space-y-1.5">
          {menuItems.map(({ id, label, icon: Icon, children }) => {
            /* ---------- Plain link ---------- */
            if (!children) {
              const isActive = active === id;
              return (
                <li key={id} className="relative">
                  {isActive && (
                    <span className="absolute -left-2.5 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r bg-[#f5b800]" />
                  )}
                  <button
                    onClick={() => {
                      setOpenId(null);
                      select(id);
                    }}
                    className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-[15px] font-medium transition-colors duration-200 ${
                      isActive
                        ? "bg-white text-[#8b0f1f] shadow-md"
                        : "text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.8} className="shrink-0" />
                    <span>{label}</span>
                  </button>
                </li>
              );
            }

            /* ---------- Expandable group ---------- */
            const isOpen = openId === id;
            const hasActiveChild = active.startsWith(id + "/");
            return (
              <li key={id} className="relative">
                {hasActiveChild && !isOpen && (
                  <span className="absolute -left-2.5 top-[22px] h-8 w-1.5 -translate-y-1/2 rounded-r bg-[#f5b800]" />
                )}
                <button
                  onClick={() => toggleGroup(id)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-[15px] font-medium transition-colors duration-200 ${
                    isOpen ? "bg-white/10" : "hover:bg-white/10"
                  } ${hasActiveChild ? "text-[#f5b800]" : "text-slate-200"}`}
                >
                  <Icon size={20} strokeWidth={1.8} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* animated submenu */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <ul className="ml-[30px] overflow-hidden border-l border-white/15">
                    <li className="h-1.5" />
                    {children.map((child) => {
                      const key = `${id}/${slug(child)}`;
                      const isChildActive = active === key;
                      return (
                        <li key={key}>
                          <button
                            onClick={() => select(key)}
                            tabIndex={isOpen ? 0 : -1}
                            className={`my-0.5 flex w-full items-center rounded-lg py-2 pl-4 pr-3 text-left text-[13.5px] transition-colors duration-200 ${
                              isChildActive
                                ? "ml-2 w-[calc(100%-0.5rem)] bg-white font-semibold text-[#8b0f1f]"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {child}
                          </button>
                        </li>
                      );
                    })}
                    <li className="h-1.5" />
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 px-2.5 py-4">
        <button
          onClick={onLogout}
         className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium text-slate-200 transition-colors hover:bg-red-600 hover:text-white"
        >
          <LogOut size={20} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}