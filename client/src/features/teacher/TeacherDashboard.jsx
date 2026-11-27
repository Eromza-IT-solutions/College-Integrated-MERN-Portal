import { useNavigate } from "react-router-dom";
import { CalendarClock, Users, ClipboardCheck, ListChecks, FileEdit, CalendarDays, Megaphone, ArrowRight, GraduationCap, UserCheck } from "lucide-react";
import {
  Card, Pill, Stat, Bar, Empty, PageShell, useTeacher, CLASSES, TIMETABLE, ROUTES, studentsOf, studentStats, mins, t12, fmt, daysLeft, iso,
} from "./TeacherShared";
const MIN_ATT = 75;
export default function TeacherDashboard() {
  const go = useNavigate();
  const { teacher, attendance, marksLocked, duties, leaves, notices, readNotices, now } = useTeacher();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = iso(now);

  const lectures = TIMETABLE.filter((t) => t.day === now.getDay()).sort((a, b) => mins(a.start) - mins(b.start)).map((t) => ({
    ...t, c: CLASSES.find((c) => c.id === t.classId),
    status: mins(t.end) <= nowMin ? "done" : mins(t.start) <= nowMin ? "now" : "next",
    marked: !!attendance[t.classId]?.[todayKey],
  }));

  const perClass = CLASSES.map((c) => {
    const st = studentsOf(c.id).map((s) => studentStats(attendance, c.id, s.id));
    return { c, avg: st.length ? Math.round((st.reduce((a, s) => a + s.pct, 0) / st.length) * 10) / 10 : 0, low: st.filter((s) => s.total && s.pct < MIN_ATT).length };
  });
  const overall = Math.round((perClass.reduce((a, p) => a + p.avg, 0) / perClass.length) * 10) / 10;
  const totalStudents = [...new Set(CLASSES.map((c) => c.group))].reduce((a, g) => a + studentsOf(CLASSES.find((c) => c.group === g).id).length, 0);

  const unmarked = lectures.filter((l) => l.status !== "next" && !l.marked);
  const marksPending = CLASSES.filter((c) => !marksLocked[c.id]).length;
  const dutiesPending = duties.filter((d) => !d.ack && daysLeft(d.date, now) >= 0).length;
  const leavesPending = leaves.filter((l) => l.status === "Pending").length;
  const unread = notices.filter((n) => !readNotices.has(n.id)).length;

  const tasks = [
    ...unmarked.map((l) => ({ k: `att-${l.start}`, text: `Mark attendance — ${l.c.subject} (${t12(l.start)})`, to: ROUTES.attMark, tone: "red" })),
    marksPending && { k: "marks", text: `Internal marks pending for ${marksPending} class${marksPending > 1 ? "es" : ""}`, to: ROUTES.marks, tone: "gold" },
    dutiesPending && { k: "duty", text: `${dutiesPending} exam dut${dutiesPending > 1 ? "ies" : "y"} to acknowledge`, to: ROUTES.duty, tone: "gold" },
    leavesPending && { k: "leave", text: `${leavesPending} leave request awaiting approval`, to: ROUTES.leaveStatus, tone: "blue" },
    unread && { k: "notice", text: `${unread} unread notice${unread > 1 ? "s" : ""}`, to: ROUTES.notices, tone: "blue" },
  ].filter(Boolean);

  const nextDuty = duties.filter((d) => daysLeft(d.date, now) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
  const greet = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <PageShell title={`${greet}, ${teacher.name.replace(/^(Prof\.|Dr\.)\s*/, "").split(" ")[0]}`} section="Teacher dashboard"
      chip={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      <div className="stats">
        <Stat icon={CalendarClock} label="Lectures today" value={lectures.length} sub={lectures.length ? `${lectures.filter((l) => l.status === "done").length} completed` : "No lectures scheduled"} />
        <Stat icon={Users} label="Total students" value={totalStudents} sub={`${CLASSES.length} classes this semester`} />
        <Stat icon={UserCheck} label="Average attendance" value={`${overall}%`} sub={`Minimum required ${75}%`} tone={overall >= 75 ? "good" : "warn"} />
        <Stat icon={ListChecks} label="Pending tasks" value={tasks.length} sub={tasks.length ? "Needs your attention" : "All caught up"} tone={tasks.length ? "warn" : "good"} />
      </div>

      <div className="grid-2">
        <div className="stack">
          <Card title="Today’s schedule" action={<button type="button" className="mini" onClick={() => go(ROUTES.timetable)}>Full timetable <ArrowRight size={14} /></button>}>
            {lectures.length ? (
              <ul className="list">
                {lectures.map((l) => (
                  <li key={l.start} className={l.status}>
                    <span className="time">{t12(l.start)}<br />{t12(l.end)}</span>
                    <span><b>{l.c.subject}</b><small>{l.c.name} · Sem {l.c.sem} · {l.c.room}</small></span>
                    <span className="btns" style={{ gap: 8 }}>
                      {l.status === "now" && <Pill tone="red">Ongoing</Pill>}
                      {l.status === "next" && <Pill tone="blue">Upcoming</Pill>}
                      {l.status === "done" && <Pill tone="gray">Completed</Pill>}
                      {l.status !== "next" && (l.marked ? <Pill tone="green">Attendance done</Pill> : <button type="button" className="mini" onClick={() => go(ROUTES.attMark)}>Mark attendance</button>)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <Empty icon={CalendarClock}>No lectures today — enjoy the free day!</Empty>}
          </Card>

          <Card title="Attendance by class" action={<button type="button" className="mini" onClick={() => go(ROUTES.attReport)}>Reports <ArrowRight size={14} /></button>}>
            <div style={{ display: "grid", gap: 16 }}>
              {perClass.map(({ c, avg, low }) => (
                <div key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, marginBottom: 6 }}>
                    <span><b>{c.subject}</b> <span className="muted">· {c.name}</span></span>
                    <span><b>{avg}%</b>{low > 0 && <> · <span style={{ color: "#9b1230" }}>{low} below {75}%</span></>}</span>
                  </div>
                  <Bar pct={avg} tone={avg >= 75 ? "good" : "warn"} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="Quick actions">
            <div className="actions">
              {[
                [ClipboardCheck, "Mark attendance", ROUTES.attMark], [FileEdit, "Enter internal marks", ROUTES.marks],
                [CalendarDays, "Apply for leave", ROUTES.leaveApply], [GraduationCap, "Upload material", ROUTES.material],
              ].map(([Icon, label, to]) => (
                <button key={label} type="button" onClick={() => go(to)}><Icon size={18} /> {label}</button>
              ))}
            </div>
          </Card>

          <Card title="To do">
            {tasks.length ? (
              <ul className="list">
                {tasks.map((t) => (
                  <li key={t.k} style={{ gridTemplateColumns: "1fr auto" }}>
                    <span style={{ fontSize: 13.5 }}>{t.text}</span>
                    <button type="button" className="mini" onClick={() => go(t.to)}>Open</button>
                  </li>
                ))}
              </ul>
            ) : <Empty icon={ListChecks}>Nothing pending. Great work!</Empty>}
          </Card>

          {nextDuty && (
            <Card title="Next exam duty">
              <b style={{ fontSize: 15 }}>{nextDuty.subject}</b>
              <p className="lead" style={{ margin: "6px 0 12px" }}>{fmt(nextDuty.date, { weekday: "long", day: "numeric", month: "short" })} · {nextDuty.time}<br />{nextDuty.venue} · {nextDuty.role}</p>
              <Pill tone={daysLeft(nextDuty.date, now) <= 3 ? "red" : "gold"}>In {daysLeft(nextDuty.date, now)} days</Pill>
            </Card>
          )}

          <Card title="Latest notices" action={<button type="button" className="mini" onClick={() => go(ROUTES.notices)}><Megaphone size={14} /> All</button>}>
            <ul className="list">
              {notices.slice(0, 3).map((n) => (
                <li key={n.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <span><b style={{ fontSize: 13.5 }}>{n.title}</b><small>{n.from} · {fmt(n.date, { day: "numeric", month: "short" })}</small></span>
                  {!readNotices.has(n.id) && <Pill tone="red">New</Pill>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}