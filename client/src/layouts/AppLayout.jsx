import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/common/Header";
import Sidebar from "../components/common/Sidebar";
import { navigationByRole } from "../config/navigation";
import { useAuth } from "../hooks/useAuth";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const navItems = navigationByRole[user?.role] ?? [];
  const contentOffset = collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-eromza-bg">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-eromza-sidebar px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((current) => !current)}
        navItems={navItems}
      />

      <div className={`min-h-screen transition-[padding] duration-200 ${contentOffset}`}>
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          navItems={navItems}
        />

        <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
