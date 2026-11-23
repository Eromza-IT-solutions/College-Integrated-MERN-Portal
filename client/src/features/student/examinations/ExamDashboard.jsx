import { GraduationCap, FileText, CreditCard, Ticket, CalendarDays, CheckCircle2, Circle, Lock, ArrowRight, Download } from "lucide-react";
import { Card, Pill, PageShell, useExam, inr, fmt, dateOf, daysLeft, FEE_ITEMS, SECTIONS } from "./ExamShared";

function DashboardSection() {
  const { exams, status, steps, progress, deadlines, go, now } = useExam();
  const upcoming = exams.filter((e) => daysLeft(e.date, now) >= 0).sort((a, b) => dateOf(a.date) - dateOf(b.date));
  const next = upcoming[0];
  const nextDays = next ? daysLeft(next.date, now) : null;
  const allDone = steps.slice(0, 4).every((s) => s.done);

  const stat = (label, value, sub, Icon, tone = "") => (
    <div className={"stat " + tone}>
      <div className="stat-top"><span>{label}</span><i><Icon size={16} /></i></div>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  );

  return (
    <>
      <div className="stats">
        {stat("Next exam", next ? (nextDays === 0 ? "Today" : `${nextDays} day${nextDays === 1 ? "" : "s"}`) : "—", next ? next.name : "No upcoming exams", GraduationCap)}
        {stat("Examination form", status.form ? "Submitted" : "Pending", status.form ? `Ref ${status.form.ref}` : `Last date ${fmt(deadlines.form, { day: "numeric", month: "short" })}`, FileText, status.form ? "good" : "warn")}
        {stat("Form fee", status.fee ? "Paid" : inr(FEE_ITEMS.reduce((a, b) => a + b.amount, 0)), status.fee ? `Receipt ${status.fee.receipt}` : `Pay before ${fmt(deadlines.fee, { day: "numeric", month: "short" })}`, CreditCard, status.fee ? "good" : "warn")}
        {stat("Hall ticket", allDone ? "Ready" : "Locked", allDone ? "Download available" : "Complete the 4 steps first", Ticket, allDone ? "good" : "")}
      </div>

      <div className="grid-2">
        <div className="stack">
          <Card title="Your exam journey" action={<span className="pct">{progress}% complete</span>}>
            <div className="bar"><div style={{ width: `${progress}%` }} /></div>
            <ol className="journey">
              {steps.map((s, i) => (
                <li key={s.id} className={s.done ? "done" : s.locked ? "locked" : "todo"}>
                  <span className="dot">{s.done ? <CheckCircle2 size={18} /> : s.locked ? <Lock size={15} /> : <Circle size={18} />}</span>
                  <div>
                    <b>{i + 1}. {s.label}</b>
                    <small>{s.done ? s.doneText : s.locked ? "Unlocks when the steps above are complete" : s.todoText}</small>
                  </div>
                  {s.go && !s.done && !s.locked && (
                    <button type="button" className="link" onClick={() => go(s.go)}>Start <ArrowRight size={14} /></button>
                  )}
                  {s.id === "ticket" && allDone && (
                    <button type="button" className="link" onClick={() => window.print()}><Download size={14} /> Download</button>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Upcoming exams">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Venue</th><th>Starts in</th></tr></thead>
                <tbody>
                  {upcoming.map((e) => {
                    const d = daysLeft(e.date, now);
                    return (
                      <tr key={e.code}>
                        <td><b>{e.name}</b><small>{e.code}</small></td>
                        <td>{fmt(e.date, { day: "numeric", month: "short" })}</td>
                        <td>{e.time}</td>
                        <td>{e.venue}</td>
                        <td><Pill tone={d <= 3 ? "red" : d <= 7 ? "gold" : "blue"}>{d === 0 ? "Today" : `${d} days`}</Pill></td>
                      </tr>
                    );
                  })}
                  {!upcoming.length && <tr><td colSpan={5} className="muted">No upcoming exams.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="Quick actions">
            <div className="actions">
              {SECTIONS.slice(1).map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => go(id)}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Important dates">
            <ul className="dates">
              {[
                ["Examination form last date", deadlines.form, !!status.form],
                ["Form fee last date", deadlines.fee, !!status.fee],
                ["Photo upload last date", deadlines.photo, !!status.photo],
              ].map(([l, d, done]) => {
                const left = daysLeft(d, now);
                return (
                  <li key={l}>
                    <CalendarDays size={16} />
                    <div><b>{l}</b><small>{fmt(d)}</small></div>
                    {done ? <Pill tone="green">Done</Pill> : left < 0 ? <Pill tone="red">Closed</Pill> : <Pill tone={left <= 3 ? "red" : "gold"}>{left} days left</Pill>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function ExamDashboard() {
  const { session } = useExam();
  return (
    <PageShell title={session}>
      <DashboardSection />
    </PageShell>
  );
}