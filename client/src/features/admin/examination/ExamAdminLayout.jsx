import "../../../assets/styles/aisc-superadmin-reference.css";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  BookOpen,
  Ticket,
  ChartNoAxesCombined,
} from "lucide-react";

import SuperAdmin_Sidebar from "../super/SuperAdmin_Sidebar";
import SuperAdmin_Topbar from "../super/SuperAdmin_Topbar";
import { useAuth } from "../../../hooks/useAuth";

const BASE_PATH = "/exam-admin";

const EXAM_MENU = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "sessions",
    label: "Exam Sessions",
    icon: CalendarDays,
    path: "/sessions",
  },
  {
    id: "timetables",
    label: "Exam Timetables",
    icon: CalendarClock,
    path: "/timetables",
  },
  {
    id: "subjects",
    label: "Subjects & Exam Forms",
    icon: BookOpen,
    path: "/subjects",
  },
  {
    id: "hall-tickets",
    label: "Hall Tickets",
    icon: Ticket,
    path: "/hall-tickets",
  },
  {
    id: "marks",
    label: "Marks & Results",
    icon: ChartNoAxesCombined,
    path: "/marks",
  },
];

const PAGE_TITLES = {
  dashboard: "Examination Dashboard",
  sessions: "Exam Sessions",
  timetables: "Exam Timetables",
  subjects: "Subjects & Exam Forms",
  "hall-tickets": "Hall Tickets",
  marks: "Marks & Results",
};

export default function ExamAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const activeItem =
    location.pathname.replace(`${BASE_PATH}/`, "") || "dashboard";

  const currentPage = PAGE_TITLES[activeItem] || "Examination";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef]">
      <SuperAdmin_Sidebar
        activeItem={activeItem}
        menuItems={EXAM_MENU}
        onNavigate={(item) =>
          navigate(`${BASE_PATH}${item.path}`)
        }
        onLogout={handleLogout}
      />

      <SuperAdmin_Topbar
        titleOverride={currentPage}
        roleName="Examination Admin"
        roleInitials="EA"
      />

      <main className="min-h-screen pt-24 lg:pl-64">
        <div className="aisc-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}