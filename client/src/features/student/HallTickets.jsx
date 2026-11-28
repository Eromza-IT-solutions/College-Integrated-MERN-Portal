import { useEffect, useMemo, useState } from "react";
import UiCard from "../../components/ui/Card";
import UiErrorState from "../../components/ui/ErrorState";
import UiLoader from "../../components/ui/Loader";
import { useApiData } from "../../hooks/useApiData";
import { downloadHallTicketPdf, fetchHallTickets, fetchStudentOverview } from "../../services/studentApi";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  CircleX,
  Download,
  Loader2,
  Lock,
  MapPin,
  Printer,
  Ticket,
} from "lucide-react";

/*
  Content area only - render it inside your student layout (next to the sidebar).

  Props (same shapes as the sample data below):
    student:    { name, rollNo, enrollNo, course, semester, photo }
    sessions:   list of exam sessions. status is "available" | "upcoming" | "past".
                Each has exams[], eligibility checks[] and, for upcoming ones, a releaseDate.
    onDownload: (sessionId) => Promise      - download the PDF from your backend
    onNavigate: (key) => void               - e.g. "examinations/fill-form" (same keys as the sidebar)

  The QR code is a decorative placeholder. Swap <FakeQR /> for a real one
  (for example the `qrcode.react` package) that encodes your verification URL.
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const at = (days, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const sampleStudent = {
  name: "Ayesha Imran Khan",
  rollNo: "CS2023-045",
  enrollNo: "ENR2023004521",
  course: "B.Sc. Computer Science",
  semester: "Semester 5",
  photo: "",
};

const sampleSessions = [
  {
    id: "s5-regular",
    title: "Semester 5 Regular Exam",
    period: "Nov - Dec 2026",
    status: "available",
    ticketNo: "HT-2026-0521",
    seatNo: "A-1045",
    center: "Abeda Inamdar Senior College, Main Building",
    exams: [
      { subject: "Data Structures", date: at(9, 10), minutes: 180, hall: "Hall A" },
      { subject: "Database Management", date: at(12, 10), minutes: 180, hall: "Hall B" },
      { subject: "Operating Systems", date: at(15, 14), minutes: 180, hall: "Hall A" },
      { subject: "Computer Networks", date: at(18, 10), minutes: 180, hall: "Hall C" },
    ],
    checks: [
      { label: "Exam form submitted", ok: true, detail: "Submitted successfully" },
      { label: "Exam fees paid", ok: true, detail: "Payment received" },
      { label: "Attendance at 75% or more", ok: true, detail: "82% overall" },
      { label: "Documents verified", ok: true, detail: "All documents verified" },
    ],
  },
  {
    id: "s4-backlog",
    title: "Semester 4 Backlog Exam",
    period: "Jan 2027",
    status: "upcoming",
    releaseDate: at(30, 10),
    checks: [
      {
        label: "Exam form submitted",
        ok: false,
        detail: "You have not filled the form for this exam yet",
        actionLabel: "Fill exam form",
        actionTo: "examinations/fill-form",
      },
      { label: "Exam fees paid", ok: true, detail: "No dues" },
      { label: "Attendance at 75% or more", ok: true, detail: "82% overall" },
      { label: "Documents verified", ok: true, detail: "All documents verified" },
    ],
  },
  {
    id: "s4-regular",
    title: "Semester 4 Regular Exam",
    period: "Apr - May 2026",
    status: "past",
    ticketNo: "HT-2026-0198",
    seatNo: "B-0872",
    center: "Abeda Inamdar Senior College, Main Building",
    exams: [
      { subject: "Software Engineering", date: at(-200, 10), minutes: 180, hall: "Hall B" },
      { subject: "Computer Organization", date: at(-197, 10), minutes: 180, hall: "Hall B" },
      { subject: "Discrete Mathematics", date: at(-194, 14), minutes: 180, hall: "Hall A" },
    ],
    checks: [],
  },
];

const PREP_ITEMS = [
  "Printed hall ticket",
  "College ID card",
  "Blue or black pens",
  "Reach the centre 30 minutes early",
  "Phones switched off and left outside",
  "Know your hall and seat number",
];

/* ------------------------------- HELPERS -------------------------------- */
const fmtDate = (d, o = { weekday: "short", day: "numeric", month: "short" }) =>
  d.toLocaleDateString("en-IN", o);
const fmtTime = (d) =>
  d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
const endOf = (e) => new Date(e.date.getTime() + e.minutes * 60000);

const BADGE = {
  available: "bg-emerald-50 text-emerald-800",
  upcoming: "bg-[#f5b800]/25 text-[#7a5a00]",
  past: "bg-slate-100 text-slate-600",
};
const BADGE_LABEL = { available: "Available", upcoming: "Coming soon", past: "Completed" };

/* ------------------------------ COMPONENT ------------------------------- */
function StudentHallTicketsView({
  student = sampleStudent,
  sessions = sampleSessions,
  logo = "/logo.png",
  onDownload = () => new Promise((r) => setTimeout(r, 1200)),
  onNavigate = () => {},
}) {
  const [selectedId, setSelectedId] = useState(
    () => (sessions.find((s) => s.status === "available") ?? sessions[0])?.id
  );
  const session = sessions.find((s) => s.id === selectedId);

  const [dl, setDl] = useState("idle"); // idle | loading | done | error
  const [ready, setReady] = useState({}); // { [sessionId]: Set of ticked prep items }

  useEffect(() => {
    if (dl !== "done") return;
    const t = setTimeout(() => setDl("idle"), 3500);
    return () => clearTimeout(t);
  }, [dl]);

  if (!session) {
    return (
      <div className="p-8 text-sm text-slate-600" style={{ fontFamily: "'Poppins', sans-serif" }}>
        No exam sessions found.
      </div>
    );
  }

  const failed = session.checks.filter((c) => !c.ok);
  const state =
    session.status === "past" ? "past" : session.status === "upcoming" ? "upcoming" : failed.length ? "blocked" : "ready";

  const nextExam = session.exams?.find((e) => e.date.getTime() > Date.now());
  const ticked = ready[session.id] ?? new Set();

  const toggleItem = (item) =>
    setReady((prev) => {
      const next = new Set(prev[session.id] ?? []);
      next.has(item) ? next.delete(item) : next.add(item);
      return { ...prev, [session.id]: next };
    });

  const pick = (id) => {
    setSelectedId(id);
    setDl("idle");
  };

  const download = async () => {
    setDl("loading");
    try {
      await onDownload(session.id);
      setDl("done");
    } catch {
      setDl("error");
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ------------------------- Session picker ------------------------- */}
      <section aria-label="Exam sessions" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {sessions.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => pick(s.id)}
              aria-pressed={active}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a] ${
                active
                  ? "border-[#16285a] ring-2 ring-[#16285a]/20"
                  : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active ? "bg-[#16285a] text-[#f5b800]" : "bg-[#16285a]/10 text-[#16285a]"
                  }`}
                >
                  <Ticket size={20} strokeWidth={1.8} />
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[s.status]}`}>
                  {BADGE_LABEL[s.status]}
                </span>
              </div>
              <p className="mt-3 font-semibold leading-snug text-[#16285a]">{s.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.period}</p>
            </button>
          );
        })}
      </section>

      {/* ----------------------------- Hero banner ----------------------------- */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#16285a] to-[#0b1536] px-6 py-7 text-white shadow-lg md:px-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#f5b800]/15" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-52 w-52 rounded-full border-[20px] border-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {state === "ready" && nextExam && (
            <>
              <HeroText
                kicker="Your next exam"
                title={nextExam.subject}
                sub={`${fmtDate(nextExam.date, { weekday: "long", day: "numeric", month: "long" })} · ${fmtTime(nextExam.date)} · ${nextExam.hall}`}
              />
              <Countdown target={nextExam.date} doneLabel="The exam has started" />
            </>
          )}
          {state === "ready" && !nextExam && (
            <HeroText kicker="All done" title="Your exams are over" sub="You can still download your hall ticket for your records." />
          )}
          {state === "blocked" && (
            <HeroText
              icon={Lock}
              kicker="Hall ticket on hold"
              title={`${failed.length} ${failed.length === 1 ? "thing needs" : "things need"} your attention`}
              sub="Clear the items below and your hall ticket unlocks straight away."
            />
          )}
          {state === "upcoming" && (
            <>
              <HeroText
                kicker="Hall tickets not released yet"
                title={`Releases on ${fmtDate(session.releaseDate, { day: "numeric", month: "long", year: "numeric" })}`}
                sub="Make sure everything on the checklist is complete before then."
              />
              <Countdown target={session.releaseDate} doneLabel="Released - refresh the page" />
            </>
          )}
          {state === "past" && (
            <HeroText
              kicker="Completed"
              title={session.title}
              sub="This exam is over. Your hall ticket is kept here for your records."
            />
          )}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ---------------------------- Left column ---------------------------- */}
        <div className="space-y-6 xl:col-span-2">
          {state !== "upcoming" && (
            <div className="relative">
              <div className={state === "blocked" ? "pointer-events-none select-none blur-[6px]" : ""} aria-hidden={state === "blocked"}>
                <HallTicketCard student={student} session={session} logo={logo} muted={state === "past"} />
              </div>
              {state === "blocked" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/60 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8b0f1f] text-white shadow-lg">
                    <Lock size={26} />
                  </span>
                  <p className="px-6 font-semibold text-[#16285a]">Locked until your checklist is complete</p>
                </div>
              )}
            </div>
          )}

          {(state === "ready" || state === "past") && (
            <Card title="Exam schedule">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Hall</th>
                      <th className="pb-3 text-right font-medium">Seat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.exams.map((e) => {
                      const isNext = nextExam && e === nextExam && state === "ready";
                      return (
                        <tr
                          key={e.subject}
                          className={`border-b border-slate-100 last:border-0 ${isNext ? "bg-[#f5b800]/10" : ""}`}
                        >
                          <td className="py-3.5 pl-2 pr-3 font-medium">{fmtDate(e.date)}</td>
                          <td className="py-3.5 pr-3">
                            {e.subject}
                            {isNext && (
                              <span className="ml-2 rounded-full bg-[#f5b800] px-2.5 py-0.5 text-[11px] font-semibold text-[#16285a]">
                                Next
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-3">
                            {fmtTime(e.date)} - {fmtTime(endOf(e))}
                          </td>
                          <td className="py-3.5 pr-3">{e.hall}</td>
                          <td className="py-3.5 pr-2 text-right font-semibold text-[#16285a]">{session.seatNo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {state === "upcoming" && (
            <Card title="What happens next">
              <ol className="space-y-4 text-sm text-slate-600">
                {[
                  "Complete every item on the eligibility checklist.",
                  `Your hall ticket appears here on ${fmtDate(session.releaseDate, { day: "numeric", month: "long" })}.`,
                  "Download and print it, then carry it to every exam.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#16285a] text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* ---------------------------- Right column ---------------------------- */}
        <div className="space-y-6">
          {(state === "ready" || state === "past") && (
            <Card title="Get your hall ticket">
              <button
                onClick={download}
                disabled={dl === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b0f1f] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a31326] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b0f1f]"
              >
                {dl === "loading" ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Preparing your PDF
                  </>
                ) : dl === "done" ? (
                  <>
                    <Check size={17} />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Download PDF
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium transition-colors hover:bg-slate-50"
              >
                <Printer size={17} />
                Print
              </button>
              <p role="status" className="mt-3 min-h-5 text-xs">
                {dl === "error" ? (
                  <span className="flex items-center gap-1.5 text-[#8b0f1f]">
                    <AlertCircle size={14} />
                    The download failed. Please try again.
                  </span>
                ) : (
                  <span className="text-slate-500">Print it on A4 paper. A phone screenshot is not accepted.</span>
                )}
              </p>
            </Card>
          )}

          {session.checks.length > 0 && (
            <Card title="Eligibility checklist">
              <p className="-mt-2 mb-4 text-xs text-slate-500">
                {session.checks.filter((c) => c.ok).length} of {session.checks.length} requirements met
              </p>
              <ul className="space-y-3">
                {session.checks.map((c) => (
                  <li
                    key={c.label}
                    className={`rounded-xl border p-3.5 ${
                      c.ok ? "border-slate-200" : "border-[#8b0f1f]/30 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {c.ok ? (
                        <CircleCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleX size={20} className="mt-0.5 shrink-0 text-[#8b0f1f]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className={`mt-0.5 text-xs ${c.ok ? "text-slate-500" : "text-[#8b0f1f]"}`}>{c.detail}</p>
                        {!c.ok && c.actionTo && (
                          <button
                            onClick={() => onNavigate(c.actionTo)}
                            className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#8b0f1f] hover:underline"
                          >
                            {c.actionLabel}
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {state === "ready" && (
            <Card title="Before you leave home">
              <div className="-mt-2 mb-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {ticked.size} of {PREP_ITEMS.length} ready
                  </span>
                  {ticked.size === PREP_ITEMS.length && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <BadgeCheck size={14} />
                      You're all set
                    </span>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#c9971c] transition-all duration-300"
                    style={{ width: `${(ticked.size / PREP_ITEMS.length) * 100}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-2">
                {PREP_ITEMS.map((item) => {
                  const on = ticked.has(item);
                  return (
                    <li key={item}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                          on ? "border-[#16285a]/30 bg-[#16285a]/5" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleItem(item)}
                          className="h-4 w-4 accent-[#16285a]"
                        />
                        <span className={on ? "text-slate-500 line-through" : ""}>{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Hero pieces ------------------------------ */
function HeroText({ icon: Icon, kicker, title, sub }) {
  return (
    <div className="flex items-start gap-4">
      {Icon && (
        <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f5b800]">
          <Icon size={24} />
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-[#f5b800]">{kicker}</p>
        <h2
          className="mt-1 text-[26px] font-bold leading-tight md:text-[30px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-slate-300">{sub}</p>
      </div>
    </div>
  );
}

function Countdown({ target, doneLabel }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = target.getTime() - now;
  if (diff <= 0) {
    return <p className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold">{doneLabel}</p>;
  }
  const s = Math.floor(diff / 1000);
  const parts = [
    ["Days", Math.floor(s / 86400)],
    ["Hours", Math.floor((s % 86400) / 3600)],
    ["Minutes", Math.floor((s % 3600) / 60)],
    ["Seconds", s % 60],
  ];
  return (
    <div className="flex gap-2.5" role="timer" aria-label="Time remaining">
      {parts.map(([label, value]) => (
        <div key={label} className="w-[72px] rounded-2xl bg-white/10 py-3 text-center sm:w-20">
          <p
            className="text-[28px] font-bold leading-none tabular-nums text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {String(value).padStart(2, "0")}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-300">{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ The ticket ------------------------------ */
function HallTicketCard({ student, session, logo, muted }) {
  const initials = student.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const details = [
    ["Candidate name", student.name],
    ["Roll number", student.rollNo],
    ["Enrollment number", student.enrollNo],
    ["Course", `${student.course}, ${student.semester}`],
    ["Seat number", session.seatNo],
    ["Exam centre", session.center],
  ];

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md md:flex-row ${
        muted ? "opacity-90 saturate-75" : ""
      }`}
    >
      {/* Main part */}
      <div className="flex-1">
        <div className="flex items-center gap-4 bg-gradient-to-r from-[#16285a] to-[#0b1536] px-6 py-5 text-white">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-[3px] border-[#c9971c] bg-white">
            <img src={logo} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          </div>
          <div className="min-w-0">
            <p
              className="text-lg font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Abeda Inamdar <span className="text-[#f5b800]">Senior College</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-300">{session.title} · {session.period}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3
              className="text-xl font-bold text-[#16285a]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Hall ticket
            </h3>
            <span className="rounded-full bg-[#16285a]/10 px-3 py-1 text-xs font-semibold text-[#16285a]">
              No. {session.ticketNo}
            </span>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-5 sm:flex-row sm:items-start">
            <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className={label === "Exam centre" || label === "Course" ? "sm:col-span-2" : ""}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 flex items-start gap-1.5 text-sm font-semibold">
                    {label === "Exam centre" && <MapPin size={15} className="mt-0.5 shrink-0 text-[#8b0f1f]" />}
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex h-32 w-28 shrink-0 items-center justify-center self-start overflow-hidden rounded-xl border-2 border-[#c9971c]/60 bg-slate-50 text-3xl font-bold text-[#16285a]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {student.photo ? <img src={student.photo} alt={`${student.name}'s photo`} className="h-full w-full object-cover" /> : initials}
            </div>
          </div>
        </div>
      </div>

      {/* Tear-off stub */}
      <div className="relative flex shrink-0 flex-row items-center justify-center gap-5 border-t-2 border-dashed border-slate-300 bg-slate-50 p-6 md:w-56 md:flex-col md:border-l-2 md:border-t-0">
        <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-slate-50 md:-left-3 md:-top-3" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50 md:-bottom-3 md:-left-3 md:right-auto md:top-auto" />
        <FakeQR value={`${session.ticketNo}-${student.rollNo}`} />
        <div className="text-left md:text-center">
          <p className="text-sm font-semibold text-[#16285a]">Scan to verify</p>
          <p className="mt-0.5 text-xs text-slate-500">The invigilator will scan this at the hall door.</p>
        </div>
      </div>
    </div>
  );
}

/* Decorative QR-style pattern (placeholder). Replace with a real QR component. */
function FakeQR({ value, size = 120 }) {
  const n = 21;
  const cells = useMemo(() => {
    let h = 0;
    for (const c of value) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 4294967296;
    };
    const out = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const tl = x < 7 && y < 7;
        const tr = x >= n - 7 && y < 7;
        const bl = x < 7 && y >= n - 7;
        if (tl || tr || bl) {
          const lx = tr ? x - (n - 7) : x;
          const ly = bl ? y - (n - 7) : y;
          const dark =
            lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
          if (dark) out.push([x, y]);
        } else if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)) {
          continue; // quiet zone around finder patterns
        } else if (rnd() > 0.5) {
          out.push([x, y]);
        }
      }
    }
    return out;
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Verification QR code"
      className="shrink-0 rounded-lg bg-white p-2 shadow-sm"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#16285a" />
      ))}
    </svg>
  );
}

/* ----------------------------- Card wrapper ----------------------------- */
function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2
        className="mb-5 flex items-center gap-2 text-lg font-bold text-[#16285a]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Server connection: GET /exam-forms/hall-tickets/me.
   issued -> "available" (or "past" once every paper is over); pending / blocked -> "upcoming" with the reason.
---------------------------------------------------------------------------- */
async function apiLoadHallTickets() {
  const atTime = (date, hhmm) => {
    const d = new Date(date);
    if (hhmm) {
      const [h, m] = hhmm.split(":").map(Number);
      d.setHours(h, m || 0, 0, 0);
    }
    return d;
  };
  const minutesBetween = (start, end) => {
    if (!start || !end) return 180;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(30, eh * 60 + em - (sh * 60 + sm));
  };
  const toSession = (ticket) => {
    const exams = (ticket.schedule ?? [])
      .filter((s) => s.date)
      .map((s) => ({
        subject: s.name || s.code || "Subject",
        date: atTime(s.date, s.startTime),
        minutes: minutesBetween(s.startTime, s.endTime),
        hall: s.room || ticket.room || "To be announced",
      }))
      .sort((a, b) => a.date - b.date);
    const over = exams.length > 0 && exams.every((e) => e.date.getTime() + e.minutes * 60000 < Date.now());
    const status = ticket.status === "issued" ? (over ? "past" : "available") : "upcoming";
    const session = {
      id: ticket._id,
      title: ticket.examName || `Semester ${ticket.semester} exam`,
      period: exams.length ? exams[0].date.toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "",
      status,
      checks: [],
    };
    if (status === "upcoming") {
      session.checks = [{
        label: ticket.status === "blocked" ? "Hall ticket on hold" : "Hall ticket not issued yet",
        ok: false,
        detail: ticket.blockedReason || "The exam office will release it before the exams.",
      }];
    } else {
      session.ticketNo = `HT-${String(ticket._id).slice(-6).toUpperCase()}`;
      session.seatNo = ticket.seatNumber || "";
      session.center = "Abeda Inamdar Senior College";
      session.exams = exams;
    }
    return session;
  };

  const [tickets, me] = await Promise.all([fetchHallTickets(), fetchStudentOverview().catch(() => null)]);
  const first = (tickets ?? [])[0];
  const student = {
    name: first?.fullName || me?.fullName || me?.user?.fullName || "Student",
    rollNo: me?.enrollmentNumber || first?.enrollmentNumber || "",
    enrollNo: me?.enrollmentNumber || first?.enrollmentNumber || "",
    course: first?.programName || me?.program?.name || "",
    semester: `Semester ${me?.currentSemester ?? first?.semester ?? ""}`.trim(),
    photo: "",
  };
  return { student, tickets: tickets ?? [], sessions: (tickets ?? []).map(toSession) };
}

export default function StudentHallTickets() {
  const { data, loading, error, reload } = useApiData(apiLoadHallTickets);
  if (loading || error) {
    return (
      <div className="p-6">
        <UiCard>
          {loading ? <UiLoader label="Loading hall tickets..." /> : <UiErrorState title="Could not load this page" description={error.message} onRetry={reload} />}
        </UiCard>
      </div>
    );
  }

  if (!data.sessions.length) {
    return (
      <div className="p-6">
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hall ticket yet. It appears here after your exam form is approved and the exam office issues it.
        </p>
      </div>
    );
  }
  const download = (sessionId) => downloadHallTicketPdf(data.tickets.find((t) => t._id === sessionId));
  return <StudentHallTicketsView student={data.student} sessions={data.sessions} onDownload={download} />;
}
