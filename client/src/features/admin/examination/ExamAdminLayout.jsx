import "../../../assets/styles/aisc-superadmin-reference.css";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, CalendarClock, BookOpen, Ticket,
  ChartNoAxesCombined, Menu, X, ExternalLink, Bell
} from "lucide-react";
const logo = "/aisc-logo.png";

const navItems = [
  { label: "Dashboard", path: "/exam-admin/dashboard", icon: LayoutDashboard },
  { label: "Exam Sessions", path: "/exam-admin/sessions", icon: CalendarDays },
  { label: "Exam Timetables", path: "/exam-admin/timetables", icon: CalendarClock },
  { label: "Subjects & Forms", path: "/exam-admin/subjects", icon: BookOpen },
  { label: "Hall Tickets", path: "/exam-admin/hall-tickets", icon: Ticket },
  { label: "Marks & Results", path: "/exam-admin/marks", icon: ChartNoAxesCombined },
];

export default function ExamAdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPage = navItems.find((item) => item.path === location.pathname)?.label || "Examination";

  return (
    <div className="aisc-layout">
      <aside className={`aisc-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="aisc-brand">
          <div className="aisc-brand-logo"><img src={logo} alt="Abeda Inamdar Senior College emblem" /></div>
          <div>
            <div className="aisc-brand-name">ABEDA INAMDAR<br />SENIOR COLLEGE</div>
            <div className="aisc-brand-caption">Arts · Science · Commerce</div>
          </div>
        </div>
        <div className="aisc-nav-label">Examination Cell</div>
        <nav className="aisc-nav">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} end onClick={() => setMobileOpen(false)}>
              <Icon size={17} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="aisc-sidebar-foot">
          <strong>Academic Administration</strong>
          <span>Examination management workspace for authorised college staff.</span>
          <a href="https://www.abedainamdarcollege.org.in/" target="_blank" rel="noreferrer">
            College website <ExternalLink size={11} />
          </a>
        </div>
      </aside>

      {mobileOpen && <div className="aisc-overlay show" onClick={() => setMobileOpen(false)} />}
      <main className="aisc-main">
        <header className="aisc-topbar">
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button className="aisc-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18}/></button>
            <div className="aisc-crumb">College Portal <span style={{padding:"0 7px"}}>/</span><strong>{currentPage}</strong></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:15}}>
            <Bell size={17} color="#71809A"/>
            <div className="aisc-top-user">
              <div className="aisc-avatar">EC</div>
              <div><strong>Examination Cell</strong><small>Administrator</small></div>
            </div>
          </div>
        </header>
        <div className="aisc-content"><Outlet /></div>
      </main>
    </div>
  );
}
