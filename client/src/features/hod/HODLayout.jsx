import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  ClipboardCheck,
  FileBarChart,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import "./hod-premium.css";

const navigation = [
  {
    label: "Dashboard",
    path: "/hod/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Department Info",
    path: "/hod/department",
    icon: Building2,
  },
  {
    label: "Manage Teachers",
    path: "/hod/teachers",
    icon: Users,
  },
  {
    label: "Manage Students",
    path: "/hod/students",
    icon: GraduationCap,
  },
  {
    label: "Attendance",
    path: "/hod/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Department Reports",
    path: "/hod/reports",
    icon: FileBarChart,
  },
];

function HODLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const currentPage =
    navigation.find((item) => item.path === location.pathname)?.label ||
    "HOD Dashboard";

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="hod-app">
      {sidebarOpen && (
        <button
          type="button"
          className="hod-mobile-overlay"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}

      <aside className={`hod-sidebar ${sidebarOpen ? "hod-sidebar-open" : ""}`}>
        <div className="hod-brand">
          <div className="hod-brand-logo">
            <img src="/aisc-logo.png" alt="Abeda Inamdar Senior College" />
          </div>

          <div className="hod-brand-text">
            <h2>Abeda Inamdar</h2>
            <p>Senior College</p>
            <span>COLLEGE MANAGEMENT</span>
          </div>

          <button
            type="button"
            className="hod-mobile-close"
            aria-label="Close sidebar"
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
        </div>

        <div className="hod-sidebar-section">
          <span className="hod-sidebar-heading">MAIN MENU</span>

          <nav className="hod-navigation">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `hod-nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={19} strokeWidth={1.9} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="hod-sidebar-footer">
          <div className="hod-sidebar-role">
            <div className="hod-role-icon">
              <UserCircle size={20} />
            </div>
            <div>
              <strong>HOD Portal</strong>
              <span>Department Access</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="hod-main">
        <header className="hod-topbar">
          <div className="hod-topbar-left">
            <button
              type="button"
              className="hod-menu-toggle"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="hod-page-heading">
              <span>ABEDA INAMDAR SENIOR COLLEGE</span>
              <h1>{currentPage}</h1>
            </div>
          </div>

          <div className="hod-topbar-right">
            <button
              type="button"
              className="hod-notification-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={20} />
              <span className="hod-notification-dot" />
            </button>

            <div className="hod-profile-wrapper">
              <button
                type="button"
                className="hod-profile-button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
              >
                <div className="hod-profile-avatar">HOD</div>

                <div className="hod-profile-info">
                  <strong>Head of Department</strong>
                  <span>Department Admin</span>
                </div>

                <ChevronDown
                  size={16}
                  className={profileOpen ? "hod-chevron-open" : ""}
                />
              </button>

              {profileOpen && (
                <>
                  <button
                    type="button"
                    className="hod-dropdown-dismiss"
                    aria-label="Close profile menu"
                    onClick={() => setProfileOpen(false)}
                  />

                  <div className="hod-profile-dropdown">
                    <div className="hod-dropdown-heading">
                      <div className="hod-profile-avatar">HOD</div>
                      <div>
                        <strong>Head of Department</strong>
                        <span>Department Admin</span>
                      </div>
                    </div>

                    <div className="hod-dropdown-divider" />

                    <button
                      type="button"
                      onClick={() => setProfileOpen(false)}
                    >
                      <UserCircle size={17} />
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings size={17} />
                      Settings
                    </button>

                    <div className="hod-dropdown-divider" />

                    <button
                      type="button"
                      className="hod-logout-option"
                      onClick={() => setProfileOpen(false)}
                    >
                      <LogOut size={17} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="hod-content">
          <Outlet />
        </main>

        <footer className="hod-footer">
          <span>
            © {new Date().getFullYear()} Abeda Inamdar Senior College
          </span>
          <span>College Management Portal</span>
        </footer>
      </div>
    </div>
  );
}

export default HODLayout;