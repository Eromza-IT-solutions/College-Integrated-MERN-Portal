import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Routes — same paths as TEACHER_MENU in TeacherSidebar.jsx           */
/* ------------------------------------------------------------------ */
export const ROUTES = {
  dashboard: "/teacher", profile: "/teacher/profile", classes: "/teacher/classes", students: "/teacher/students",
  attMark: "/teacher/attendance/mark", attReport: "/teacher/attendance/report", defaulters: "/teacher/attendance/defaulters",
  timetable: "/teacher/timetable", marks: "/teacher/examinations/internal-marks", duty: "/teacher/examinations/duty",
  papers: "/teacher/examinations/question-papers", results: "/teacher/examinations/results",
  material: "/teacher/material/upload", assignments: "/teacher/material/assignments",
  leaveApply: "/teacher/leave/apply", leaveStatus: "/teacher/leave/status", notices: "/teacher/notices", password: "/teacher/change-password",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export const MIN_ATT = 75; // minimum attendance % required
export const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const parse = (s) => (s instanceof Date ? s : new Date(s.length <= 10 ? `${s}T00:00:00` : s));
export const fmt = (s, o = { day: "numeric", month: "short", year: "numeric" }) => parse(s).toLocaleDateString("en-IN", o);
export const daysLeft = (s, now) => Math.ceil((parse(s) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
export const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const t12 = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
export const initials = (n) => n.replace(/^(Dr\.|Prof\.)\s*/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const readFile = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res({ name: file.name, size: Math.round(file.size / 1024), url: r.result });
  r.onerror = rej;
  r.readAsDataURL(file);
});

/* ------------------------------------------------------------------ */
/* SAMPLE DATA — replace with your API data (or pass as props).        */
/* ------------------------------------------------------------------ */
export const DEFAULT_TEACHER = {
  name: "Prof. Sana Shaikh", role: "Teacher", designation: "Assistant Professor", department: "Computer Science", empId: "AISC-T-0142",
  qualification: "M.Sc. (Computer Science), SET", experience: "9 years", email: "sana.shaikh@example.com", phone: "9822001234",
  address: "Camp, Pune 411001", joined: "2017-07-03", photo: null,
};

export const CLASSES = [
  { id: "c1", group: "ty", name: "T.Y.B.Sc. (CS)", sem: 5, subject: "Data Structures", code: "CS501", div: "A", room: "Room 204" },
  { id: "c2", group: "ty", name: "T.Y.B.Sc. (CS)", sem: 5, subject: "Database Management", code: "CS502", div: "A", room: "Room 204" },
  { id: "c3", group: "sy", name: "S.Y.B.Sc. (CS)", sem: 3, subject: "Operating Systems", code: "CS303", div: "A", room: "Lab 2" },
  { id: "c4", group: "fy", name: "F.Y.B.C.A. (Sci)", sem: 1, subject: "Programming in C", code: "BCA101", div: "B", room: "Room 110" },
];
export const classLabel = (c) => `${c.name} · ${c.subject}`;

const FIRST = ["Ayesha", "Zoya", "Sana", "Fatima", "Rehan", "Aman", "Imran", "Nikhil", "Priya", "Rohit", "Neha", "Kunal", "Mariam", "Omar", "Sneha", "Arjun"];
const LAST = ["Khan", "Shaikh", "Pathan", "Sayyed", "Patil", "Joshi", "More", "Kulkarni", "Deshmukh", "Ansari"];
function makeStudents(group, n, prefix, seed) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const first = FIRST[(i * 5 + seed) % FIRST.length], last = LAST[(i * 3 + seed) % LAST.length];
    return {
      id: `${group}-${i + 1}`, roll: `${prefix}${String(i * 3 + 11).padStart(3, "0")}`, name: `${first} ${last}`,
      mobile: `9${Math.floor(r() * 1e9).toString().padStart(9, "0")}`, email: `${first}.${last}@example.com`.toLowerCase(), propensity: 0.55 + r() * 0.43,
    };
  });
}
const STUDENTS = { ty: makeStudents("ty", 14, "CS2023-", 3), sy: makeStudents("sy", 12, "CS2024-", 5), fy: makeStudents("fy", 10, "BCA2025-", 7) };
export const studentsOf = (classId) => STUDENTS[CLASSES.find((c) => c.id === classId)?.group] || [];

export const TIMETABLE = [
  { day: 1, start: "09:00", end: "10:00", classId: "c1" }, { day: 1, start: "11:00", end: "12:00", classId: "c3" }, { day: 1, start: "14:00", end: "15:00", classId: "c2" },
  { day: 2, start: "10:00", end: "11:00", classId: "c2" }, { day: 2, start: "12:00", end: "13:00", classId: "c4" },
  { day: 3, start: "09:00", end: "10:00", classId: "c1" }, { day: 3, start: "11:00", end: "12:00", classId: "c3" },
  { day: 4, start: "10:00", end: "11:00", classId: "c2" }, { day: 4, start: "13:00", end: "14:00", classId: "c4" },
  { day: 5, start: "09:00", end: "10:00", classId: "c1" }, { day: 5, start: "11:00", end: "12:00", classId: "c3" }, { day: 5, start: "14:00", end: "15:00", classId: "c2" },
  { day: 6, start: "10:00", end: "11:00", classId: "c4" },
];
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function studentStats(att, classId, studentId) {
  let p = 0, a = 0, l = 0;
  Object.values(att[classId] || {}).forEach((d) => { const s = d[studentId]; if (s === "P") p++; else if (s === "A") a++; else if (s === "L") l++; });
  const total = p + a + l;
  const pct = total ? Math.round(((p + l) / total) * 1000) / 10 : 0; // approved leave counts as present
  const need = pct >= MIN_ATT ? 0 : Math.ceil((MIN_ATT / 100 * total - (p + l)) / (1 - MIN_ATT / 100));
  return { p, a, l, total, pct, need };
}

function seedAttendance() {
  const out = {};
  CLASSES.forEach((c, ci) => {
    out[c.id] = {};
    const dates = [];
    for (let d = new Date(); dates.length < 20; d.setDate(d.getDate() - 1)) {
      if (d.getDay() !== 0 && iso(d) !== iso(new Date())) dates.push(iso(d));
    }
    dates.reverse().forEach((date, di) => {
      out[c.id][date] = {};
      studentsOf(c.id).forEach((s, si) => {
        const r = rng(ci * 1000 + si * 37 + di * 7 + 1)();
        out[c.id][date][s.id] = r < s.propensity ? "P" : r < s.propensity + (1 - s.propensity) * 0.2 ? "L" : "A";
      });
    });
  });
  return out;
}

const GRADES = [[80, "O"], [70, "A+"], [60, "A"], [50, "B+"], [45, "B"], [40, "C"], [0, "F"]];
export const gradeOf = (m) => GRADES.find(([min]) => m >= min)[1];
export function buildResults(classId) {
  const c = CLASSES.find((x) => x.id === classId);
  if (!c || c.id === "c4") return { published: false, exam: "Semester 1 · Nov/Dec 2026", rows: [] };
  const r = rng(classId.charCodeAt(1) * 99);
  const rows = studentsOf(classId).map((s) => { const m = Math.round(26 + r() * 70); return { student: s, marks: m, grade: gradeOf(m), pass: m >= 40 }; });
  return { published: true, exam: c.sem === 5 ? "Semester 4 · Apr/May 2026" : "Semester 2 · Apr/May 2026", rows };
}

export const LEAVE_TYPES = [
  { id: "casual", label: "Casual Leave", total: 12 }, { id: "medical", label: "Medical Leave", total: 10 },
  { id: "earned", label: "Earned Leave", total: 30 }, { id: "duty", label: "Duty / Academic Leave", total: 15 },
];
export const COLLEAGUES = ["Prof. Imran Pathan", "Dr. Neha Kulkarni", "Prof. Rohit Deshmukh", "Not required"];

const DEFAULT_LEAVES = [
  { id: "LV-1041", type: "casual", from: "2026-09-04", to: "2026-09-05", days: 2, reason: "Family function", status: "Approved", appliedOn: "2026-08-30", remark: "Approved by Principal" },
  { id: "LV-1088", type: "medical", from: "2026-10-12", to: "2026-10-13", days: 2, reason: "Fever and rest advised by doctor", status: "Approved", appliedOn: "2026-10-12", remark: "Approved by Principal" },
  { id: "LV-1102", type: "duty", from: "2026-11-02", to: "2026-11-02", days: 1, reason: "Syllabus workshop at the university", status: "Approved", appliedOn: "2026-10-28", remark: "Approved by Principal" },
  { id: "LV-1135", type: "casual", from: "2026-11-27", to: "2026-11-27", days: 1, reason: "Personal work", status: "Pending", appliedOn: "2026-11-20", remark: "" },
  { id: "LV-0977", type: "earned", from: "2026-08-17", to: "2026-08-21", days: 5, reason: "Family trip", status: "Rejected", appliedOn: "2026-08-05", remark: "Rejected — internal exams scheduled that week" },
];

const DEFAULT_DUTIES = [
  { id: "x0", date: "2026-11-18", time: "10:00 AM – 1:00 PM", venue: "Room 110", subject: "Mock test · Programming in C", role: "Invigilator", ack: true },
  { id: "x1", date: "2026-11-30", time: "10:00 AM – 1:00 PM", venue: "Room 204", subject: "Data Structures · T.Y.B.Sc. (CS)", role: "Invigilator", ack: false },
  { id: "x2", date: "2026-12-02", time: "10:00 AM – 1:00 PM", venue: "Room 204", subject: "Database Management · T.Y.B.Sc. (CS)", role: "Invigilator", ack: false },
  { id: "x3", date: "2026-12-04", time: "10:00 AM – 1:00 PM", venue: "Lab 2", subject: "Operating Systems · T.Y.B.Sc. (CS)", role: "Squad member", ack: false },
  { id: "x4", date: "2026-12-09", time: "10:00 AM – 1:00 PM", venue: "Main hall", subject: "Computer Networks · T.Y.B.Sc. (CS)", role: "Block supervisor", ack: false },
];

const DEFAULT_PAPERS = [
  { id: "p1", classId: "c1", exam: "Semester End", set: "Set A", submittedOn: "2026-10-28", status: "Approved", file: { name: "CS501_QP_SetA.pdf", size: 212, url: "" }, remark: "Approved by BOS chairman" },
  { id: "p2", classId: "c3", exam: "Internal Test", set: "Set A", submittedOn: "2026-11-10", status: "Under review", file: { name: "CS303_Internal_SetA.pdf", size: 148, url: "" }, remark: "" },
];

const DEFAULT_NOTICES = [
  { id: "n1", title: "Semester end examination — invigilation duty chart", category: "Exam", date: "2026-11-20", pinned: true, from: "Examination Department", body: "The invigilation duty chart for the Semester End Examinations (30 Nov – 12 Dec) has been published. All teachers are requested to acknowledge their duty from the Exam Duty page and report 30 minutes before the start of each paper." },
  { id: "n2", title: "Submission of internal marks", category: "Exam", date: "2026-11-18", pinned: true, from: "Examination Department", body: "Internal marks for all semesters must be submitted through the portal on or before 5 December 2026. Marks once submitted cannot be edited." },
  { id: "n3", title: "Staff meeting on Friday", category: "Admin", date: "2026-11-17", pinned: false, from: "Principal's Office", body: "A staff meeting will be held on Friday at 3:30 PM in the conference room to discuss the academic calendar for the next semester." },
  { id: "n4", title: "NAAC data collection — action required", category: "Admin", date: "2026-11-12", pinned: false, from: "IQAC", body: "Departments are requested to upload the supporting documents for the AQAR before the end of the month. Contact the IQAC coordinator for the format." },
  { id: "n5", title: "Annual Gathering — volunteers needed", category: "Events", date: "2026-11-10", pinned: false, from: "Cultural Committee", body: "Faculty members who wish to volunteer for the Annual Gathering may give their names to the Cultural Committee by 28 November." },
  { id: "n6", title: "Holiday on account of Id-e-Milad", category: "Holiday", date: "2026-10-24", pinned: false, from: "Principal's Office", body: "The college will remain closed on the occasion of Id-e-Milad. Regular lectures resume the next working day." },
];

const DEFAULT_MATERIALS = [
  { id: "m1", classId: "c1", title: "Unit 3 — Trees and Graphs (notes)", type: "Notes", description: "Handwritten notes with solved examples.", date: "2026-11-14", file: { name: "DS_Unit3_Notes.pdf", size: 640, url: "" }, link: "" },
  { id: "m2", classId: "c2", title: "Normalisation — lecture slides", type: "Presentation", description: "1NF to BCNF with examples.", date: "2026-11-08", file: { name: "DBMS_Normalisation.pdf", size: 1180, url: "" }, link: "" },
  { id: "m3", classId: "c3", title: "Process scheduling — video lecture", type: "Video link", description: "Recorded session on CPU scheduling.", date: "2026-11-05", file: null, link: "https://example.com/os-scheduling" },
];

function seedAssignments() {
  const r = rng(77);
  const mk = (id, classId, title, instructions, due, max, ratio) => {
    const subs = {};
    studentsOf(classId).forEach((s) => { if (r() < ratio) subs[s.id] = { on: "2026-11-1" + Math.floor(r() * 9), marks: null }; });
    return { id, classId, title, instructions, due, max, created: "2026-11-05", subs };
  };
  return [
    mk("a1", "c1", "Implement a binary search tree", "Write a C program for insert, delete and traversal. Submit the source file with sample output.", "2026-11-24", 10, 0.85),
    mk("a2", "c2", "ER diagram for a library system", "Draw the ER diagram and convert it into relational tables up to 3NF.", "2026-11-12", 10, 0.9),
    mk("a3", "c3", "Round robin scheduling simulation", "Simulate round robin with time quantum 4 and compute average waiting time.", "2026-12-03", 10, 0.3),
  ];
}

/* ------------------------------------------------------------------ */
/* Shared state                                                        */
/* ------------------------------------------------------------------ */
const Ctx = createContext(null);
export const useTeacher = () => useContext(Ctx);

function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/**
 * Wrap the teacher layout route once so every page shares the same data:
 *   <Route path="/teacher" element={<TeacherProvider teacher={user}><TeacherLayout .../></TeacherProvider>}>
 * Pass `onSave` to send changes to your backend: onSave("attendance", { classId, date, record }) etc.
 */
export function TeacherProvider({ children, teacher: initial = DEFAULT_TEACHER, onSave }) {
  const [teacher, setTeacher] = useState(initial);
  const [attendance, setAttendance] = useState(seedAttendance);
  const [marks, setMarks] = useState(() => {
    const m = { c1: {} };
    studentsOf("c1").slice(0, 6).forEach((s, i) => { m.c1[s.id] = { test: String(12 + (i % 8)), assign: String(6 + (i % 4)), seminar: String(7 + (i % 3)) }; });
    return m;
  });
  const [marksLocked, setMarksLocked] = useState({});
  const [leaves, setLeaves] = useState(DEFAULT_LEAVES);
  const [duties, setDuties] = useState(DEFAULT_DUTIES);
  const [papers, setPapers] = useState(DEFAULT_PAPERS);
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [assignments, setAssignments] = useState(seedAssignments);
  const [notices] = useState(DEFAULT_NOTICES);
  const [readNotices, setReadNotices] = useState(() => new Set(["n3", "n4", "n5", "n6"]));
  const [reminded, setReminded] = useState({});
  const now = useNow();
  const save = (what, payload) => onSave?.(what, payload);

  const value = useMemo(() => ({
    teacher, setTeacher, attendance, marks, setMarks, marksLocked, leaves, duties, papers, materials, assignments, notices, readNotices, reminded, now, save,
    saveAttendance: (classId, date, record) => { setAttendance((a) => ({ ...a, [classId]: { ...a[classId], [date]: record } })); save("attendance", { classId, date, record }); },
    lockMarks: (classId) => { setMarksLocked((l) => ({ ...l, [classId]: true })); save("marks", { classId, marks: marks[classId] }); },
    addLeave: (l) => { setLeaves((x) => [l, ...x]); save("leave", l); },
    cancelLeave: (id) => setLeaves((x) => x.filter((l) => l.id !== id)),
    ackDuty: (id) => { setDuties((d) => d.map((x) => (x.id === id ? { ...x, ack: true } : x))); save("dutyAck", { id }); },
    addPaper: (p) => { setPapers((x) => [p, ...x]); save("paper", p); },
    removePaper: (id) => setPapers((x) => x.filter((p) => p.id !== id)),
    addMaterial: (m) => { setMaterials((x) => [m, ...x]); save("material", m); },
    removeMaterial: (id) => setMaterials((x) => x.filter((m) => m.id !== id)),
    addAssignment: (a) => { setAssignments((x) => [a, ...x]); save("assignment", a); },
    gradeAssignment: (aid, sid, mk) => setAssignments((x) => x.map((a) => (a.id === aid ? { ...a, subs: { ...a.subs, [sid]: { ...a.subs[sid], marks: mk } } } : a))),
    markRead: (id) => setReadNotices((s) => new Set(s).add(id)),
    markAllRead: () => setReadNotices(new Set(notices.map((n) => n.id))),
    remind: (key) => setReminded((r) => ({ ...r, [key]: true })),
  // eslint-disable-next-line
  }), [teacher, attendance, marks, marksLocked, leaves, duties, papers, materials, assignments, notices, readNotices, reminded, now]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */
export const Card = ({ title, action, children, className = "" }) => (
  <section className={"card " + className}>
    {(title || action) && <header className="card-h">{title && <h3>{title}</h3>}{action}</header>}
    {children}
  </section>
);
export const Pill = ({ tone = "gray", children }) => <span className={"pill " + tone}>{children}</span>;
export const Stat = ({ label, value, sub, tone = "", icon: Icon }) => (
  <div className={"stat " + tone}>
    <div className="stat-top"><span>{label}</span>{Icon && <i><Icon size={16} /></i>}</div>
    <b>{value}</b><small>{sub}</small>
  </div>
);
export function Notice({ tone = "info", children, onClose }) {
  const Icon = tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div className={"notice " + tone} role={tone === "ok" ? "status" : "alert"}>
      <Icon size={18} /><div>{children}</div>
      {onClose && <button type="button" aria-label="Dismiss" onClick={onClose}><X size={15} /></button>}
    </div>
  );
}
export const Empty = ({ icon: Icon, children }) => (
  <div className="empty">{Icon && <Icon size={30} />}<p>{children}</p></div>
);
export const Bar = ({ pct, tone }) => (
  <div className={"bar" + (tone ? " " + tone : "")}><div style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
);
export const Avatar = ({ name }) => <span className="av">{initials(name)}</span>;

export function ClassPicker({ value, onChange, classes = CLASSES }) {
  return (
    <div className="chips" role="tablist" aria-label="Select class">
      {classes.map((c) => (
        <button key={c.id} type="button" role="tab" aria-selected={value === c.id} className={value === c.id ? "on" : ""} onClick={() => onChange(c.id)}>
          <b>{c.subject}</b><small>{c.name} · Sem {c.sem}</small>
        </button>
      ))}
    </div>
  );
}

/** Banner + styles used by every teacher page (the sidebar/topbar come from TeacherLayout). */
export function PageShell({ title, section = "Teacher", chip, children }) {
  const { teacher } = useTeacher();
  return (
    <div className="tp">
      <style>{css}</style>
      <section className="hero">
        <div className="hero-id">
          <span className="avatar">{teacher.photo ? <img src={teacher.photo} alt="" /> : initials(teacher.name)}</span>
          <div>
            <small>{section}</small>
            <h1>{title}</h1>
            <p>{teacher.name} · {teacher.designation}, {teacher.department}</p>
          </div>
        </div>
        {chip && <div className="hero-chip">{chip}</div>}
        <span className="ring r1" aria-hidden="true" /><span className="ring r2" aria-hidden="true" />
      </section>
      <div className="view">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles — same navy / crimson / gold theme as the student module     */
/* ------------------------------------------------------------------ */
const css = `
.tp{--navy:#0f1d57;--navy2:#16276e;--crimson:#9b1230;--gold:#e3b82b;--ink:#1b2250;--mut:#6b7392;--line:#e6e9f5;--bg:#f6f7fc;--green:#14753f;
  padding:28px 32px 48px;min-height:100%;color:var(--ink)}
.tp *{box-sizing:border-box}
.tp button,.tp input,.tp select,.tp textarea{font-family:inherit}
.tp button:focus-visible,.tp input:focus-visible,.tp select:focus-visible,.tp textarea:focus-visible,.tp a:focus-visible{outline:3px solid var(--gold);outline-offset:2px}

.hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:28px 34px;border-radius:20px;color:#fff;
  background:linear-gradient(110deg,#0c1747 0%,#14246b 60%,#1a2c7c 100%);box-shadow:0 14px 30px rgba(15,29,87,.22)}
.hero-id{display:flex;gap:18px;align-items:center;position:relative;z-index:1}
.avatar{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:#fff;color:var(--navy);border:3px solid var(--gold);font:700 21px 'Playfair Display',serif;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover}
.hero small{font-size:12.5px;color:#c8d0f5;letter-spacing:.03em}
.hero h1{margin:2px 0 4px;font:700 27px/1.2 'Playfair Display',serif}
.hero p{margin:0;font-size:13px;color:#d6dcf8}
.hero-chip{position:relative;z-index:1;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:13px;color:var(--gold)}
.ring{position:absolute;border-radius:50%;border:26px solid rgba(255,255,255,.05);pointer-events:none}
.r1{width:260px;height:260px;right:-50px;top:-120px}.r2{width:180px;height:180px;right:200px;bottom:-110px;border-color:rgba(227,184,43,.12)}

.view{margin-top:22px;display:grid;gap:20px;animation:rise .3s ease}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px 26px;box-shadow:0 2px 8px rgba(15,29,87,.04);min-width:0}
.card-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.card h3{margin:0;font:700 21px 'Playfair Display',serif;color:var(--navy)}
.card h4{margin:0 0 10px;font-size:14px;font-weight:600;color:var(--navy)}
.grid-2{display:grid;grid-template-columns:1.6fr 1fr;gap:20px;align-items:start}
.grid-eq{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.stack{display:grid;gap:20px;align-content:start}
.lead{margin:0 0 14px;font-size:13.5px;color:var(--mut);line-height:1.6}
.muted{color:var(--mut)}.sticky{position:sticky;top:12px}

.pill{display:inline-block;padding:3px 11px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}
.pill.gray{background:#eef0f8;color:var(--navy)}.pill.blue{background:#e4eaff;color:#233a9c}.pill.gold{background:#fff3cc;color:#7a5a00}
.pill.red{background:#fbe8ed;color:var(--crimson)}.pill.green{background:#e3f5ea;color:var(--green)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:0;border-radius:12px;cursor:pointer;text-decoration:none;
  background:linear-gradient(180deg,#b01836,var(--crimson));color:#fff;font-size:13.5px;font-weight:600;box-shadow:0 8px 18px rgba(155,18,48,.28);transition:transform .15s,box-shadow .15s}
.btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 22px rgba(155,18,48,.36)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy);box-shadow:none}
.btn.ghost:hover:not(:disabled){background:#eef0f8;box-shadow:none}
.btn.full{width:100%}.btns{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.mini{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:10px;border:1px solid var(--navy);background:#fff;color:var(--navy);font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}
.mini:hover:not(:disabled){background:var(--navy);color:#fff}.mini:disabled{opacity:.5;cursor:not-allowed}
.mini.danger{border-color:#c4162a;color:#c4162a}.mini.danger:hover:not(:disabled){background:#c4162a;color:#fff}

.notice{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:12px;font-size:13.5px;line-height:1.55}
.notice div{flex:1}.notice button{border:0;background:none;cursor:pointer;color:inherit;opacity:.7}
.notice.ok{background:#e8f6ee;color:var(--green);border:1px solid #c5e8d3}
.notice.warn,.notice.info{background:#fff6dc;color:#7a5a00;border:1px solid #f1dea0}
.notice.bad{background:#fdecef;color:#a3122a;border:1px solid #f3c4cc}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.stat{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;transition:transform .2s,box-shadow .2s}
.stat:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(15,29,87,.1)}
.stat-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--mut)}
.stat-top i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#eef0f8;color:var(--navy)}
.stat b{margin-top:8px;font:700 28px 'Playfair Display',serif;color:var(--navy)}.stat small{font-size:12px;color:var(--mut)}
.stat.good b{color:var(--green)}.stat.good i{background:#e3f5ea;color:var(--green)}
.stat.warn b{color:var(--crimson)}.stat.warn i{background:#fbe8ed;color:var(--crimson)}

.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{padding:9px 12px;text-align:left;font-size:12px;font-weight:500;color:var(--mut);border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:12px;border-bottom:1px solid #f0f2fa;vertical-align:middle}
tr:last-child td{border-bottom:0}tbody tr:hover td{background:#fafbfe}
td small{display:block;font-size:11.5px;color:var(--mut)}td.r,th.r{text-align:right}td.c,th.c{text-align:center}
.av{width:34px;height:34px;border-radius:50%;display:inline-grid;place-items:center;background:#e4eaff;color:var(--navy);font:700 12px 'Poppins',sans-serif;flex-shrink:0}
.who{display:flex;align-items:center;gap:12px}.who b{font-weight:600}

.bar{height:8px;border-radius:99px;background:#e8ebf6;overflow:hidden;min-width:60px}
.bar div{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--navy2),#3b57c4);transition:width .5s cubic-bezier(.2,.8,.2,1)}
.bar.good div{background:linear-gradient(90deg,#14753f,#3fb673)}.bar.warn div{background:linear-gradient(90deg,#9b1230,#e04b69)}.bar.gold div{background:linear-gradient(90deg,#c99a10,var(--gold))}
.pct{display:flex;align-items:center;gap:10px;min-width:150px}.pct b{width:52px;font-size:13px}.pct .bar{flex:1}

.chips{display:flex;gap:10px;flex-wrap:wrap}
.chips button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 16px;border-radius:14px;cursor:pointer;background:#fff;border:1.5px solid var(--line);text-align:left;transition:all .15s}
.chips button b{font-size:13.5px;font-weight:600;color:var(--ink)}.chips button small{font-size:11.5px;color:var(--mut)}
.chips button:hover{border-color:#b9c1e6}
.chips button.on{border-color:var(--navy);background:var(--navy);box-shadow:0 8px 18px rgba(15,29,87,.22)}
.chips button.on b{color:#fff}.chips button.on small{color:#c8d0f5}

.filters{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.search{flex:1;min-width:200px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:12px;background:#f0f3fc;border:1px solid #d6dbef}
.search input{flex:1;border:0;background:none;padding:12px 0;font-size:14px;color:var(--ink);outline:0!important}
.search:focus-within{background:#fff;border-color:var(--navy)}
.sel,.inp{padding:12px 14px;border-radius:12px;border:1px solid #d6dbef;background:#f0f3fc;font-size:13.5px;color:var(--ink)}
.empty{padding:34px 16px;text-align:center;color:var(--mut);font-size:14px;display:grid;justify-items:center;gap:6px}.empty svg{opacity:.4}.empty p{margin:0}

.f{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;min-width:0}
.f label{font-size:12px;font-weight:600;letter-spacing:.03em;color:#3a4170}.f label b{color:var(--crimson)}
.f input,.f select,.f textarea{width:100%;padding:12px 14px;border:1px solid #d6dbef;border-radius:12px;background:#f0f3fc;font-size:14px;color:var(--ink)}
.f textarea{resize:vertical;min-height:90px}
.f input:focus,.f select:focus,.f textarea:focus{background:#fff;border-color:var(--navy)}
.f input:disabled,.f select:disabled{background:#e9ecf6;color:#69708f}
.f.bad input,.f.bad select,.f.bad textarea,.f.bad .drop{border-color:#d92d20;background:#fff6f5}
.f small{font-size:12px;color:#d92d20;font-weight:500}.f small.h{color:var(--mut);font-weight:400}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.drop{display:flex;align-items:center;gap:14px;padding:14px;border:2px dashed #c5cbe8;border-radius:14px;background:#f6f7fc}
.drop .ic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:#e4eaff;color:var(--navy);flex-shrink:0}
.drop .meta{flex:1;min-width:0;font-size:13px}.drop .meta b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.drop .meta small{color:var(--mut)}

.seg{display:inline-flex;border:1px solid #d6dbef;border-radius:10px;overflow:hidden}
.seg button{padding:7px 16px;border:0;background:#fff;color:var(--mut);font-size:13px;font-weight:600;cursor:pointer;border-right:1px solid #d6dbef;min-width:44px}
.seg button:last-child{border-right:0}
.seg button.P.on{background:#14753f;color:#fff}.seg button.A.on{background:#c4162a;color:#fff}.seg button.L.on{background:#c99a10;color:#fff}
.seg button:hover:not(.on){background:#f3f5fd}

.list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.list li{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:#fff}
.list li.now{border-color:var(--crimson);background:#fdf3f5;box-shadow:0 0 0 3px rgba(155,18,48,.08)}
.list li.done{opacity:.6}
.list .time{width:92px;font-size:12.5px;font-weight:600;color:var(--navy);line-height:1.4}
.list b{display:block;font-size:14px}.list small{font-size:12px;color:var(--mut)}

.actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.actions button{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px;border-radius:14px;cursor:pointer;background:#fff;border:1px solid var(--line);color:var(--ink);font-size:13px;font-weight:500;text-align:left;transition:all .15s}
.actions button svg{color:var(--crimson)}.actions button:hover{border-color:var(--navy);transform:translateY(-2px);box-shadow:0 8px 18px rgba(15,29,87,.1)}

.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:0}
.kv div{padding:14px 16px;border-radius:12px;background:#f3f5fd;min-width:0}
.kv dt{font-size:11.5px;color:var(--mut)}.kv dd{margin:3px 0 0;font-weight:600;color:var(--navy);overflow-wrap:anywhere}

.tt-grid{display:grid;grid-template-columns:78px repeat(6,minmax(130px,1fr));gap:6px;min-width:900px}
.tt-h{padding:10px;text-align:center;font-size:12.5px;font-weight:600;color:var(--mut);border-radius:10px}
.tt-h.today{background:var(--navy);color:#fff}
.tt-time{display:grid;place-items:center;font-size:11.5px;color:var(--mut);font-weight:600}
.tt-cell{min-height:64px;border-radius:12px;background:#f8f9fd;padding:8px 10px;font-size:12px;border:1px dashed #e3e6f3}
.tt-cell.has{background:#e9eefc;border:1px solid #c9d3f5;color:var(--navy)}
.tt-cell.has b{display:block;font-size:12.5px}.tt-cell.has small{color:#4a5688;font-size:11px}
.tt-cell.has.now{background:var(--crimson);border-color:var(--crimson);color:#fff;animation:pulse 2s infinite}.tt-cell.has.now small{color:#ffd9e0}
@keyframes pulse{50%{box-shadow:0 0 0 6px rgba(155,18,48,.12)}}

.dots{display:flex;gap:3px;flex-wrap:wrap}.dots i{width:9px;height:9px;border-radius:3px;background:#e8ebf6}
.dots i.P{background:#3fb673}.dots i.A{background:#e04b69}.dots i.L{background:#e3b82b}
.hist{display:flex;align-items:flex-end;gap:8px;height:150px;padding-top:10px}
.hist div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%;font-size:12px;color:var(--mut)}
.hist span{width:100%;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#3b57c4,var(--navy));min-height:4px;transition:height .5s}
.hist b{font-size:12px;color:var(--navy)}

.score{width:78px;padding:9px 10px;text-align:center;border:1px solid #d6dbef;border-radius:10px;background:#f0f3fc;font-size:14px}
.score:focus{background:#fff;border-color:var(--navy)}.score.bad{border-color:#d92d20;background:#fff6f5}

.news{display:grid;gap:12px}
.note{padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:#fff;transition:all .15s}
.note.unread{border-left:4px solid var(--crimson);background:#fdfafb}
.note h4{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 6px;font-size:15px}
.note p{margin:6px 0 0;font-size:13.5px;line-height:1.65;color:#444a5e}
.note .meta{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut)}

.strength{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.strength i{height:6px;border-radius:99px;background:#e8ebf6}
.strength.s1 i:nth-child(-n+1){background:#e04b69}.strength.s2 i:nth-child(-n+2){background:#e3b82b}.strength.s3 i:nth-child(-n+3){background:#3fb673}.strength.s4 i{background:#14753f}
.rules{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px;font-size:12.5px;color:var(--mut)}.rules li{display:flex;gap:8px;align-items:center}.rules .ok{color:var(--green)}

@media(max-width:1100px){.grid-2,.grid-eq{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.sticky{position:static}}
@media(max-width:760px){
  .tp{padding:16px 14px 36px}.hero{padding:22px 20px}.hero h1{font-size:22px}
  .stats{gap:12px}.stat b{font-size:23px}.row2,.row3{grid-template-columns:1fr}.card{padding:18px 16px}
  .list li{grid-template-columns:1fr}.cards{grid-template-columns:1fr}
}
@media print{.tp .hero,.tp .no-print{display:none!important}}
@media(prefers-reduced-motion:reduce){.view,.btn,.stat,.bar div,.tt-cell.has.now,.hist span{animation:none!important;transition:none!important}}
`;