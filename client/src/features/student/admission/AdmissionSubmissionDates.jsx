import { CalendarDays, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Card, Pill, PageShell, dateOf, fmt, daysLeft, useAdmission } from "./AdmissionShared";

const DAY = 86400000;

function statusOf(item, now) {
  const start = dateOf(item.date);
  const end = new Date((item.end ? dateOf(item.end) : start).getTime() + DAY);
  if (now >= end) return "past";
  if (now >= start) return "now";
  return "upcoming";
}

export default function AdmissionSubmissionDates() {
  const { dates, now, application, go } = useAdmission();
  const items = dates.map((d) => ({ ...d, status: statusOf(d, now) }));
  const firstUpcoming = items.find((i) => i.status === "upcoming");

  const startItem = dates.find((d) => d.id === "start");
  const lastItem = dates.find((d) => d.id === "last");
  let window = null;
  if (startItem && lastItem) {
    const s = dateOf(startItem.date), e = new Date(dateOf(lastItem.date).getTime() + DAY);
    const pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
    const left = daysLeft(lastItem.date, now);
    window = { pct, left, state: now < s ? "soon" : now >= e ? "closed" : "open" };
  }

  const when = (i) => (i.end ? `${fmt(i.date, { day: "numeric", month: "short" })} – ${fmt(i.end)}` : fmt(i.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
  const chip = (i) => {
    if (i.status === "past") return <Pill tone="green">Completed</Pill>;
    if (i.status === "now") return <Pill tone="red">Happening now</Pill>;
    const d = daysLeft(i.date, now);
    return <Pill tone={d <= 3 ? "gold" : "gray"}>In {d} day{d === 1 ? "" : "s"}</Pill>;
  };

  return (
    <PageShell title="Form Submission Dates">
      <div className="grid-2">
        <Card title="Admission schedule" action={<Pill tone="blue">{items.length} milestones</Pill>}>
          <ol className="tl">
            {items.map((i) => (
              <li key={i.id} className={i.status === "past" ? "past" : i.status === "now" ? "now" : i === firstUpcoming ? "next-up" : ""}>
                <span className="mk">{i.status === "past" ? <CheckCircle2 size={20} /> : i.status === "now" ? <Clock size={20} /> : <CalendarDays size={18} />}</span>
                <div>
                  <div className="when">{when(i)}</div>
                  <b>{i.title}</b>
                  {i.note && <small>{i.note}</small>}
                </div>
                {chip(i)}
              </li>
            ))}
          </ol>
        </Card>

        <div className="stack">
          {window && (
            <Card title="Form submission window">
              <p className="lead" style={{ marginBottom: 10 }}>
                {window.state === "soon" && `Opens on ${fmt(startItem.date)}.`}
                {window.state === "open" && <>The form is <b>open</b> — {window.left} day{window.left === 1 ? "" : "s"} left to submit.</>}
                {window.state === "closed" && "The regular submission window has closed. Check the late-fee date."}
              </p>
              <div className="bar"><div style={{ width: `${window.pct}%` }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7392", marginTop: 8 }}>
                <span>{fmt(startItem.date, { day: "numeric", month: "short" })}</span>
                <span>{fmt(lastItem.date, { day: "numeric", month: "short" })}</span>
              </div>
            </Card>
          )}

          {firstUpcoming && (
            <Card title="Next important date">
              <b style={{ fontSize: 15 }}>{firstUpcoming.title}</b>
              <p className="lead" style={{ margin: "6px 0 0" }}>{when(firstUpcoming)} · in {daysLeft(firstUpcoming.date, now)} days</p>
            </Card>
          )}

          <Card title="Your application">
            {application ? (
              <>
                <p className="lead">You submitted your form on {fmt(new Date(application.submittedOn))}.</p>
                <button type="button" className="btn ghost" onClick={() => go("info")}>My admission info <ArrowRight size={15} /></button>
              </>
            ) : (
              <>
                <p className="lead">You haven’t submitted your admission form yet.</p>
                <button type="button" className="btn" onClick={() => go("fill")}>Fill form <ArrowRight size={15} /></button>
              </>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}