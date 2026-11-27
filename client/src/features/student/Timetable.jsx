import { useEffect, useMemo, useState } from "react";
import { Clock, Coffee, MapPin, Printer, UserRound, CalendarDays, LayoutGrid, List } from "lucide-react";

/*
  Content area only - render it inside your student layout (next to the sidebar).

  Pass your own data with these props (same shapes as the sample below):
    slots:    [{ start: "09:00", end: "10:00" }, { start: "11:00", end: "11:15", label: "Short break", isBreak: true }, ...]
    schedule: { Mon: { "09:00": { subject, teacher, room, type } }, Tue: {...}, ... }   (keyed by slot start time)
  Delete the sample data when your API is ready.
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const DAYS = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
];

const sampleSlots = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "11:15", label: "Short break", isBreak: true },
  { start: "11:15", end: "12:15" },
  { start: "12:15", end: "13:15" },
  { start: "13:15", end: "14:00", label: "Lunch break", isBreak: true },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
];

const SUBJECTS = {
  DS: { subject: "Data Structures", teacher: "Prof. Sharma", room: "Room 204" },
  DBMS: { subject: "Database Management", teacher: "Prof. Deshmukh", room: "Room 204" },
  OS: { subject: "Operating Systems", teacher: "Prof. Kulkarni", room: "Room 110" },
  WT: { subject: "Web Technologies", teacher: "Prof. Patil", room: "Room 110" },
  CN: { subject: "Computer Networks", teacher: "Prof. Joshi", room: "Room 204" },
};
const L = (k, type = "Lecture") => ({
  ...SUBJECTS[k],
  type,
  room: type === "Practical" ? "Computer Lab" : SUBJECTS[k].room,
});

const sampleSchedule = {
  Mon: { "09:00": L("DS"), "10:00": L("DBMS"), "11:15": L("CN"), "12:15": L("OS"), "14:00": L("WT", "Practical"), "15:00": L("WT", "Practical") },
  Tue: { "09:00": L("OS"), "10:00": L("WT"), "11:15": L("DS"), "12:15": L("DBMS"), "14:00": L("CN") },
  Wed: { "09:00": L("DBMS"), "10:00": L("CN"), "11:15": L("OS"), "12:15": L("WT"), "14:00": L("DS", "Practical"), "15:00": L("DS", "Practical") },
  Thu: { "09:00": L("WT"), "10:00": L("DS"), "11:15": L("DBMS"), "12:15": L("CN"), "14:00": L("OS") },
  Fri: { "09:00": L("OS"), "10:00": L("CN"), "11:15": L("WT"), "12:15": L("DS"), "14:00": L("DBMS", "Practical"), "15:00": L("DBMS", "Practical") },
  Sat: { "09:00": L("DS"), "10:00": L("OS"), "11:15": L("DBMS"), "12:15": L("CN") },
};

/* ------------------------------- HELPERS -------------------------------- */
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
// JS getDay(): 0 = Sunday ... 6 = Saturday  ->  index into DAYS (or -1 for Sunday)
const dayIndexOf = (date) => (date.getDay() === 0 ? -1 : date.getDay() - 1);

// Soft colour pairs, one per subject (all drawn from the college palette plus neutrals)
const STYLES = [
  "border-[#16285a]/30 bg-[#16285a]/10 text-[#16285a]",
  "border-[#8b0f1f]/30 bg-[#8b0f1f]/10 text-[#8b0f1f]",
  "border-[#c9971c]/50 bg-[#f5b800]/20 text-[#7a5a00]",
  "border-emerald-200 bg-emerald-50 text-emerald-800",
  "border-sky-200 bg-sky-50 text-sky-800",
  "border-slate-300 bg-slate-100 text-slate-700",
];

/* ------------------------------ COMPONENT ------------------------------- */
export default function StudentTimetable({
  slots = sampleSlots,
  schedule = sampleSchedule,
  termLabel = "Semester 5 · Academic year 2026 - 2027",
  onPrint = () => window.print(),
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const todayIdx = dayIndexOf(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "day" : "week"
  );
  const [selectedDay, setSelectedDay] = useState(todayIdx === -1 ? 0 : todayIdx);

  /* ---- Subject list, colours and weekly counts ---- */
  const { styleOf, subjectRows } = useMemo(() => {
    const info = {};
    DAYS.forEach((d) =>
      Object.values(schedule[d.short] ?? {}).forEach((e) => {
        info[e.subject] ??= { subject: e.subject, teacher: e.teacher, rooms: new Set(), lectures: 0, practicals: 0 };
        info[e.subject].rooms.add(e.room);
        e.type === "Practical" ? info[e.subject].practicals++ : info[e.subject].lectures++;
      })
    );
    const names = Object.keys(info);
    return {
      styleOf: (name) => STYLES[names.indexOf(name) % STYLES.length],
      subjectRows: Object.values(info).map((r) => ({ ...r, rooms: [...r.rooms].join(", ") })),
    };
  }, [schedule]);

  /* ---- Happening now / up next ---- */
  const status = useMemo(() => {
    const lectureSlots = slots.filter((s) => !s.isBreak);
    if (todayIdx !== -1) {
      const today = schedule[DAYS[todayIdx].short] ?? {};
      const current = lectureSlots.find(
        (s) => today[s.start] && nowMin >= toMin(s.start) && nowMin < toMin(s.end)
      );
      if (current) return { kind: "now", slot: current, entry: today[current.start] };
      const next = lectureSlots.find((s) => today[s.start] && toMin(s.start) > nowMin);
      if (next) return { kind: "next", slot: next, entry: today[next.start], dayLabel: "Today" };
    }
    for (let i = 1; i <= 7; i++) {
      const idx = dayIndexOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
      if (idx === -1) continue;
      const d = schedule[DAYS[idx].short] ?? {};
      const first = lectureSlots.find((s) => d[s.start]);
      if (first) {
        return {
          kind: "next",
          slot: first,
          entry: d[first.start],
          dayLabel: i === 1 ? "Tomorrow" : DAYS[idx].full,
        };
      }
    }
    return null;
  }, [slots, schedule, todayIdx, nowMin, now]);

  const isCurrent = (dayIdx, slot) =>
    dayIdx === todayIdx && nowMin >= toMin(slot.start) && nowMin < toMin(slot.end);

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ------------------------ Intro + print ------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays size={17} className="text-[#8b0f1f]" />
          {termLabel}
        </p>
        <button
          onClick={onPrint}
          className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#16285a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d3375] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a]"
        >
          <Printer size={16} />
          Print timetable
        </button>
      </div>

      {/* ---------------------- Now / up next banner ---------------------- */}
      <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#16285a] to-[#0b1536] px-6 py-6 text-white shadow-lg md:px-9">
        <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full border-[24px] border-[#f5b800]/15" />
        {status ? (
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#f5b800]">
                {status.kind === "now" ? "Happening now" : `Up next · ${status.dayLabel}`}
              </p>
              <h2
                className="mt-1 text-[26px] font-bold leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {status.entry.subject}
                {status.entry.type === "Practical" && " (Practical)"}
              </h2>
              <p className="mt-1 text-sm text-slate-300">{status.entry.teacher}</p>
            </div>
            <div className="flex flex-wrap gap-2.5 text-sm">
              <span className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5">
                <Clock size={16} className="text-[#f5b800]" />
                {fmt(status.slot.start)} - {fmt(status.slot.end)}
              </span>
              <span className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5">
                <MapPin size={16} className="text-[#f5b800]" />
                {status.entry.room}
              </span>
            </div>
          </div>
        ) : (
          <p className="relative text-sm text-slate-300">No classes are scheduled this week.</p>
        )}
      </section>

      {/* ------------------------ View toggle ------------------------ */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-bold text-[#16285a]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {view === "week" ? "Weekly timetable" : "Day-wise timetable"}
        </h2>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Timetable view">
          {[
            ["week", "Week", LayoutGrid],
            ["day", "Day", List],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                view === id ? "bg-[#16285a] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------- Weekly grid ------------------------- */}
      {view === "week" && (
        <section className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid min-w-[940px] grid-cols-[104px_repeat(6,minmax(0,1fr))] gap-2">
            <div />
            {DAYS.map((d, i) => (
              <div
                key={d.short}
                className={`rounded-xl py-2.5 text-center text-sm font-semibold ${
                  i === todayIdx ? "bg-[#16285a] text-white" : "bg-slate-100 text-[#16285a]"
                }`}
              >
                {d.full}
                {i === todayIdx && <span className="ml-1.5 text-xs font-medium text-[#f5b800]">Today</span>}
              </div>
            ))}

            {slots.map((slot) =>
              slot.isBreak ? (
                <div key={slot.start} className="col-span-7 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500">
                  <Coffee size={14} />
                  {slot.label} · {fmt(slot.start)} - {fmt(slot.end)}
                </div>
              ) : (
                <Row
                  key={slot.start}
                  slot={slot}
                  schedule={schedule}
                  styleOf={styleOf}
                  isCurrent={isCurrent}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* --------------------------- Day view --------------------------- */}
      {view === "day" && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="Choose a day">
            {DAYS.map((d, i) => (
              <button
                key={d.short}
                role="tab"
                aria-selected={selectedDay === i}
                onClick={() => setSelectedDay(i)}
                className={`relative shrink-0 rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
                  selectedDay === i ? "bg-[#16285a] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d.short}
                {i === todayIdx && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#f5b800]" />
                )}
              </button>
            ))}
          </div>

          <DayList
            dayIdx={selectedDay}
            slots={slots}
            schedule={schedule}
            styleOf={styleOf}
            isCurrent={isCurrent}
          />
        </section>
      )}

      {/* ---------------------- Subjects and teachers ---------------------- */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2
          className="mb-5 text-lg font-bold text-[#16285a]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Subjects and teachers
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Teacher</th>
                <th className="pb-3 font-medium">Room</th>
                <th className="pb-3 text-center font-medium">Lectures per week</th>
                <th className="pb-3 text-center font-medium">Practical hours</th>
              </tr>
            </thead>
            <tbody>
              {subjectRows.map((r) => (
                <tr key={r.subject} className="border-b border-slate-100 last:border-0">
                  <td className="py-3.5">
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${styleOf(r.subject)}`}>
                      {r.subject}
                    </span>
                  </td>
                  <td className="py-3.5">{r.teacher}</td>
                  <td className="py-3.5">{r.rooms}</td>
                  <td className="py-3.5 text-center">{r.lectures}</td>
                  <td className="py-3.5 text-center">{r.practicals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* --------------------------- One row of the grid --------------------------- */
function Row({ slot, schedule, styleOf, isCurrent }) {
  return (
    <>
      <div className="flex flex-col justify-center rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
        <span>{fmt(slot.start)}</span>
        <span className="text-slate-400">to {fmt(slot.end)}</span>
      </div>
      {DAYS.map((d, i) => {
        const entry = schedule[d.short]?.[slot.start];
        if (!entry) {
          return (
            <div key={d.short} className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-300">
              Free
            </div>
          );
        }
        const current = isCurrent(i, slot);
        return (
          <div
            key={d.short}
            className={`rounded-xl border p-2.5 ${styleOf(entry.subject)} ${
              current ? "ring-2 ring-[#c9971c] ring-offset-2" : ""
            }`}
          >
            <p className="text-[13px] font-semibold leading-snug">{entry.subject}</p>
            <p className="mt-1 text-[11px] opacity-80">{entry.teacher}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-80">
              <MapPin size={11} />
              {entry.room}
            </p>
            {entry.type === "Practical" && (
              <span className="mt-1.5 inline-block rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">
                Practical
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------ Day list ------------------------------ */
function DayList({ dayIdx, slots, schedule, styleOf, isCurrent }) {
  const day = schedule[DAYS[dayIdx].short] ?? {};
  const lastIdx = slots.reduce((acc, s, i) => (day[s.start] ? i : acc), -1);

  if (lastIdx === -1) {
    return (
      <p className="mt-2 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
        No lectures on {DAYS[dayIdx].full}.
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-3">
      {slots.slice(0, lastIdx + 1).map((slot) => {
        const entry = day[slot.start];
        if (slot.isBreak) {
          return (
            <li key={slot.start} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500">
              <Coffee size={14} />
              {slot.label} · {fmt(slot.start)} - {fmt(slot.end)}
            </li>
          );
        }
        const current = isCurrent(dayIdx, slot);
        return (
          <li key={slot.start} className="flex items-stretch gap-3">
            <div className="flex w-20 shrink-0 flex-col justify-center text-xs font-medium text-slate-600">
              <span>{fmt(slot.start)}</span>
              <span className="text-slate-400">{fmt(slot.end)}</span>
            </div>
            {entry ? (
              <div
                className={`flex-1 rounded-xl border p-3.5 ${styleOf(entry.subject)} ${
                  current ? "ring-2 ring-[#c9971c] ring-offset-2" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{entry.subject}</p>
                  {entry.type === "Practical" && (
                    <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">Practical</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
                  <span className="flex items-center gap-1">
                    <UserRound size={12} />
                    {entry.teacher}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {entry.room}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                Free period
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}