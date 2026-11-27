import { useMemo, useState } from "react";
import { Search, Pin, CheckCheck, Megaphone } from "lucide-react";
import { Card, Pill, Empty, PageShell, useTeacher, fmt } from "./TeacherShared";

const CATS = ["All", "Exam", "Admin", "Events", "Holiday"];
const TONE = { Exam: "red", Admin: "blue", Events: "gold", Holiday: "green" };

export default function TeacherNotices() {
  const { notices, readNotices, markRead, markAllRead } = useTeacher();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);

  const list = useMemo(() => notices.filter((n) => (cat === "All" || n.category === cat) && `${n.title} ${n.body}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)), [notices, cat, q]);
  const unread = notices.filter((n) => !readNotices.has(n.id)).length;

  const toggle = (n) => { setOpen(open === n.id ? null : n.id); markRead(n.id); };

  return (
    <PageShell title="Notices" section="Notices" chip={unread ? `${unread} unread` : "All read"}>
      <Card title="College notices" action={unread > 0 && <button type="button" className="mini" onClick={markAllRead}><CheckCheck size={14} /> Mark all as read</button>}>
        <div className="filters">
          <label className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notices…" aria-label="Search notices" /></label>
        </div>
        <div className="chips" style={{ marginBottom: 18 }} role="tablist" aria-label="Category">
          {CATS.map((c) => <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? "on" : ""} onClick={() => setCat(c)} style={{ flexDirection: "row", padding: "8px 16px" }}><b>{c}</b></button>)}
        </div>

        {list.length ? (
          <div className="news">
            {list.map((n) => {
              const isOpen = open === n.id;
              const body = isOpen || n.body.length < 140 ? n.body : n.body.slice(0, 140).replace(/\s+\S*$/, "") + "…";
              return (
                <article key={n.id} className={"note" + (readNotices.has(n.id) ? "" : " unread")}>
                  <h4>{n.pinned && <Pin size={14} style={{ color: "#9b1230" }} aria-label="Pinned" />}{n.title}{!readNotices.has(n.id) && <Pill tone="red">New</Pill>}</h4>
                  <div className="meta"><Pill tone={TONE[n.category]}>{n.category}</Pill><span>{n.from}</span><span>{fmt(n.date)}</span></div>
                  <p>{body}</p>
                  {n.body.length >= 140 && <button type="button" className="mini" style={{ marginTop: 10 }} onClick={() => toggle(n)}>{isOpen ? "Show less" : "Read more"}</button>}
                  {n.body.length < 140 && !readNotices.has(n.id) && <button type="button" className="mini" style={{ marginTop: 10 }} onClick={() => markRead(n.id)}>Mark as read</button>}
                </article>
              );
            })}
          </div>
        ) : <Empty icon={Megaphone}>No notices found.</Empty>}
      </Card>
    </PageShell>
  );
}