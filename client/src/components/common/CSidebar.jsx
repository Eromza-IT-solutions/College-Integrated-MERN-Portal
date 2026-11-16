
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/images/image.png";
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  Users,
  Images,
  Megaphone,
  LogOut,
} from "lucide-react";

function CSidebar() {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/website-admin/dashboard",
      icon: LayoutDashboard,
      end: true,
    },
    {
      name: "Manage Content",
      path: "/website-admin/content",
      icon: FileText,
    },
    {
      name: "Departments & Courses",
      path: "/website-admin/departments",
      icon: GraduationCap,
    },
    {
      name: "Faculty Profiles",
      path: "/website-admin/faculty",
      icon: Users,
    },
    {
      name: "Gallery & Documents",
      path: "/website-admin/gallery",
      icon: Images,
    },
    {
      name: "Notices & Announcements",
      path: "/website-admin/notices",
      icon: Megaphone,
    },
  ];

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col overflow-hidden bg-gradient-to-b from-[#172951] via-[#14264A] to-[#101B38] text-white shadow-xl">

      {/* College Branding */}
      <div className="flex shrink-0 flex-col items-center border-b border-white/10 px-4 pb-5 pt-5">

        <img
                    src={logo}
                    alt="college logo"
                    className="h-15 w-15 rounded-full border border-gray-200 object-cover"
                  />

        <h2 className="text-center font-serif text-[18px] font-bold leading-tight text-white">
          Abeda Inamdar
          <span className="mt-0.5 block text-[#FFD43B]">
            Senior College
          </span>
        </h2>

        <div className="mt-4 h-px w-full bg-white/10" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-white text-[#8E0018] shadow-md shadow-black/10"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? "text-[#8E0018]"
                        : "text-slate-300 group-hover:text-[#FFD43B]"
                    }`}
                  />

                  <span className="leading-5">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition-all duration-300 hover:bg-red-500/15 hover:text-white"
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
}

export default CSidebar;
