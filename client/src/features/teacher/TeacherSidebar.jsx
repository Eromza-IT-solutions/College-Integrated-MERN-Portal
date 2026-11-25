import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, User, Users, ClipboardCheck, CalendarClock, GraduationCap, BookOpen, CalendarDays,
  Megaphone, LogOut, ChevronDown, X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Teacher menu — edit labels / paths here, the sidebar and the        */
/* topbar search both read from this list.                             */
/* ------------------------------------------------------------------ */

export const TEACHER_MENU = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/teacher/dashboard" },

  {
    label: "My Classes",
    icon: Users,
    children: [
      { label: "Class List", to: "/teacher/classes" },
    ],
  },

  {
    label: "Attendance",
    icon: ClipboardCheck,
    children: [
      { label: "Attendance Report", to: "/teacher/attendance/report" },
      { label: "Defaulter List", to: "/teacher/attendance/defaulters" },
    ],
  },

  { label: "Timetable", icon: CalendarClock, to: "/teacher/timetable" },

  {
    label: "Examinations",
    icon: GraduationCap,
    children: [
      { label: "Internal Marks", to: "/teacher/examinations/internal-marks" },
      { label: "Exam Duty", to: "/teacher/examinations/duty" },
      { label: "Results", to: "/teacher/examinations/results" },
    ],
  },

  {
    label: "Study Material",
    icon: BookOpen,
    children: [
      { label: "Assignments", to: "/teacher/material/assignments" },
    ],
  },

  {
    label: "Leave",
    icon: CalendarDays,
    children: [
      { label: "Apply Leave", to: "/teacher/leave/apply" },
      { label: "Leave Status", to: "/teacher/leave/status" },
    ],
  },

  { label: "Notices", icon: Megaphone, to: "/teacher/notices" },
];

const isActivePath = (pathname, to) => pathname === to || pathname.startsWith(to + "/");

export default function TeacherSidebar({ open = false, onClose, onLogout }) {
  const { pathname } = useLocation();
  const activeGroup = TEACHER_MENU.find((m) => m.children?.some((c) => isActivePath(pathname, c.to)))?.label || null;
  const [openGroup, setOpenGroup] = useState(activeGroup);

  // open the group that contains the current page whenever the route changes
  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  return (
    <aside className={"ts" + (open ? " open" : "")} aria-label="Teacher navigation">
      <style>{css}</style>

      <button type="button" className="ts-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>

      <div className="ts-brand">
        <span className="ts-logo">
  <img src="/logo.png" alt="Abeda Inamdar Senior College logo" />
</span>
        <h2>Abeda Inamdar<span>Senior College</span></h2>
      </div>

      <nav className="ts-nav">
        <ul>
          {TEACHER_MENU.map((item) => {
            const Icon = item.icon;

            if (!item.children) {
              return (
                <li key={item.label}>
                  <NavLink to={item.to} end={item.end} onClick={onClose} className={({ isActive }) => "ts-link" + (isActive ? " active" : "")}>
                    <Icon size={18} aria-hidden="true" /> <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            }

            const expanded = openGroup === item.label;
            const hasActive = item.label === activeGroup;
            const id = `ts-sub-${item.label.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  className={"ts-link group" + (expanded ? " expanded" : "") + (hasActive ? " has-active" : "")}
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => setOpenGroup(expanded ? null : item.label)}
                >
                  <Icon size={18} aria-hidden="true" /> <span>{item.label}</span>
                  <ChevronDown size={16} className="chev" aria-hidden="true" />
                </button>
                <div id={id} className={"ts-sub-wrap" + (expanded ? " show" : "")}>
                  <ul className="ts-sub">
                    {item.children.map((c) => (
                      <li key={c.to}>
                        <NavLink to={c.to} onClick={onClose} className={({ isActive }) => "ts-sublink" + (isActive ? " active" : "")}>
                          {c.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ts-foot">
        <button type="button" className="ts-link" onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" /> <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

const css = `
.ts{width:256px;flex-shrink:0;height:100vh;display:flex;flex-direction:column;color:#fff;position:relative;z-index:40;
  background:linear-gradient(180deg,#0f1d57 0%,#0a1440 60%,#080f33 100%);border-right:1px solid rgba(255,255,255,.06)}
.ts *{box-sizing:border-box}
.ts button{font-family:inherit}

.ts-close{display:none;position:absolute;top:12px;right:12px;width:36px;height:36px;border:0;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;place-items:center}

.ts-brand{padding:26px 16px 18px;text-align:center}
.ts-logo{position:relative;width:120px;height:120px;margin:0 auto 12px;display:grid;place-items:center;overflow:hidden;background:transparent}
.ts-logo img{width:100%;height:100%;object-fit:contain;background:transparent}
.ts-brand h2{margin:0;font:700 21px/1.25 'Playfair Display',Georgia,serif;color:#fff}
.ts-brand h2 span{display:block;color:#e3b82b}

.ts-nav{flex:1;overflow-y:auto;padding:10px 10px 12px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}
.ts-nav ul,.ts-sub{list-style:none;margin:0;padding:0}
.ts-nav>ul{display:grid;gap:4px}

.ts-link{position:relative;width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:0;border-radius:12px;background:none;color:#e4e8ff;
  font-size:14px;font-weight:500;text-decoration:none;text-align:left;cursor:pointer;transition:background .15s,color .15s}
.ts-link span{flex:1}
.ts-link:hover{background:rgba(255,255,255,.08);color:#fff}
.ts-link.active{background:#fff;color:#0f1d57;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,.25)}
.ts-link.active::before{content:"";position:absolute;left:-10px;top:10px;bottom:10px;width:4px;border-radius:0 4px 4px 0;background:#e3b82b}
.ts-link.group.expanded,.ts-link.group.has-active{background:rgba(255,255,255,.1);color:#fff}
.ts-link .chev{flex:none;transition:transform .25s}
.ts-link.expanded .chev{transform:rotate(180deg)}
.ts a:focus-visible,.ts button:focus-visible{outline:3px solid #e3b82b;outline-offset:2px}

.ts-sub-wrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .28s ease}
.ts-sub-wrap.show{grid-template-rows:1fr}
.ts-sub{overflow:hidden;margin:0 0 0 26px;padding-left:12px;border-left:1px solid rgba(255,255,255,.14);visibility:hidden;transition:visibility 0s .28s}
.ts-sub-wrap.show .ts-sub{visibility:visible;transition-delay:0s}
.ts-sub-wrap.show .ts-sub{margin-top:4px;margin-bottom:6px}
.ts-sublink{display:block;padding:9px 12px;border-radius:9px;color:#b8c0ec;font-size:13.5px;text-decoration:none;position:relative;transition:color .15s,background .15s,padding .15s}
.ts-sublink:hover{color:#fff;background:rgba(255,255,255,.06)}
.ts-sublink.active{color:#fff;font-weight:600}
.ts-sublink.active::before{content:"";position:absolute;left:-17px;top:50%;width:9px;height:9px;margin-top:-4.5px;border-radius:50%;background:#e3b82b;box-shadow:0 0 0 3px rgba(227,184,43,.25)}

.ts-foot{padding:10px;border-top:1px solid rgba(255,255,255,.1)}
.ts-foot .ts-link:hover{
  background:#dc2626;
  color:#fff;
}

@media(max-width:1023px){
  .ts{position:fixed;left:0;top:0;bottom:0;width:272px;transform:translateX(-100%);transition:transform .28s ease;box-shadow:none}
  .ts.open{transform:none;box-shadow:12px 0 40px rgba(0,0,0,.4)}
  .ts-close{display:grid}
}
@media(prefers-reduced-motion:reduce){.ts,.ts-sub-wrap,.ts-link .chev{transition:none}}
`;