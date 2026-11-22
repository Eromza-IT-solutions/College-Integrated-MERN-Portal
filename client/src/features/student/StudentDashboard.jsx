import {
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Wallet,
  Ticket,
  Award,
  FilePenLine,
  Megaphone,
  Clock,
  MapPin,
  ArrowRight,
} from "lucide-react";

/*
  Content area only - render it next to <Sidebar /> in your layout:

    <div className="flex">
      <Sidebar onNavigate={...} />
      <main className="flex-1 overflow-y-auto"><StudentDashboard onNavigate={...} /></main>
    </div>

  Everything below the "SAMPLE DATA" line is placeholder - replace with your API data
  (or pass your own `student`, `attendance`, `exams`, `classes`, `notices`, `fees` props).
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const sampleStudent = {
  name: "Ayesha Khan",
  course: "B.Sc. Computer Science",
  semester: "Semester 5",
  rollNo: "CS2023-045",
  cgpa: 8.4,
};

const sampleAttendance = [
  { subject: "Data Structures", attended: 38, total: 42 },
  { subject: "Database Management", attended: 34, total: 40 },
  { subject: "Operating Systems", attended: 29, total: 41 },
  { subject: "Web Technologies", attended: 36, total: 38 },
  { subject: "Computer Networks", attended: 31, total: 39 },
];

const sampleExams = [
  { subject: "Data Structures", date: daysFromNow(9), time: "10:00 AM", venue: "Hall A" },
  { subject: "Database Management", date: daysFromNow(12), time: "10:00 AM", venue: "Hall B" },
  { subject: "Operating Systems", date: daysFromNow(15), time: "2:00 PM", venue: "Hall A" },
];

const sampleClasses = [
  { time: "9:00 AM", subject: "Web Technologies", room: "Lab 2", teacher: "Prof. Sharma" },
  { time: "11:00 AM", subject: "Database Management", room: "Room 204", teacher: "Prof. Deshmukh" },
  { time: "1:30 PM", subject: "Computer Networks", room: "Room 110", teacher: "Prof. Patil" },
];

const sampleNotices = [
  { id: 1, title: "Semester 5 exam form submission closes soon", date: daysFromNow(-1), tag: "Exams" },
  { id: 2, title: "Hall tickets will be available one week before exams", date: daysFromNow(-3), tag: "Hall Tickets" },
  { id: 3, title: "Annual college day rehearsal schedule released", date: daysFromNow(-5), tag: "General" },
  { id: 4, title: "Library will remain closed on Saturday", date: daysFromNow(-6), tag: "General" },
];

const sampleFees = { total: 42500, paid: 30000 };

/* ------------------------------- HELPERS -------------------------------- */
const fmtDate = (d, opts = { day: "numeric", month: "short" }) =>
  new Date(d).toLocaleDateString("en-IN", opts);

const daysLeft = (d) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
};

const money = (n) => "₹" + n.toLocaleString("en-IN");

const pct = (a, t) => Math.round((a / t) * 100);

/* ------------------------------ COMPONENT ------------------------------- */
export default function StudentDashboard({
  student = sampleStudent,
  attendance = sampleAttendance,
  exams = sampleExams,
  classes = sampleClasses,
  notices = sampleNotices,
  fees = sampleFees,
  onNavigate = () => {},
}) {
  const totalAttended = attendance.reduce((s, a) => s + a.attended, 0);
  const totalClasses = attendance.reduce((s, a) => s + a.total, 0);
  const overall = pct(totalAttended, totalClasses);
  const pending = fees.total - fees.paid;
  const nextExam = exams[0];

  const stats = [
    {
      label: "Overall attendance",
      value: `${overall}%`,
      note: overall >= 75 ? "Above the 75% requirement" : "Below the 75% requirement",
      icon: ClipboardCheck,
      warn: overall < 75,
    },
    {
      label: "Current CGPA",
      value: student.cgpa.toFixed(1),
      note: "Out of 10",
      icon: Award,
    },
    {
      label: "Pending fees",
      value: money(pending),
      note: pending > 0 ? "Pay before the due date" : "All fees cleared",
      icon: Wallet,
      warn: pending > 0,
    },
    {
      label: "Next exam",
      value: nextExam ? `${daysLeft(nextExam.date)} days` : "-",
      note: nextExam ? nextExam.subject : "No exams scheduled",
      icon: GraduationCap,
    },
  ];

  const quickActions = [
    { label: "Fill admission form", icon: FilePenLine, to: "admission/fill-form" },
    { label: "Hall tickets", icon: Ticket, to: "hall-tickets" },
    { label: "Pay pending fee", icon: Wallet, to: "payments/pay-pending-fee" },
    { label: "View results", icon: Award, to: "results" },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ------------------------------ Welcome banner ------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16285a] to-[#0b1536] px-6 py-7 text-white shadow-lg md:px-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#f5b800]/15" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full border-[20px] border-white/5" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-[#c9971c] bg-white text-2xl font-bold text-[#16285a]"
              style={{ fontFamily: "'Playfair Display', serif" }}
              aria-hidden="true"
            >
              {student.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <p className="text-sm text-slate-300">Welcome back,</p>
              <h1
                className="text-[28px] font-bold leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {student.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {student.course} · {student.semester} · Roll no. {student.rollNo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl bg-white/10 px-4 py-2.5 text-sm md:self-center">
            <CalendarDays size={18} className="text-[#f5b800]" />
            {fmtDate(new Date(), {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------- Stat cards -------------------------------- */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, warn }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
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
              className="mt-3 text-3xl font-bold text-[#16285a]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {value}
            </p>
            <p className={`mt-1 text-xs ${warn ? "font-medium text-[#8b0f1f]" : "text-slate-500"}`}>
              {note}
            </p>
          </div>
        ))}
      </section>

      {/* ------------------------------ Main grid (2 / 1) ------------------------------ */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ---------------- Left column ---------------- */}
        <div className="space-y-6 xl:col-span-2">
          {/* Attendance by subject */}
          <Card
            title="Attendance by subject"
            action="View details"
            onAction={() => onNavigate("attendance")}
          >
            <ul className="space-y-4">
              {attendance.map((a) => {
                const p = pct(a.attended, a.total);
                const low = p < 75;
                return (
                  <li key={a.subject}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{a.subject}</span>
                      <span className={low ? "font-semibold text-[#8b0f1f]" : "text-slate-600"}>
                        {a.attended}/{a.total} classes · {p}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${low ? "bg-[#8b0f1f]" : "bg-[#16285a]"}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Upcoming exams */}
          <Card
            title="Upcoming exams"
            action="Full timetable"
            onAction={() => onNavigate("timetable")}
          >
            {exams.length === 0 ? (
              <p className="text-sm text-slate-500">No exams are scheduled right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Venue</th>
                      <th className="pb-3 text-right font-medium">Starts in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((e) => (
                      <tr key={e.subject} className="border-b border-slate-100 last:border-0">
                        <td className="py-3.5 font-medium">{e.subject}</td>
                        <td className="py-3.5">{fmtDate(e.date)}</td>
                        <td className="py-3.5">{e.time}</td>
                        <td className="py-3.5">{e.venue}</td>
                        <td className="py-3.5 text-right">
                          <span className="rounded-full bg-[#f5b800]/20 px-3 py-1 text-xs font-semibold text-[#7a5a00]">
                            {daysLeft(e.date)} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Today's classes */}
          <Card title="Today's classes">
            {classes.length === 0 ? (
              <p className="text-sm text-slate-500">No classes scheduled today.</p>
            ) : (
              <ul className="space-y-3">
                {classes.map((c) => (
                  <li
                    key={c.time}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex w-24 shrink-0 items-center gap-1.5 text-sm font-semibold text-[#16285a]">
                      <Clock size={15} />
                      {c.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.subject}</p>
                      <p className="text-xs text-slate-500">{c.teacher}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={14} />
                      {c.room}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ---------------- Right column ---------------- */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card title="Quick actions">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(({ label, icon: Icon, to }) => (
                <button
                  key={to}
                  onClick={() => onNavigate(to)}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 p-4 text-left text-sm font-medium transition-colors hover:border-[#16285a] hover:bg-[#16285a] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a]"
                >
                  <Icon size={22} strokeWidth={1.8} className="text-[#8b0f1f] group-hover:text-[#f5b800]" />
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {/* Fee summary */}
          <Card
            title="Fee summary"
            action="Pay now"
            onAction={() => onNavigate("payments/pay-pending-fee")}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-500">Paid so far</p>
                <p
                  className="text-2xl font-bold text-[#16285a]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {money(fees.paid)}
                </p>
              </div>
              <p className="text-sm text-slate-500">of {money(fees.total)}</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#c9971c]"
                style={{ width: `${pct(fees.paid, fees.total)}%` }}
              />
            </div>
            <p className="mt-3 text-sm">
              {pending > 0 ? (
                <>
                  <span className="font-semibold text-[#8b0f1f]">{money(pending)}</span> still pending
                </>
              ) : (
                <span className="font-semibold text-emerald-700">All fees are paid</span>
              )}
            </p>
          </Card>

          {/* Notices */}
          <Card title="Latest notices" action="All notices" onAction={() => onNavigate("notices")}>
            <ul className="divide-y divide-slate-100">
              {notices.map((n) => (
                <li key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#16285a]/10 text-[#16285a]">
                    <Megaphone size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {n.tag} · {fmtDate(n.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Card wrapper ----------------------------- */
function Card({ title, action, onAction, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2
          className="text-lg font-bold text-[#16285a]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        {action && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-sm font-medium text-[#8b0f1f] hover:underline"
          >
            {action}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}