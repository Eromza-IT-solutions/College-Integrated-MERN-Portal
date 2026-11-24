
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, Clock } from "lucide-react";
import { Card, Pill, Stat, Empty, PageShell, useTeacher, CLASSES, TIMETABLE, DAYS, ROUTES, mins, t12 } from "./TeacherShared";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export default function TeacherTimetable() {
  const go = useNavigate();
  const { now } = useTeacher();
  const [view, setView] = useState("week");
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  const cls = (id) => CLASSES.find((c) => c.id === id);
  const isNow = (t) => t.day === today && mins(t.start) <= nowMin && nowMin < mins(t.end);
  const todayList = TIMETABLE.filter((t) => t.day === today).sort((a, b) => mins(a.start) - mins(b.start));

  return (
    <PageShell title="Timetable" section="Timetable" chip={`${TIMETABLE.length} lectures per week`}>
      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat icon={Clock} label="Weekly lectures" value={TIMETABLE.length} sub="Across all classes" />
        <Stat label="Today" value={todayList.length} sub={todayList.length ? `${DAYS[today]}` : `${DAYS[today]} · no lectures`} />
        <Stat label="Busiest day" value={DAYS[[1, 2, 3, 4, 5, 6].sort((a, b) => TIMETABLE.filter((t) => t.day === b).length - TIMETABLE.filter((t) => t.day === a).length)[0]]} sub="Most lectures" />
      </div>

      <Card title="My weekly timetable" action={
        <div className="btns no-print">
          <div className="seg" role="tablist" aria-label="View">
            {[["week", "Week"], ["today", "Today"]].map(([v, l]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "P on" : ""} onClick={() => setView(v)}>{l}</button>
            ))}
          </div>
          <button type="button" className="mini" onClick={() => window.print()}><Printer size={14} /> Print</button>
        </div>
      }>
        {view === "week" ? (
          <div className="table-wrap">
            <div className="tt-grid" role="table" aria-label="Weekly timetable">
              <div />
              {[1, 2, 3, 4, 5, 6].map((d) => <div key={d} className={"tt-h" + (d === today ? " today" : "")}>{DAYS[d]}</div>)}
              {HOURS.map((h) => (
                <div key={h} style={{ display: "contents" }}>
                  <div className="tt-time">{t12(h)}</div>
                  {[1, 2, 3, 4, 5, 6].map((d) => {
                    const t = TIMETABLE.find((x) => x.day === d && x.start === h);
                    const c = t && cls(t.classId);
                    return t ? (
                      <div key={d} className={"tt-cell has" + (isNow(t) ? " now" : "")}><b>{c.subject}</b><small>{c.name}</small><small>{c.room}</small></div>
                    ) : <div key={d} className="tt-cell" />;
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : todayList.length ? (
          <ul className="list">
            {todayList.map((t) => {
              const c = cls(t.classId);
              const status = mins(t.end) <= nowMin ? "done" : isNow(t) ? "now" : "next";
              return (
                <li key={t.start} className={status}>
                  <span className="time">{t12(t.start)}<br />{t12(t.end)}</span>
                  <span><b>{c.subject}</b><small>{c.name} · Sem {c.sem} · {c.room}</small></span>
                  <span className="btns" style={{ gap: 8 }}>
                    <Pill tone={status === "now" ? "red" : status === "next" ? "blue" : "gray"}>{status === "now" ? "Ongoing" : status === "next" ? "Upcoming" : "Completed"}</Pill>
                    {status !== "next" && <button type="button" className="mini no-print" onClick={() => go(ROUTES.attMark)}>Attendance</button>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : <Empty icon={Clock}>No lectures on {DAYS[today]}.</Empty>}
      </Card>

      <Card title="Weekly load by class">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Class</th><th>Subject</th><th>Room</th><th className="c">Lectures / week</th></tr></thead>
            <tbody>
              {CLASSES.map((c) => <tr key={c.id}><td>{c.name} · Sem {c.sem}</td><td><b>{c.subject}</b><small>{c.code}</small></td><td>{c.room}</td><td className="c"><Pill tone="blue">{TIMETABLE.filter((t) => t.classId === c.id).length}</Pill></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
};