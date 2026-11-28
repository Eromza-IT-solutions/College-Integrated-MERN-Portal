import { useMemo, useState } from "react";
import UiCard from "../../components/ui/Card";
import UiErrorState from "../../components/ui/ErrorState";
import UiLoader from "../../components/ui/Loader";
import { useApiData } from "../../hooks/useApiData";
import { fetchAttendanceRecords } from "../../services/studentApi";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";

/*
  Content area only - render it inside your student layout (next to the sidebar).

  Everything is calculated from one list of lecture records, so you only need to pass:
    records:  [{ date: "2026-11-20", subject: "Data Structures", time: "9:00 AM", status: "Present" | "Absent" }]
    holidays: ["2026-11-01", ...]   (optional, "YYYY-MM-DD")
  The sample generator below is placeholder data - delete it when your API is ready.
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const SUBJECTS = [
  "Data Structures",
  "Database Management",
  "Operating Systems",
  "Web Technologies",
  "Computer Networks",
];
// JS weekday (1 = Mon ... 6 = Sat) -> [subject index, time]
const TIMETABLE = {
  1: [[0, "9:00 AM"], [1, "11:00 AM"], [4, "1:30 PM"]],
  2: [[2, "9:00 AM"], [3, "11:00 AM"], [0, "1:30 PM"]],
  3: [[1, "9:00 AM"], [4, "11:00 AM"], [2, "1:30 PM"]],
  4: [[3, "9:00 AM"], [0, "11:00 AM"], [1, "1:30 PM"]],
  5: [[2, "9:00 AM"], [4, "11:00 AM"], [3, "1:30 PM"]],
  6: [[0, "9:00 AM"], [2, "11:00 AM"]],
};
const ABSENT_RATE = [6, 12, 30, 5, 16]; // % chance of absence per subject

const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function buildSample() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holidayOffsets = [27, 28, 52, 53];
  const holidays = holidayOffsets.map((n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return keyOf(d);
  });
  const rnd = (n) => {
    const x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  };
  const records = [];
  for (let i = 100; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const lectures = TIMETABLE[d.getDay()];
    if (!lectures || holidays.includes(keyOf(d))) continue;
    lectures.forEach(([si, time], li) => {
      const seed = d.getTime() / 86400000 + si * 101 + li * 7;
      records.push({
        date: keyOf(d),
        subject: SUBJECTS[si],
        time,
        status: rnd(seed) * 100 < ABSENT_RATE[si] ? "Absent" : "Present",
      });
    });
  }
  return { records, holidays };
}
const SAMPLE = buildSample();

/* ------------------------------- HELPERS -------------------------------- */
const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const pct = (a, t) => (t === 0 ? 0 : Math.round((a / t) * 100));
const monthLabel = (d) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

// How many more classes can be missed (or must be attended) to stay at the required %
function guidance(attended, total, required) {
  const r = required / 100;
  if (attended / total >= r) {
    return { ok: true, count: Math.max(0, Math.floor(attended / r - total)) };
  }
  return { ok: false, count: Math.ceil((r * total - attended) / (1 - r)) };
}

const DAY_STYLE = {
  present: "bg-[#16285a] text-white",
  absent: "bg-[#8b0f1f] text-white",
  partial: "bg-[#f5b800] text-[#16285a]",
  holiday: "bg-slate-100 text-slate-400",
  none: "text-slate-300",
};

/* ------------------------------ COMPONENT ------------------------------- */
function StudentAttendanceView({
  records = SAMPLE.records,
  holidays = SAMPLE.holidays,
  minRequired = 75,
  onDownloadReport = () => {},
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  /* ---- Derived numbers (all from `records`) ---- */
  const { overall, subjects, byDate, monthly, firstMonth } = useMemo(() => {
    const subj = {};
    const dates = {};
    const months = {};
    let attended = 0;
    records.forEach((r) => {
      const present = r.status === "Present";
      subj[r.subject] ??= { attended: 0, total: 0 };
      subj[r.subject].total++;
      if (present) subj[r.subject].attended++;
      (dates[r.date] ??= []).push(r);
      const m = r.date.slice(0, 7);
      months[m] ??= { attended: 0, total: 0 };
      months[m].total++;
      if (present) months[m].attended++;
      if (present) attended++;
    });
    const sortedDates = Object.keys(dates).sort();
    return {
      overall: { attended, total: records.length },
      subjects: Object.entries(subj).map(([name, v]) => ({ name, ...v })),
      byDate: dates,
      monthly: Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-5)
        .map(([key, v]) => ({
          key,
          label: monthLabel(parseKey(key + "-01")),
          ...v,
        })),
      firstMonth: sortedDates[0] ? parseKey(sortedDates[0]) : today,
    };
  }, [records, today]);

  const overallPct = pct(overall.attended, overall.total);
  const missed = overall.total - overall.attended;
  const overallGuide = overall.total ? guidance(overall.attended, overall.total, minRequired) : null;

  /* ---- Calendar state ---- */
  const lastRecordDate = records.length ? records[records.length - 1].date : keyOf(today);
  const [month, setMonth] = useState(() => parseKey(lastRecordDate.slice(0, 7) + "-01"));
  const [selected, setSelected] = useState(lastRecordDate);

  const canGoPrev =
    month.getFullYear() * 12 + month.getMonth() >
    firstMonth.getFullYear() * 12 + firstMonth.getMonth();
  const canGoNext =
    month.getFullYear() * 12 + month.getMonth() < today.getFullYear() * 12 + today.getMonth();
  const moveMonth = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  const dayStatus = (key, date) => {
    const recs = byDate[key];
    if (recs) {
      const p = recs.filter((r) => r.status === "Present").length;
      return p === recs.length ? "present" : p === 0 ? "absent" : "partial";
    }
    if (holidays.includes(key) || date.getDay() === 0) return "holiday";
    return "none";
  };

  const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedRecords = byDate[selected] ?? [];
  const selectedDate = parseKey(selected);
  const selectedIsHoliday =
    selectedRecords.length === 0 && (holidays.includes(selected) || selectedDate.getDay() === 0);

  const stats = [
    {
      label: "Overall attendance",
      value: `${overallPct}%`,
      note: `Minimum required: ${minRequired}%`,
      icon: ClipboardCheck,
      warn: overallPct < minRequired,
    },
    {
      label: "Classes attended",
      value: overall.attended,
      note: `Out of ${overall.total} classes`,
      icon: CheckCircle2,
    },
    {
      label: "Classes missed",
      value: missed,
      note: "Across all subjects",
      icon: XCircle,
      warn: false,
    },
    {
      label: overallGuide?.ok ? "You can still miss" : "You need to attend",
      value: overallGuide ? `${overallGuide.count} classes` : "-",
      note: overallGuide?.ok
        ? `and stay above ${minRequired}%`
        : `in a row to reach ${minRequired}%`,
      icon: overallGuide?.ok ? ShieldCheck : TriangleAlert,
      warn: overallGuide ? !overallGuide.ok : false,
    },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ------------------------------ Intro + download ------------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Your attendance for the current semester. You need at least{" "}
          <span className="font-semibold text-[#16285a]">{minRequired}%</span> in every subject to
          be allowed to sit the exams.
        </p>
        <button
          onClick={onDownloadReport}
          className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#16285a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d3375] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a]"
        >
          <Download size={16} />
          Download report
        </button>
      </div>

      {/* -------------------------------- Stat cards -------------------------------- */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, warn }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  warn ? "bg-red-50 text-[#8b0f1f]" : "bg-[#16285a]/10 text-[#16285a]"
                }`}
              >
                <Icon size={20} strokeWidth={1.8} />
              </span>
            </div>
            <p
              className={`mt-3 text-3xl font-bold ${warn ? "text-[#8b0f1f]" : "text-[#16285a]"}`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ---------------- Left column ---------------- */}
        <div className="space-y-6 xl:col-span-2">
          {/* Subject-wise table */}
          <Card title="Subject-wise attendance">
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance has been recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 text-center font-medium">Attended</th>
                      <th className="pb-3 text-center font-medium">Total</th>
                      <th className="w-44 pb-3 font-medium">Percentage</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">What it means</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => {
                      const p = pct(s.attended, s.total);
                      const g = guidance(s.attended, s.total, minRequired);
                      const low = !g.ok;
                      return (
                        <tr key={s.name} className="border-b border-slate-100 last:border-0">
                          <td className="py-3.5 pr-3 font-medium">{s.name}</td>
                          <td className="py-3.5 text-center">{s.attended}</td>
                          <td className="py-3.5 text-center">{s.total}</td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${low ? "bg-[#8b0f1f]" : "bg-[#16285a]"}`}
                                  style={{ width: `${p}%` }}
                                />
                              </div>
                              <span className={`w-10 text-right font-semibold ${low ? "text-[#8b0f1f]" : ""}`}>
                                {p}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                low ? "bg-red-50 text-[#8b0f1f]" : "bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              {low ? "Shortage" : "Safe"}
                            </span>
                          </td>
                          <td className="py-3.5 text-xs text-slate-600">
                            {low
                              ? `Attend the next ${g.count} classes`
                              : `Can miss ${g.count} more`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Calendar + day detail */}
          <Card title="Attendance calendar">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
              {/* Calendar */}
              <div className="md:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => moveMonth(-1)}
                    disabled={!canGoPrev}
                    aria-label="Previous month"
                    className="rounded-lg p-2 text-[#16285a] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <p className="font-semibold text-[#16285a]">{monthLabel(month)}</p>
                  <button
                    onClick={() => moveMonth(1)}
                    disabled={!canGoNext}
                    aria-label="Next month"
                    className="rounded-lg p-2 text-[#16285a] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-500">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="pb-1">
                      {d}
                    </div>
                  ))}
                  {cells.map((day, i) => {
                    if (day === null) return <div key={`b${i}`} />;
                    const date = new Date(month.getFullYear(), month.getMonth(), day);
                    const key = keyOf(date);
                    const status = dayStatus(key, date);
                    const isSelected = key === selected;
                    const isToday = key === keyOf(today);
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(key)}
                        disabled={status === "none"}
                        aria-label={`${date.toDateString()}, ${status === "none" ? "no record" : status}`}
                        aria-pressed={isSelected}
                        className={`relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-shadow ${DAY_STYLE[status]} ${
                          isSelected ? "ring-2 ring-[#c9971c] ring-offset-2" : ""
                        } ${status === "none" ? "cursor-default" : "hover:shadow-md"}`}
                      >
                        {day}
                        {isToday && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                  {[
                    ["bg-[#16285a]", "All lectures attended"],
                    ["bg-[#f5b800]", "Some lectures missed"],
                    ["bg-[#8b0f1f]", "Absent all day"],
                    ["bg-slate-200", "Holiday / Sunday"],
                  ].map(([c, t]) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded ${c}`} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Day detail */}
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-[#16285a]">
                  {selectedDate.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="mt-3 space-y-2.5">
                  {selectedRecords.length > 0 ? (
                    selectedRecords.map((r) => {
                      const present = r.status === "Present";
                      return (
                        <div
                          key={r.subject + r.time}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              present ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-[#8b0f1f]"
                            }`}
                          >
                            {present ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{r.subject}</p>
                            <p className="text-xs text-slate-500">{r.time}</p>
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              present ? "text-emerald-700" : "text-[#8b0f1f]"
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      {selectedIsHoliday
                        ? "No lectures - this was a holiday."
                        : "No lectures were recorded for this day."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ---------------- Right column ---------------- */}
        <div className="space-y-6">
          <Card title="Monthly attendance">
            {monthly.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing to show yet.</p>
            ) : (
              <ul className="space-y-4">
                {monthly.map((m) => {
                  const p = pct(m.attended, m.total);
                  const low = p < minRequired;
                  return (
                    <li key={m.key}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">{m.label}</span>
                        <span className={low ? "font-semibold text-[#8b0f1f]" : "text-slate-600"}>
                          {m.attended}/{m.total} · {p}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${low ? "bg-[#8b0f1f]" : "bg-[#c9971c]"}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Subjects needing attention">
            {(() => {
              const low = subjects.filter((s) => !guidance(s.attended, s.total, minRequired).ok);
              if (low.length === 0) {
                return (
                  <p className="flex items-start gap-2.5 text-sm text-emerald-800">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                    Every subject is above {minRequired}%. Keep it up.
                  </p>
                );
              }
              return (
                <ul className="space-y-3">
                  {low.map((s) => {
                    const g = guidance(s.attended, s.total, minRequired);
                    return (
                      <li key={s.name} className="flex gap-3 rounded-xl bg-red-50 p-3.5">
                        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#8b0f1f]" />
                        <div>
                          <p className="text-sm font-semibold text-[#8b0f1f]">{s.name}</p>
                          <p className="mt-0.5 text-xs text-slate-700">
                            At {pct(s.attended, s.total)}%. Attend the next {g.count} classes
                            without a break to reach {minRequired}%.
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </Card>

          <Card title="Good to know">
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2.5">
                <CalendarCheck size={17} className="mt-0.5 shrink-0 text-[#8b0f1f]" />
                Attendance is updated by your teachers after each lecture.
              </li>
              <li className="flex gap-2.5">
                <CalendarCheck size={17} className="mt-0.5 shrink-0 text-[#8b0f1f]" />
                If a record looks wrong, tell your class teacher within 7 days.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Card wrapper ----------------------------- */
function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2
        className="mb-5 text-lg font-bold text-[#16285a]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Server connection: GET /attendance/my-records (one row per lecture).
   present -> "Present", absent -> "Absent". A lecture marked "leave" is left out, so it counts neither way.
---------------------------------------------------------------------------- */
async function apiLoadAttendance() {
  const to12h = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const rows = await fetchAttendanceRecords({ limit: 500 });
  return (rows ?? [])
    .filter((r) => r.status === "present" || r.status === "absent")
    .map((r) => ({
      date: r.lectureDate,
      subject: r.subject?.name || r.subject?.code || "Lecture",
      time: to12h(r.startTime) || `Period ${r.period}`,
      status: r.status === "present" ? "Present" : "Absent",
    }));
}

export default function StudentAttendance() {
  const { data, loading, error, reload } = useApiData(apiLoadAttendance);
  if (loading || error) {
    return (
      <div className="p-6">
        <UiCard>
          {loading ? <UiLoader label="Loading attendance..." /> : <UiErrorState title="Could not load this page" description={error.message} onRetry={reload} />}
        </UiCard>
      </div>
    );
  }

  return <StudentAttendanceView records={data} holidays={[]} />;
}
