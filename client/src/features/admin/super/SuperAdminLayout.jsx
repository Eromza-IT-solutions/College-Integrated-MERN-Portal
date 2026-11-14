import SuperAdmin_Sidebar from "./SuperAdmin_Sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const ACTIVE_ITEM_BY_PATH = {
  "/dashboard": "dashboard",
  "/users": "users",
  "/admin-panels": "admins",
  "/settings": "settings",
  "/reports": "reports",
  "/audit-logs": "audit",
};

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = ACTIVE_ITEM_BY_PATH[location.pathname] ?? "dashboard";

  return (
    <div className="min-h-screen">
      <SuperAdmin_Sidebar
        activeItem={activeItem}
        onNavigate={(item) => navigate(item.path)}
      />

      <div className="lg:pl-64">
        <Outlet />
      </div>
    </div>
  );
}