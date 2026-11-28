import SuperAdmin_Sidebar from "./SuperAdmin_Sidebar";
import SuperAdmin_Topbar from "./SuperAdmin_Topbar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const BASE_PATH = "/super-admin";

const ACTIVE_ITEM_BY_PATH = {
  "/dashboard": "dashboard",
  "/users": "users",
  "/admin-panels": "admins",
  "/settings": "settings",
  "/reports": "reports",
  "/audit-logs": "audit",
  "/academic-data": "academic",
  "/refunds": "refunds",
  "/timetable": "timetable",
};

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const relativePath = location.pathname.replace(BASE_PATH, "");
  const activeItem = ACTIVE_ITEM_BY_PATH[relativePath] ?? "dashboard";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen">
    <SuperAdmin_Sidebar
  activeItem={activeItem}
  onNavigate={(item) => navigate(`${BASE_PATH}${item.path}`)}
  onLogout={handleLogout}
/>

<SuperAdmin_Topbar />

<div className="lg:pl-64 pt-24">
  <Outlet />
</div>
    </div>
  );
}
