import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import TeacherSidebar, { TEACHER_MENU } from "./TeacherSidebar";
import TeacherTopbar from "./TeacherTopbar";
import { useAuth } from "../../hooks/useAuth";
const DEFAULT_TEACHER = { name: "Teacher Name", role: "Teacher" };
const TEACHER_SEARCH_ITEMS = TEACHER_MENU.flatMap((item) =>
  item.children
    ? item.children.map((child) => ({
        key: child.to,
        label: child.label,
        group: item.label,
      }))
    : [{ key: item.to, label: item.label }]
);

const TEACHER_PAGES = TEACHER_MENU.flatMap((item) =>
  item.children
    ? item.children.map((child) => ({
        ...child,
        group: item.label,
      }))
    : [{ ...item, group: null }]
);

/**
 * Layout for every /teacher/* page: sidebar + topbar + scrolling content.
 *
 *   <Route path="/teacher" element={<TeacherLayout teacher={user} onLogout={logout} />}>
 *     <Route index element={<TeacherDashboard />} />
 *     <Route path="timetable" element={<TeacherTimetable />} />
 *     ...
 *   </Route>
 */
// export default function TeacherLayout({ teacher = DEFAULT_TEACHER, notifications = [], onLogout }) {
export default function TeacherLayout({ teacher = DEFAULT_TEACHER, notifications = [] }) {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const { pathname } = useLocation();
  const currentPage = TEACHER_PAGES.find((page) => page.to === pathname);
const title = currentPage?.label ?? "Dashboard";
const parent = currentPage?.group;
  const [menuOpen, setMenuOpen] = useState(false);
  const content = useRef(null);

const logout = async () => {
  await authLogout();
  navigate("/login", { replace: true });
};

  // close the mobile drawer and scroll to the top whenever the page changes
  useEffect(() => {
    setMenuOpen(false);
    content.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Escape closes the drawer; lock page scroll while it is open
  useEffect(() => {
    if (!menuOpen) return;
    const key = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="tl">
      <style>{css}</style>
      <a className="tl-skip" href="#teacher-main">Skip to content</a>

      <TeacherSidebar open={menuOpen} onClose={() => setMenuOpen(false)} onLogout={logout} />
      {menuOpen && <div className="tl-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="tl-main">
        <TeacherTopbar
  title={title}
  parent={parent}
  teacher={{
    name: teacher?.name ?? "Teacher Name",
    subtitle: teacher?.subtitle ?? teacher?.department ?? "Teacher",
  }}
  notifications={notifications}
  searchItems={TEACHER_SEARCH_ITEMS}
  onMenuClick={() => setMenuOpen(true)}
  onViewNotices={() => navigate("/teacher/notices")}
  onLogout={logout}
  onNavigate={(path) => navigate(path)}
/>
        <main id="teacher-main" className="tl-content" ref={content} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');
.tl{display:flex;height:100vh;overflow:hidden;background:#f6f7fc;font-family:'Poppins',system-ui,sans-serif;color:#1b2250}
.tl *{box-sizing:border-box}
.tl-main{flex:1;min-width:0;display:flex;flex-direction:column}
.tl-content{flex:1;overflow-y:auto;outline:0;scroll-behavior:smooth}
.tl-overlay{position:fixed;inset:0;z-index:35;background:rgba(8,15,51,.55);backdrop-filter:blur(2px);animation:tlfade .2s ease}
@keyframes tlfade{from{opacity:0}to{opacity:1}}
.tl-skip{position:absolute;left:12px;top:-60px;z-index:100;padding:10px 16px;border-radius:10px;background:#e3b82b;color:#0f1d57;font-weight:600;text-decoration:none;transition:top .15s}
.tl-skip:focus{top:12px}
@media(prefers-reduced-motion:reduce){.tl-content{scroll-behavior:auto}.tl-overlay{animation:none}}
`;
