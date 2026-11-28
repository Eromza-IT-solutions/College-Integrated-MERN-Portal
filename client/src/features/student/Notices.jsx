import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import UiCard from "../../components/ui/Card";
import UiErrorState from "../../components/ui/ErrorState";
import UiLoader from "../../components/ui/Loader";
import { useApiData } from "../../hooks/useApiData";
import { fetchMemberNotice, fetchMemberNotices } from "../../services/websiteApi";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FilePenLine,
  GraduationCap,
  Inbox,
  Info,
  Paperclip,
  Pin,
  Search,
  Sparkles,
  Sun,
  Wallet,
  X,
} from "lucide-react";

/*
  Content area only - render it inside your student layout (next to the sidebar).

  Props:
    notices: [{ id, title, category, date: Date, postedBy, important?, deadline?: Date,
                body: ["paragraph", ...], attachments?: [{ name, size }],
                action?: { label, to }, read?: boolean, saved?: boolean }]
    Callbacks (all optional - use them to save state in your backend):
      onRead(id, read)          onSave(id, saved)          onMarkAllRead()
      onDownloadAttachment(noticeId, fileName)             onNavigate(key)  e.g. "examinations/fill-form"

  The sample data below is placeholder - delete it when your API is ready.
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const day = (offset, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const sampleNotices = [
  {
    id: 1,
    title: "Semester 5 exam form submission closes soon",
    category: "Exams",
    date: day(-1, 11),
    postedBy: "Examination Section",
    important: true,
    deadline: day(3, 17),
    body: [
      "All students of Semester 5 must submit their examination form before the deadline. Forms submitted after the last date will not be accepted, and late fees will not be waived.",
      "Fill the form online from the Examinations menu, take a printout and keep it with you. Students with pending fees must clear them before submitting the form.",
      "For any correction in the name or subject list, contact the examination office with your ID card.",
    ],
    attachments: [{ name: "Exam form guidelines.pdf", size: "240 KB" }],
    action: { label: "Fill exam form", to: "examinations/fill-form" },
  },
  {
    id: 2,
    title: "Last date to pay the pending semester fee",
    category: "Fees",
    date: day(-2, 9, 30),
    postedBy: "Accounts Office",
    important: true,
    deadline: day(6, 16),
    body: [
      "Students who have not paid the second instalment of the semester fee must do so before the last date.",
      "Fees can be paid online from the Payments menu. Download your receipt after payment and keep a copy for your records.",
    ],
    attachments: [{ name: "Fee structure 2026-27.pdf", size: "180 KB" }],
    action: { label: "Pay pending fee", to: "payments/pay-pending-fee" },
  },
  {
    id: 3,
    title: "Library will remain closed on Saturday",
    category: "General",
    date: day(0, 8, 45),
    postedBy: "Librarian",
    body: [
      "The college library will remain closed this Saturday for stock verification. It will reopen on Monday at the usual time.",
      "Books due on Saturday can be returned on Monday without any fine.",
    ],
  },
  {
    id: 4,
    title: "Hall tickets will be released one week before the exams",
    category: "Exams",
    date: day(-3, 15),
    postedBy: "Examination Section",
    body: [
      "Hall tickets for the Semester 5 regular exam will be available in the student portal one week before the first paper.",
      "A hall ticket is released only when the exam form is submitted, fees are paid and attendance is at least 75%.",
    ],
    action: { label: "View hall tickets", to: "hall-tickets" },
  },
  {
    id: 5,
    title: "Scholarship applications are open",
    category: "Fees",
    date: day(-4, 12),
    postedBy: "Scholarship Cell",
    deadline: day(14, 17),
    body: [
      "Applications are invited for the state government and college merit scholarships for the academic year 2026-27.",
      "Eligible students should submit their application with income certificate, previous year marksheet and bank details to the scholarship cell.",
    ],
    attachments: [
      { name: "Scholarship application form.pdf", size: "320 KB" },
      { name: "Eligibility criteria.pdf", size: "150 KB" },
    ],
  },
  {
    id: 6,
    title: "Annual college day rehearsals begin next week",
    category: "Events",
    date: day(-5, 14),
    postedBy: "Cultural Committee",
    body: [
      "Rehearsals for the annual college day start on Monday at 3:30 PM in the main auditorium. Students who have registered for dance, drama and music items should attend every day.",
      "Volunteers for stage, decor and hospitality can give their names to the cultural committee.",
    ],
  },
  {
    id: 7,
    title: "Revised timetable for Semester 5 practicals",
    category: "General",
    date: day(-6, 10, 15),
    postedBy: "Academic Office",
    body: [
      "The practical timetable for Semester 5 has been revised. Check the Timetable page for your new slots.",
      "Lab batches remain the same. Any clash should be reported to your class teacher.",
    ],
    action: { label: "Open timetable", to: "timetable" },
  },
  {
    id: 8,
    title: "Winter vacation dates announced",
    category: "Holidays",
    date: day(-9, 13),
    postedBy: "Principal's Office",
    read: true,
    body: [
      "The college will remain closed for winter vacation as per the academic calendar. Classes resume on the first working day of January.",
      "The library and the accounts office will stay open on alternate days. The schedule is in the attached circular.",
    ],
    attachments: [{ name: "Academic calendar.pdf", size: "410 KB" }],
  },
  {
    id: 9,
    title: "Blood donation camp on campus",
    category: "Events",
    date: day(-11, 11),
    postedBy: "NSS Unit",
    read: true,
    saved: true,
    body: [
      "The NSS unit is organising a blood donation camp in the seminar hall. Students above 18 years and in good health can donate.",
      "Please carry your college ID card and have a light meal beforehand.",
    ],
  },
  {
    id: 10,
    title: "Admissions open for certificate courses",
    category: "Admission",
    date: day(-14, 12),
    postedBy: "Admission Cell",
    read: true,
    deadline: day(-2, 17),
    body: [
      "Admissions for short-term certificate courses in data analytics, spoken English and digital marketing were open to all current students.",
      "Seats were allotted on a first come, first served basis.",
    ],
  },
  {
    id: 11,
    title: "Reminder: anti-ragging undertaking",
    category: "General",
    date: day(-22, 10),
    postedBy: "Anti-Ragging Committee",
    read: true,
    body: [
      "All students must keep a copy of the anti-ragging undertaking signed at admission. Any incident can be reported to the committee or on the national helpline.",
    ],
  },
];

/* ------------------------------ CATEGORIES ------------------------------ */
const CATEGORIES = {
  Exams: { icon: GraduationCap, tint: "bg-[#16285a]/10 text-[#16285a]" },
  Admission: { icon: FilePenLine, tint: "bg-sky-50 text-sky-700" },
  Fees: { icon: Wallet, tint: "bg-[#f5b800]/25 text-[#7a5a00]" },
  Events: { icon: Sparkles, tint: "bg-[#8b0f1f]/10 text-[#8b0f1f]" },
  Holidays: { icon: Sun, tint: "bg-emerald-50 text-emerald-700" },
  General: { icon: Info, tint: "bg-slate-100 text-slate-600" },
};

/* ------------------------------- HELPERS -------------------------------- */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
const fmtDate = (d, o = { day: "numeric", month: "short", year: "numeric" }) => d.toLocaleDateString("en-IN", o);

function relative(d, today) {
  const n = -daysBetween(today, d);
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 7) return `${n} days ago`;
  if (n < 30) return `${Math.floor(n / 7)} ${Math.floor(n / 7) === 1 ? "week" : "weeks"} ago`;
  return fmtDate(d);
}

function deadlineInfo(n, today) {
  if (!n.deadline) return null;
  const d = daysBetween(today, n.deadline);
  if (d < 0) return { label: "Closed", cls: "bg-slate-100 text-slate-500", days: d };
  if (d === 0) return { label: "Due today", cls: "bg-[#8b0f1f] text-white", days: d };
  if (d <= 3) return { label: `Due in ${d} ${d === 1 ? "day" : "days"}`, cls: "bg-[#8b0f1f] text-white", days: d };
  return { label: `Due in ${d} days`, cls: "bg-[#f5b800]/25 text-[#7a5a00]", days: d };
}

function Highlight({ text, q }) {
  if (!q.trim()) return text;
  const re = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-[#f5b800]/40 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/* ------------------------------ COMPONENT ------------------------------- */
function StudentNoticesView({
  notices = sampleNotices,
  onRead = () => {},
  onSave = () => {},
  onMarkAllRead = () => {},
  onDownloadAttachment = () => {},
  onNavigate = () => {},
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [items, setItems] = useState(notices);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest"); // newest | oldest | deadline
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [openId, setOpenId] = useState(null);

  const closeRef = useRef(null);
  const returnFocus = useRef(null);

  const patch = (id, changes) => setItems((list) => list.map((n) => (n.id === id ? { ...n, ...changes } : n)));

  const open = (id) => {
    returnFocus.current = document.activeElement;
    setOpenId(id);
    const n = items.find((x) => x.id === id);
    if (n && !n.read) {
      patch(id, { read: true });
      onRead(id, true);
    }
  };
  const close = () => {
    setOpenId(null);
    returnFocus.current?.focus?.();
  };
  const toggleSaved = (n) => {
    patch(n.id, { saved: !n.saved });
    onSave(n.id, !n.saved);
  };
  const toggleRead = (n) => {
    patch(n.id, { read: !n.read });
    onRead(n.id, !n.read);
  };
  const markAllRead = () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    onMarkAllRead();
  };

  /* ---- Counts ---- */
  const unreadCount = items.filter((n) => !n.read).length;
  const savedCount = items.filter((n) => n.saved).length;
  const urgentCount = items.filter((n) => n.important && (deadlineInfo(n, today)?.days ?? 0) >= 0).length;
  const categoryCounts = useMemo(() => {
    const c = {};
    items.forEach((n) => (c[n.category] = (c[n.category] ?? 0) + 1));
    return c;
  }, [items]);

  /* ---- Closing-soon banner ---- */
  const featured = useMemo(
    () =>
      items
        .filter((n) => n.important && n.deadline && daysBetween(today, n.deadline) >= 0)
        .sort((a, b) => a.deadline - b.deadline)[0],
    [items, today]
  );

  /* ---- Filter + sort + group ---- */
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = items.filter((n) => {
      if (category !== "All" && n.category !== category) return false;
      if (unreadOnly && n.read) return false;
      if (savedOnly && !n.saved) return false;
      if (q) {
        const hay = `${n.title} ${n.category} ${n.postedBy} ${n.body.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === "oldest") list = [...list].sort((a, b) => a.date - b.date);
    else if (sort === "deadline")
      list = [...list].sort((a, b) => {
        const da = a.deadline && daysBetween(today, a.deadline) >= 0 ? a.deadline : null;
        const db = b.deadline && daysBetween(today, b.deadline) >= 0 ? b.deadline : null;
        if (da && db) return da - db;
        if (da) return -1;
        if (db) return 1;
        return b.date - a.date;
      });
    else list = [...list].sort((a, b) => b.date - a.date);
    return list;
  }, [items, category, unreadOnly, savedOnly, q, sort, today]);

  const groups = useMemo(() => {
    if (q) return [{ label: `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`, items: filtered }];
    if (sort !== "newest")
      return [{ label: sort === "oldest" ? "Oldest first" : "Closing soonest first", items: filtered }];
    const isPinned = (n) => n.important && (deadlineInfo(n, today)?.days ?? 0) >= 0;
    const buckets = [
      { label: "Important", icon: Pin, items: filtered.filter(isPinned) },
      { label: "Today", items: [] },
      { label: "This week", items: [] },
      { label: "Earlier", items: [] },
    ];
    filtered
      .filter((n) => !isPinned(n))
      .forEach((n) => {
        const age = -daysBetween(today, n.date);
        buckets[age <= 0 ? 1 : age <= 7 ? 2 : 3].items.push(n);
      });
    return buckets.filter((b) => b.items.length);
  }, [filtered, q, sort, today]);

  const flat = groups.flatMap((g) => g.items);
  const openIndex = flat.findIndex((n) => n.id === openId);
  const openNotice = items.find((n) => n.id === openId);

  const go = (step) => {
    const next = flat[openIndex + step];
    if (!next) return;
    setOpenId(next.id);
    if (!next.read) {
      patch(next.id, { read: true });
      onRead(next.id, true);
    }
  };

  /* ---- Drawer: focus, Escape, arrow keys ---- */
  useEffect(() => {
    if (openId === null) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, openIndex, flat.length]);

  const hasFilters = category !== "All" || unreadOnly || savedOnly || q;
  const clearFilters = () => {
    setCategory("All");
    setUnreadOnly(false);
    setSavedOnly(false);
    setQuery("");
  };

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ------------------------------ Closing-soon banner ------------------------------ */}
      {featured && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16285a] to-[#0b1536] px-6 py-7 text-white shadow-lg md:px-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#f5b800]/15" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-52 w-52 rounded-full border-[20px] border-white/5" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-medium text-[#f5b800]">
                <Clock size={16} />
                Closing soon · {featured.category}
              </p>
              <h2
                className="mt-2 text-[26px] font-bold leading-tight md:text-[30px]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {featured.title}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Last date: {fmtDate(featured.deadline, { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => open(featured.id)}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16285a] transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Read notice
                </button>
                {featured.action && (
                  <button
                    onClick={() => onNavigate(featured.action.to)}
                    className="flex items-center gap-2 rounded-xl bg-[#f5b800] px-5 py-2.5 text-sm font-semibold text-[#16285a] transition-colors hover:bg-[#ffc81f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b800]"
                  >
                    {featured.action.label}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/10 px-9 py-5 text-center">
              <p
                className="text-[52px] font-bold leading-none tabular-nums"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {daysBetween(today, featured.deadline)}
              </p>
              <p className="mt-1.5 text-sm text-slate-300">
                {daysBetween(today, featured.deadline) === 1 ? "day left" : "days left"}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------- Quick filters (stats) ---------------------------- */}
      <section className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${featured ? "mt-6" : ""}`}>
        <StatButton
          label="Unread"
          value={unreadCount}
          note={unreadCount ? "Tap to show only unread" : "You're all caught up"}
          active={unreadOnly}
          onClick={() => setUnreadOnly((v) => !v)}
          icon={Inbox}
        />
        <StatButton
          label="Important and open"
          value={urgentCount}
          note="Notices with a live deadline"
          active={sort === "deadline"}
          onClick={() => setSort((s) => (s === "deadline" ? "newest" : "deadline"))}
          icon={Pin}
        />
        <StatButton
          label="Saved"
          value={savedCount}
          note={savedCount ? "Tap to show only saved" : "Bookmark notices to keep them here"}
          active={savedOnly}
          onClick={() => setSavedOnly((v) => !v)}
          icon={BookmarkCheck}
        />
      </section>

      {/* -------------------------------- Toolbar -------------------------------- */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search notices</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, topic or department"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-10 text-sm outline-none transition-colors focus:border-[#16285a] focus:ring-2 focus:ring-[#16285a]/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 items-center md:flex-none">
              <span className="sr-only">Sort notices</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#16285a] focus:ring-2 focus:ring-[#16285a]/20"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="deadline">Deadline soonest</option>
              </select>
            </label>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-[#16285a] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <CheckCheck size={17} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
          {["All", ...Object.keys(CATEGORIES)].map((c) => {
            const active = category === c;
            const count = c === "All" ? items.length : categoryCounts[c] ?? 0;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-[#16285a] bg-[#16285a] text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {c}
                <span className={`rounded-full px-2 text-xs ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ------------------------------- Notice list ------------------------------- */}
      <div className="mt-6" aria-live="polite">
        {flat.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={26} />
            </span>
            <p className="mt-4 font-semibold text-[#16285a]">No notices match</p>
            <p className="mt-1 text-sm text-slate-500">Try a different word, or remove a filter.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-[#16285a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d3375]"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mb-7 last:mb-0">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                {g.icon && <g.icon size={15} className="text-[#8b0f1f]" />}
                {g.label}
                <span className="rounded-full bg-slate-200/70 px-2 text-xs">{g.items.length}</span>
              </h2>
              <ul className="space-y-3">
                {g.items.map((n) => (
                  <NoticeRow
                    key={n.id}
                    n={n}
                    q={query}
                    today={today}
                    onOpen={() => open(n.id)}
                    onSave={() => toggleSaved(n)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* --------------------------------- Detail drawer --------------------------------- */}
      {openNotice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={openNotice.title}
            className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {/* header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => go(-1)}
                  disabled={openIndex <= 0}
                  aria-label="Previous notice"
                  className="rounded-lg p-2 text-[#16285a] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => go(1)}
                  disabled={openIndex >= flat.length - 1}
                  aria-label="Next notice"
                  className="rounded-lg p-2 text-[#16285a] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={20} />
                </button>
                <span className="ml-2 text-xs text-slate-500">
                  {openIndex + 1} of {flat.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleSaved(openNotice)}
                  aria-pressed={!!openNotice.saved}
                  aria-label={openNotice.saved ? "Remove bookmark" : "Bookmark this notice"}
                  className={`rounded-lg p-2 hover:bg-slate-100 ${openNotice.saved ? "text-[#8b0f1f]" : "text-slate-500"}`}
                >
                  {openNotice.saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
                <button
                  ref={closeRef}
                  onClick={close}
                  aria-label="Close notice"
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={openNotice.category} />
                {openNotice.important && (
                  <span className="flex items-center gap-1 rounded-full bg-[#8b0f1f] px-3 py-1 text-xs font-semibold text-white">
                    <Pin size={12} />
                    Important
                  </span>
                )}
                {(() => {
                  const d = deadlineInfo(openNotice, today);
                  return d && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${d.cls}`}>{d.label}</span>;
                })()}
              </div>

              <h2
                className="mt-4 text-[26px] font-bold leading-tight text-[#16285a]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {openNotice.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {openNotice.postedBy} · {fmtDate(openNotice.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              {openNotice.deadline && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#8b0f1f]">
                  <Clock size={14} />
                  Last date: {fmtDate(openNotice.deadline, { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}

              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700">
                {openNotice.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {openNotice.attachments?.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#16285a]">
                    <Paperclip size={15} />
                    Attachments
                  </h3>
                  <ul className="space-y-2.5">
                    {openNotice.attachments.map((a) => (
                      <li key={a.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8b0f1f]/10 text-xs font-bold text-[#8b0f1f]">
                          PDF
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-slate-500">{a.size}</p>
                        </div>
                        <button
                          onClick={() => onDownloadAttachment(openNotice.id, a.name)}
                          aria-label={`Download ${a.name}`}
                          className="rounded-lg p-2 text-[#16285a] hover:bg-slate-100"
                        >
                          <Download size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => {
                  toggleRead(openNotice);
                  close();
                }}
                className="text-sm font-medium text-slate-600 hover:text-[#16285a] hover:underline"
              >
                Mark as unread
              </button>
              {openNotice.action && (
                <button
                  onClick={() => {
                    close();
                    onNavigate(openNotice.action.to);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#8b0f1f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a31326]"
                >
                  {openNotice.action.label}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Pieces ------------------------------- */
function StatButton({ label, value, note, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-4 rounded-2xl border p-5 text-left shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a] ${
        active
          ? "border-[#16285a] bg-[#16285a] text-white"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-white/10 text-[#f5b800]" : "bg-[#16285a]/10 text-[#16285a]"
        }`}
      >
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm ${active ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
        <span
          className={`block text-3xl font-bold leading-tight ${active ? "text-white" : "text-[#16285a]"}`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {value}
        </span>
        <span className={`block text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{note}</span>
      </span>
    </button>
  );
}

function CategoryBadge({ category }) {
  const { icon: Icon, tint } = CATEGORIES[category] ?? CATEGORIES.General;
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tint}`}>
      <Icon size={13} />
      {category}
    </span>
  );
}

function NoticeRow({ n, q, today, onOpen, onSave }) {
  const { icon: Icon, tint } = CATEGORIES[n.category] ?? CATEGORIES.General;
  const dl = deadlineInfo(n, today);
  const isNew = !n.read;
  const preview = n.body[0];

  return (
    <li className="relative">
      <button
        onClick={onOpen}
        className={`group flex w-full items-start gap-4 rounded-2xl border bg-white p-4 pr-14 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16285a] md:p-5 md:pr-16 ${
          isNew ? "border-slate-200 border-l-4 border-l-[#c9971c]" : "border-slate-200"
        }`}
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={21} strokeWidth={1.8} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-[15px] leading-snug text-[#16285a] ${isNew ? "font-bold" : "font-medium"}`}>
              <Highlight text={n.title} q={q} />
            </span>
            {isNew && (
              <span className="rounded-full bg-[#f5b800] px-2.5 py-0.5 text-[11px] font-bold text-[#16285a]">New</span>
            )}
          </span>
          <span className="mt-1.5 line-clamp-2 block text-sm text-slate-600">
            <Highlight text={preview} q={q} />
          </span>
          <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>{n.category}</span>
            <span>{relative(n.date, today)}</span>
            <span className="hidden sm:inline">{n.postedBy}</span>
            {n.attachments?.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip size={12} />
                {n.attachments.length}
              </span>
            )}
            {n.important && (
              <span className="flex items-center gap-1 font-semibold text-[#8b0f1f]">
                <Pin size={12} />
                Important
              </span>
            )}
            {dl && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${dl.cls}`}>{dl.label}</span>}
          </span>
        </span>
      </button>

      <button
        onClick={onSave}
        aria-pressed={!!n.saved}
        aria-label={n.saved ? `Remove bookmark from ${n.title}` : `Bookmark ${n.title}`}
        className={`absolute right-3 top-3 rounded-lg p-2 transition-colors hover:bg-slate-100 md:right-4 md:top-4 ${
          n.saved ? "text-[#8b0f1f]" : "text-slate-400 hover:text-slate-700"
        }`}
      >
        {n.saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
      </button>
    </li>
  );
}

/* ----------------------------------------------------------------------------
   Server connection. The page above shows the notices it is given; this part loads the
   published notices (GET /website/members/notices) and keeps read / saved in this browser.
---------------------------------------------------------------------------- */
const API_READ_KEY = "eromza.readNotices";
const API_SAVED_KEY = "eromza.savedNotices";

const apiLoadSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
};
const apiSaveSet = (key, set) => {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* storage blocked: the page still works */ }
};

async function apiLoadNotices() {
  const paragraphs = (text) => String(text || "").split(/\n+/).map((t) => t.trim()).filter(Boolean);
  const list = await fetchMemberNotices({ limit: 30 });
  const read = apiLoadSet(API_READ_KEY);
  const saved = apiLoadSet(API_SAVED_KEY);
  // The list carries only the summary, so the full text is fetched for each notice.
  const details = await Promise.all((list?.items ?? []).map((n) => fetchMemberNotice(n.slug).catch(() => null)));
  return (list?.items ?? []).map((n, i) => {
    const full = details[i] || n;
    const body = paragraphs(full.body);
    return {
      id: n.id,
      slug: n.slug,
      title: n.title,
      category: n.category || "General",
      date: new Date(n.publishedAt || n.createdAt || Date.now()),
      postedBy: n.meta?.postedBy || n.meta?.audience || "College office",
      important: n.meta?.priority === "High" || Boolean(n.isPinned),
      deadline: n.meta?.deadline ? new Date(n.meta.deadline) : undefined,
      body: body.length ? body : paragraphs(n.summary),
      attachments: (full.attachments ?? []).map((a) => ({ name: a.name, size: a.size || "", url: a.url })),
      read: read.has(n.id),
      saved: saved.has(n.id),
    };
  });
}

export default function StudentNotices() {
  const { data, loading, error, reload } = useApiData(apiLoadNotices);
  if (loading || error) {
    return (
      <div className="p-6">
        <UiCard>
          {loading ? <UiLoader label="Loading notices..." /> : <UiErrorState title="Could not load this page" description={error.message} onRetry={reload} />}
        </UiCard>
      </div>
    );
  }

  const flag = (key) => (id, on) => {
    const set = apiLoadSet(key);
    if (on) set.add(id); else set.delete(id);
    apiSaveSet(key, set);
  };
  const markAll = () => apiSaveSet(API_READ_KEY, new Set([...apiLoadSet(API_READ_KEY), ...data.map((n) => n.id)]));
  const download = (noticeId, fileName) => {
    const file = data.find((n) => n.id === noticeId)?.attachments.find((a) => a.name === fileName);
    if (file?.url) window.open(file.url, "_blank", "noopener");
  };

  return (
    <StudentNoticesView
      notices={data}
      onRead={flag(API_READ_KEY)}
      onSave={flag(API_SAVED_KEY)}
      onMarkAllRead={markAll}
      onDownloadAttachment={download}
    />
  );
}
