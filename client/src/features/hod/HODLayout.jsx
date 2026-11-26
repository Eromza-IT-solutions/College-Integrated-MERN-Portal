import "../../assets/styles/aisc-superadmin-reference.css";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardCheck,
  ChartNoAxesCombined,
  Building2,
} from "lucide-react";

import SuperAdmin_Sidebar from "../admin/super/SuperAdmin_Sidebar";
import SuperAdmin_Topbar from "../admin/super/SuperAdmin_Topbar";
import { useAuth } from "../../hooks/useAuth";

/* Check that BASE_PATH and each path match your routes file */
const BASE_PATH = "/hod";

const HOD_MENU = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "students",
    label: "Manage Students",
    icon: Users,
    path: "/students",
  },
  {
    id: "teachers",
    label: "Manage Teachers",
    icon: GraduationCap,
    path: "/teachers",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    path: "/attendance",
  },
  {
    id: "marks",
    label: "Marks Approval",
    icon: ClipboardCheck,
    path: "/marks",
  },
  {
    id: "reports",
    label: "Department Reports",
    icon: ChartNoAxesCombined,
    path: "/reports",
  },
  {
    id: "department",
    label: "Department Info",
    icon: Building2,
    path: "/department",
  },
];

const PAGE_TITLES = {
  dashboard: "HOD Dashboard",
  students: "Manage Students",
  teachers: "Manage Teachers",
  attendance: "Attendance",
  marks: "Marks Approval",
  reports: "Department Reports",
  department: "Department Info",
};

export default function HODLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const activeItem =
    location.pathname.replace(BASE_PATH, "").split("/")[1] || "dashboard";

  const currentPage = PAGE_TITLES[activeItem] || "Department";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f7f3ef]">
      <SuperAdmin_Sidebar
        activeItem={activeItem}
        menuItems={HOD_MENU}
        onNavigate={(item) =>
          navigate(`${BASE_PATH}${item.path}`)
        }
        onLogout={handleLogout}
      />

      <SuperAdmin_Topbar
        titleOverride={currentPage}
        roleName="Head of Department"
        roleInitials="HD"
      />

      <main className="min-h-screen pt-24 lg:pl-64">
        <div className="aisc-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
