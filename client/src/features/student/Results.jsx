import { useEffect, useMemo, useState } from "react";
import UiCard from "../../components/ui/Card";
import UiErrorState from "../../components/ui/ErrorState";
import UiLoader from "../../components/ui/Loader";
import { useApiData } from "../../hooks/useApiData";
import { downloadResultPdf } from "../../services/marksService";
import { fetchResults } from "../../services/studentApi";
import {
  ArrowDownUp,
  ArrowRight,
  BadgeCheck,
  Check,
  Download,
  Hourglass,
  Loader2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

/*
  Content area only - render it inside your student layout (next to the sidebar).

  You only pass raw marks. SGPA, CGPA, grades, percentage, result status and every
  chart are calculated from them (10-point grading, defined in GRADES below).

  Props:
    semesters:  [{ id, name, held, declaredOn, subjects: [{ code, name, credits, internal, external,
                  internalMax?, externalMax? }] }]   - an empty `subjects` list means "result awaited"
    onDownload: (semesterId) => Promise    - download the marksheet PDF from your backend
    onNavigate: (key) => void              - same keys as the sidebar, e.g. "hall-tickets"
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const sub = (code, name, internal, external, credits = 4) => ({ code, name, internal, external, credits });

const sampleSemesters = [
  {
    id: "sem1",
    name: "Semester 1",
    held: "Nov 2024",
    declaredOn: "20 January 2025",
    subjects: [
      sub("CS101", "Programming in C", 34, 48),
      sub("MA101", "Mathematics I", 30, 41),
      sub("EL101", "Digital Electronics", 33, 45),
      sub("EN101", "Communication Skills", 36, 52, 2),
      sub("CS102", "C Programming Lab", 38, 55, 2),
    ],
  },
  {
    id: "sem2",
    name: "Semester 2",
    held: "Apr 2025",
    declaredOn: "18 June 2025",
    subjects: [
      sub("CS201", "Object Oriented Programming", 35, 50),
      sub("MA201", "Mathematics II", 28, 38),
      sub("CS202", "Data Communication", 32, 44),
      sub("EV201", "Environmental Studies", 37, 49, 2),
      sub("CS203", "C++ Lab", 39, 56, 2),
    ],
  },
  {
    id: "sem3",
    name: "Semester 3",
    held: "Nov 2025",
    declaredOn: "15 January 2026",
    subjects: [
      sub("CS301", "Java Programming", 36, 51),
      sub("ST301", "Statistics", 33, 47),
      sub("CS302", "Web Design", 38, 54),
      sub("CS303", "Linux Administration", 35, 49),
      sub("CS304", "Java Lab", 39, 57, 2),
    ],
  },
  {
    id: "sem4",
    name: "Semester 4",
    held: "Apr 2026",
    declaredOn: "12 June 2026",
    subjects: [
      sub("CS401", "Software Engineering", 31, 46),
      sub("CS402", "Computer Organization", 34, 44),
      sub("CS403", "Discrete Mathematics", 22, 12),
      sub("CS404", "Python Programming", 37, 53),
      sub("CS405", "Python Lab", 39, 57, 2),
    ],
  },
  {
    id: "sem5",
    name: "Semester 5",
    held: "Nov - Dec 2026",
    note: "Results are usually declared within 45 days of the last exam.",
    subjects: [],
  },
];

/* ------------------------------- GRADING -------------------------------- */
const GRADES = [
  { g: "O", min: 90, pts: 10, label: "Outstanding" },
  { g: "A+", min: 80, pts: 9, label: "Excellent" },
  { g: "A", min: 70, pts: 8, label: "Very good" },
  { g: "B+", min: 60, pts: 7, label: "Good" },
  { g: "B", min: 50, pts: 6, label: "Above average" },
  { g: "C", min: 40, pts: 5, label: "Average" },
  { g: "F", min: 0, pts: 0, label: "Fail" },
];
const gradeOf = (pct) => GRADES.find((x) => pct >= x.min);

const GRADE_STYLE = {
  O: "bg-[#16285a] text-white",
  "A+": "bg-[#16285a] text-white",
  A: "bg-[#16285a]/10 text-[#16285a]",
  "B+": "bg-[#16285a]/10 text-[#16285a]",
  B: "bg-[#f5b800]/25 text-[#7a5a00]",
  C: "bg-[#f5b800]/25 text-[#7a5a00]",
  F: "bg-[#8b0f1f] text-white",
};

function compute(sem) {
  const rows = sem.subjects.map((s) => {
    const iMax = s.internalMax ?? 40;
    const eMax = s.externalMax ?? 60;
    const total = s.internal + s.external;
    const max = iMax + eMax;
    const pct = (total / max) * 100;
    const grade = gradeOf(pct);
    return { ...s, iMax, eMax, total, max, pct, grade: grade.g, points: grade.pts, passed: grade.g !== "F" };
  });
  const credits = rows.reduce((a, r) => a + r.credits, 0);
  const weighted = rows.reduce((a, r) => a + r.points * r.credits, 0);
  const totalMarks = rows.reduce((a, r) => a + r.total, 0);
  const maxMarks = rows.reduce((a, r) => a + r.max, 0);
  const failed = rows.filter((r) => !r.passed);
  const pct = maxMarks ? (totalMarks / maxMarks) * 100 : 0;
  return {
    rows,
    credits,
    weighted,
    totalMarks,
    maxMarks,
    failed,
    pct,
    sgpa: credits ? weighted / credits : 0,
    earned: rows.filter((r) => r.passed).reduce((a, r) => a + r.credits, 0),
    status: failed.length ? "ATKT" : "Pass",
    division:
      pct >= 75 ? "Distinction" : pct >= 60 ? "First class" : pct >= 50 ? "Second class" : "Pass class",
  };
}

/* ------------------------------- HOOKS --------------------------------- */
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Numbers that count up when `key` changes (e.g. switching semester)
function useCountUp(target, key, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setV(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, key, duration]);
  return v;
}

// Flips false -> true shortly after `key` changes, so bars/rings can grow in
function useGrow(key) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    let r2;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [key]);
  return grown;
}

/* ------------------------------ COMPONENT ------------------------------- */
function StudentResultsView({
  semesters = sampleSemesters,
  onDownload = () => new Promise((r) => setTimeout(r, 1200)),
  onNavigate = () => {},
}) {
  /* Per-semester numbers + running CGPA */
  const data = useMemo(() => {
    let credits = 0;
    let weighted = 0;
    return semesters.map((s, i) => {
      const c = compute(s);
      const declared = s.subjects.length > 0;
      if (declared) {
        credits += c.credits;
        weighted += c.weighted;
      }
      return { ...s, ...c, declared, cgpa: credits ? weighted / credits : 0, index: i };
    });
  }, [semesters]);

  const lastDeclared = [...data].reverse().find((s) => s.declared) ?? data[0];
  const [selectedId, setSelectedId] = useState(lastDeclared?.id);
  const sem = data.find((s) => s.id === selectedId) ?? data[0];
  const prevDeclared = [...data.slice(0, sem.index)].reverse().find((s) => s.declared);
  const delta = sem.declared && prevDeclared ? sem.sgpa - prevDeclared.sgpa : null;

  const [sort, setSort] = useState("default"); // default | marks
  const [dl, setDl] = useState("idle"); // idle | loading | done | error
  const grown = useGrow(sem.id);

  const sgpaShown = useCountUp(sem.sgpa, sem.id);
  const cgpaShown = useCountUp(sem.cgpa, sem.id);
  const pctShown = useCountUp(sem.pct, sem.id);

  useEffect(() => {
    if (dl !== "done") return;
    const t = setTimeout(() => setDl("idle"), 3500);
    return () => clearTimeout(t);
  }, [dl]);

  const pick = (id) => {
    setSelectedId(id);
    setDl("idle");
  };

  const download = async () => {
    setDl("loading");
    try {
      await onDownload(sem.id);
      setDl("done");
    } catch {
      setDl("error");
    }
  };

  const rows = sort === "marks" ? [...sem.rows].sort((a, b) => b.pct - a.pct) : sem.rows;
  const gradeCounts = GRADES.map((g) => ({ ...g, count: sem.rows.filter((r) => r.grade === g.g).length })).filter(
    (g) => g.count > 0
  );

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ------------------------- Semester picker ------------------------- */}
      <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Choose a semester">
        {data.map((s) => {
          const active = s.id === sem.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => pick(s.id)}
              className={`min-w-[132px] shrink-0 rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a] ${
                active
                  ? "border-[#16285a] bg-[#16285a] text-white shadow-md"
                  : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <p className={`text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{s.name}</p>
              {s.declared ? (
                <p
                  className={`mt-1 text-2xl font-bold leading-none ${active ? "text-[#f5b800]" : "text-[#16285a]"}`}
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {s.sgpa.toFixed(2)}
                </p>
              ) : (
                <p className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${active ? "text-[#f5b800]" : "text-slate-500"}`}>
                  <Hourglass size={14} />
                  Awaited
                </p>
              )}
              <p className={`mt-1 text-[11px] ${active ? "text-slate-300" : "text-slate-400"}`}>{s.held}</p>
            </button>
          );
        })}
      </div>

      {/* ----------------------------- Hero banner ----------------------------- */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#16285a] to-[#0b1536] px-6 py-7 text-white shadow-lg md:px-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#f5b800]/15" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-52 w-52 rounded-full border-[20px] border-white/5" />

        {sem.declared ? (
          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    sem.status === "Pass" ? "bg-[#f5b800] text-[#16285a]" : "bg-[#8b0f1f] text-white"
                  }`}
                >
                  {sem.status === "Pass" ? <BadgeCheck size={14} /> : <TriangleAlert size={14} />}
                  {sem.status === "Pass" ? "Passed" : "ATKT - backlog to clear"}
                </span>
                <span className="text-sm text-slate-300">
                  {sem.name} · {sem.held} · Declared {sem.declaredOn}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile label="SGPA this semester" value={sgpaShown.toFixed(2)}>
                  {delta !== null && (
                    <p
                      className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                        delta >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(2)} vs {prevDeclared.name}
                    </p>
                  )}
                </Tile>
                <Tile label="CGPA so far" value={cgpaShown.toFixed(2)}>
                  <p className="mt-1.5 text-xs text-slate-300">Out of 10.00</p>
                </Tile>
                <Tile label="Credits earned" value={`${sem.earned}/${sem.credits}`}>
                  <p className="mt-1.5 text-xs text-slate-300">
                    {sem.earned === sem.credits ? "All credits secured" : "Clear the backlog to earn the rest"}
                  </p>
                </Tile>
              </div>
            </div>

            <Ring pct={sem.pct} shown={pctShown} grown={grown} label={sem.status === "Pass" ? sem.division : "Overall"} />
          </div>
        ) : (
          <div className="relative flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f5b800]">
              <Hourglass size={26} />
            </span>
            <div>
              <p className="text-sm font-medium text-[#f5b800]">Result awaited</p>
              <h2
                className="mt-1 text-[26px] font-bold leading-tight md:text-[30px]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {sem.name} results are not out yet
              </h2>
              <p className="mt-1.5 text-sm text-slate-300">
                Exams: {sem.held}. {sem.note}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ---------------------- Backlog alert ---------------------- */}
      {sem.declared && sem.failed.length > 0 && (
        <div role="alert" className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#8b0f1f]/30 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm text-slate-800">
            <TriangleAlert size={20} className="mt-0.5 shrink-0 text-[#8b0f1f]" />
            <span>
              <span className="font-semibold text-[#8b0f1f]">
                {sem.failed.length} {sem.failed.length === 1 ? "subject" : "subjects"} to clear:
              </span>{" "}
              {sem.failed.map((f) => f.name).join(", ")}. You can appear in the backlog exam.
            </span>
          </p>
          <button
            onClick={() => onNavigate("examinations/fill-form")}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#8b0f1f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a31326]"
          >
            Fill exam form
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ---------------------------- Left column ---------------------------- */}
        <div className="space-y-6 xl:col-span-2">
          {sem.declared ? (
            <Card
              title="Subject-wise marks"
              action={
                <button
                  onClick={() => setSort((s) => (s === "default" ? "marks" : "default"))}
                  aria-pressed={sort === "marks"}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    sort === "marks"
                      ? "border-[#16285a] bg-[#16285a] text-white"
                      : "border-slate-300 text-[#16285a] hover:bg-slate-50"
                  }`}
                >
                  <ArrowDownUp size={14} />
                  {sort === "marks" ? "Highest first" : "Sort by marks"}
                </button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 text-center font-medium">Credits</th>
                      <th className="pb-3 text-center font-medium">Internal</th>
                      <th className="pb-3 text-center font-medium">External</th>
                      <th className="pb-3 text-center font-medium">Total</th>
                      <th className="pb-3 text-center font-medium">Grade</th>
                      <th className="pb-3 text-right font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.code}
                        className={`border-b border-slate-100 last:border-0 ${r.passed ? "" : "bg-red-50"}`}
                      >
                        <td className="py-3.5 pl-2 pr-3">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-slate-500">{r.code}</p>
                        </td>
                        <td className="py-3.5 text-center">{r.credits}</td>
                        <td className="py-3.5 text-center">
                          {r.internal}
                          <span className="text-slate-400">/{r.iMax}</span>
                        </td>
                        <td className="py-3.5 text-center">
                          {r.external}
                          <span className="text-slate-400">/{r.eMax}</span>
                        </td>
                        <td className="py-3.5 text-center font-semibold">
                          {r.total}
                          <span className="font-normal text-slate-400">/{r.max}</span>
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`inline-block min-w-9 rounded-lg px-2.5 py-1 text-xs font-bold ${GRADE_STYLE[r.grade]}`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className={`py-3.5 pr-2 text-right text-xs font-semibold ${r.passed ? "text-emerald-700" : "text-[#8b0f1f]"}`}>
                          {r.passed ? "Passed" : "Failed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-[#16285a]">
                      <td className="rounded-bl-xl py-3.5 pl-2">Semester total</td>
                      <td className="py-3.5 text-center">{sem.credits}</td>
                      <td colSpan={2} className="py-3.5 text-center">
                        {sem.pct.toFixed(1)}%
                      </td>
                      <td className="py-3.5 text-center">
                        {sem.totalMarks}
                        <span className="font-normal text-slate-500">/{sem.maxMarks}</span>
                      </td>
                      <td className="py-3.5 text-center">{sem.sgpa.toFixed(2)}</td>
                      <td className="rounded-br-xl py-3.5 pr-2 text-right">SGPA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ) : (
            <Card title="While you wait">
              <p className="text-sm text-slate-600">
                Your marks will appear here as soon as the college declares the result. Meanwhile:
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ["Check your hall ticket", "hall-tickets"],
                  ["See the timetable", "timetable"],
                ].map(([label, to]) => (
                  <button
                    key={to}
                    onClick={() => onNavigate(to)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-medium text-[#16285a] transition-colors hover:border-[#16285a] hover:bg-[#16285a] hover:text-white"
                  >
                    {label}
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card title="Your progress, semester by semester">
            <TrendChart items={data} selectedIndex={sem.index} onSelect={(i) => pick(data[i].id)} grown={grown} />
          </Card>
        </div>

        {/* ---------------------------- Right column ---------------------------- */}
        <div className="space-y-6">
          {sem.declared && (
            <Card title="Marksheet">
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
                    Download {sem.name} marksheet
                  </>
                )}
              </button>
              <p role="status" className="mt-3 min-h-5 text-xs">
                {dl === "error" ? (
                  <span className="text-[#8b0f1f]">The download failed. Please try again.</span>
                ) : (
                  <span className="text-slate-500">This copy is for information. The college issues the original.</span>
                )}
              </p>
            </Card>
          )}

          {sem.declared && (
            <Card title="How each subject went">
              <ul className="space-y-4">
                {[...sem.rows]
                  .sort((a, b) => b.pct - a.pct)
                  .map((r, i) => (
                    <li key={r.code}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{r.name}</span>
                        <span className={`shrink-0 font-semibold ${r.passed ? "text-slate-700" : "text-[#8b0f1f]"}`}>
                          {Math.round(r.pct)}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                            !r.passed ? "bg-[#8b0f1f]" : r.pct >= 60 ? "bg-[#16285a]" : "bg-[#c9971c]"
                          }`}
                          style={{ width: grown ? `${r.pct}%` : "0%", transitionDelay: `${i * 70}ms` }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {sem.declared && (
            <Card title="Grades earned">
              <ul className="space-y-3">
                {gradeCounts.map((g) => (
                  <li key={g.g} className="flex items-center gap-3">
                    <span className={`w-10 shrink-0 rounded-lg py-1 text-center text-xs font-bold ${GRADE_STYLE[g.g]}`}>
                      {g.g}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#16285a]/70 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={{ width: grown ? `${(g.count / sem.rows.length) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-slate-600">
                      {g.count} {g.count === 1 ? "subject" : "subjects"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Grading scale">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2 font-medium">Marks</th>
                  <th className="pb-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g, i) => (
                  <tr key={g.g} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <span className={`inline-block min-w-9 rounded-md px-2 py-0.5 text-center text-xs font-bold ${GRADE_STYLE[g.g]}`}>
                        {g.g}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">
                      {g.g === "F" ? "Below 40" : i === 0 ? "90 and above" : `${g.min} - ${GRADES[i - 1].min - 1}`}
                    </td>
                    <td className="py-2 text-right font-medium">{g.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">SGPA = sum of (grade points × credits) ÷ total credits.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Hero pieces ------------------------------ */
function Tile({ label, value, children }) {
  return (
    <div className="rounded-2xl bg-white/10 px-5 py-4">
      <p className="text-xs text-slate-300">{label}</p>
      <p
        className="mt-1 text-[34px] font-bold leading-none tabular-nums"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

function Ring({ pct, shown, grown, label }) {
  const r = 58;
  const C = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={`Overall percentage ${pct.toFixed(1)}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="11" />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#f5b800"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={grown ? C * (1 - pct / 100) : C}
            className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className="text-[34px] font-bold leading-none tabular-nums"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {shown.toFixed(1)}
            <span className="text-lg">%</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-300">Overall</p>
        </div>
      </div>
      <p className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-[#f5b800]">{label}</p>
    </div>
  );
}

/* ------------------------------ Trend chart ------------------------------ */
function TrendChart({ items, selectedIndex, onSelect, grown }) {
  const [hover, setHover] = useState(null);
  const W = 620;
  const H = 260;
  const pad = { l: 38, r: 24, t: 20, b: 36 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const declared = items.filter((i) => i.declared);
  if (declared.length === 0) {
    return <p className="text-sm text-slate-500">Your progress chart will appear once a result is declared.</p>;
  }

  const values = declared.flatMap((d) => [d.sgpa, d.cgpa]);
  const yMin = Math.max(0, Math.floor(Math.min(...values)) - 1);
  const yMax = 10;
  const x = (i) => pad.l + (items.length === 1 ? plotW / 2 : (i * plotW) / (items.length - 1));
  const y = (v) => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const ticks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
  const line = (key) => declared.map((d, i) => `${i === 0 ? "M" : "L"}${x(d.index)},${y(d[key])}`).join(" ");

  const tip = hover !== null ? items[hover] : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="SGPA and CGPA by semester">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t === yMin ? "" : "3 4"} />
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {t}
            </text>
          </g>
        ))}

        {items.map((it, i) => (
          <text
            key={it.id}
            x={x(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight={i === selectedIndex ? 700 : 400}
            fill={i === selectedIndex ? "#16285a" : "#64748b"}
          >
            Sem {i + 1}
          </text>
        ))}

        {/* Lines draw in when the semester changes */}
        {["cgpa", "sgpa"].map((k) => (
          <path
            key={k}
            d={line(k)}
            fill="none"
            stroke={k === "sgpa" ? "#16285a" : "#c9971c"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={grown ? 0 : 1}
            className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
        ))}

        {declared.map((d) => {
          const sel = d.index === selectedIndex;
          return (
            <g
              key={d.id}
              tabIndex={0}
              role="button"
              aria-label={`${d.name}: SGPA ${d.sgpa.toFixed(2)}, CGPA ${d.cgpa.toFixed(2)}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHover(d.index)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.index)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect(d.index)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(d.index))}
            >
              <circle cx={x(d.index)} cy={y(d.cgpa)} r="5" fill="#fff" stroke="#c9971c" strokeWidth="2.5" />
              {sel && <circle cx={x(d.index)} cy={y(d.sgpa)} r="11" fill="#f5b800" opacity="0.35" />}
              <circle cx={x(d.index)} cy={y(d.sgpa)} r={sel ? 6.5 : 5} fill="#16285a" stroke="#fff" strokeWidth="2" />
              {/* larger invisible hit area */}
              <circle cx={x(d.index)} cy={y(d.sgpa)} r="16" fill="transparent" />
            </g>
          );
        })}

        {tip && tip.declared && (
          <g transform={`translate(${Math.min(x(tip.index) - 62, W - pad.r - 124)}, ${Math.max(y(Math.max(tip.sgpa, tip.cgpa)) - 62, 2)})`} pointerEvents="none">
            <rect width="124" height="48" rx="10" fill="#0b1536" />
            <text x="12" y="19" fontSize="11" fontWeight="600" fill="#f5b800">
              {tip.name}
            </text>
            <text x="12" y="37" fontSize="11" fill="#fff">
              SGPA {tip.sgpa.toFixed(2)} · CGPA {tip.cgpa.toFixed(2)}
            </text>
          </g>
        )}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
        <li className="flex items-center gap-2">
          <span className="h-1 w-5 rounded bg-[#16285a]" />
          SGPA (each semester)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1 w-5 rounded bg-[#c9971c]" />
          CGPA (running total)
        </li>
        <li className="text-slate-500">Select a point to open that semester.</li>
      </ul>
    </div>
  );
}

/* ----------------------------- Card wrapper ----------------------------- */
function Card({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2
          className="text-lg font-bold text-[#16285a]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Server connection: GET /results (the server sends a student only their published results).
---------------------------------------------------------------------------- */
async function apiLoadResults() {
  const monthYear = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "");
  const longDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");
  const rows = await fetchResults();
  return (rows ?? [])
    .filter((r) => r.isPublished !== false)
    .sort((a, b) => (a.semester ?? 0) - (b.semester ?? 0) || String(a.publishedAt).localeCompare(String(b.publishedAt)))
    .map((r) => ({
      id: r._id,
      name: `Semester ${r.semester}`,
      held: monthYear(r.publishedAt),
      declaredOn: longDate(r.publishedAt),
      subjects: (r.lines ?? []).map((l) => ({
        code: l.code,
        name: l.name,
        credits: l.credits ?? 0,
        internal: l.internalMarks ?? 0,
        external: l.absent ? 0 : l.externalMarks ?? 0,
        internalMax: l.maxInternal,
        externalMax: l.maxExternal,
      })),
    }));
}

export default function StudentResults() {
  const { data, loading, error, reload } = useApiData(apiLoadResults);
  if (loading || error) {
    return (
      <div className="p-6">
        <UiCard>
          {loading ? <UiLoader label="Loading results..." /> : <UiErrorState title="Could not load this page" description={error.message} onRetry={reload} />}
        </UiCard>
      </div>
    );
  }

  return <StudentResultsView semesters={data} onDownload={(id) => downloadResultPdf(id)} />;
}
