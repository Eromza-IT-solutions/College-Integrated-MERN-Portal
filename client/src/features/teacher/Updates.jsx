import { useMemo, useState } from "react";
import { Search, Pin, CheckCheck, Megaphone } from "lucide-react";
import { Card, Pill, Empty, PageShell, useTeacher, fmt } from "./TeacherShared";
import { fetchMemberNotice } from "../../services/websiteApi";

const TONE = { Exam: "red", Admin: "blue", Events: "gold", Holiday: "green" };

// Notices are real (published by the Website Admin). The list carries the summary; "Read more" loads the full text.
export default function TeacherNotices() {
  const { notices, readNotices, markRead, markAllRead } = useTeacher();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [full, setFull] = useState({}); // slug -> { body } | { error }

  const cats = useMemo(() => ["All", ...new Set(notices.map((n) => n.category))], [notices]);

  const list = useMemo(() => notices.filter((n) => (cat === "All" || n.category === cat) && `${n.title} ${n.body}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || String(b.date).localeCompare(String(a.date))), [notices, cat, q]);
  const unread = notices.filter((n) => !readNotices.has(n.id)).length;

  async function toggle(n) {
    const opening = open !== n.id;
    setOpen(opening ? n.id : null);
    markRead(n.id);
    if (!opening || full[n.slug]) return;
    try {
      const item = await fetchMemberNotice(n.slug);
      setFull((f) => ({ ...f, [n.slug]: { body: item.body || "" } }));
    } catch (err) {
      setFull((f) => ({ ...f, [n.slug]: { error: err.message } }));
    }
  }

  return (
    <PageShell title="Notices" section="Notices" chip={unread ? `${unread} unread` : "All read"}>
      <Card title="College notices" action={unread > 0 && <button type="button" className="mini" onClick={markAllRead}><CheckCheck size={14} /> Mark all as read</button>}>
        <div className="filters">
          <label className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notices…" aria-label="Search notices" /></label>
        </div>
        <div className="chips" style={{ marginBottom: 18 }} role="tablist" aria-label="Category">
          {cats.map((c) => <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? "on" : ""} onClick={() => setCat(c)} style={{ flexDirection: "row", padding: "8px 16px" }}><b>{c}</b></button>)}
        </div>

        {list.length ? (
          <div className="news">
            {list.map((n) => {
              const isOpen = open === n.id;
              const detail = full[n.slug];
              return (
                <article key={n.id} className={"note" + (readNotices.has(n.id) ? "" : " unread")}>
                  <h4>{n.pinned && <Pin size={14} style={{ color: "#9b1230" }} aria-label="Pinned" />}{n.title}{!readNotices.has(n.id) && <Pill tone="red">New</Pill>}</h4>
                  <div className="meta"><Pill tone={TONE[n.category] || "gray"}>{n.category}</Pill><span>{n.from}</span><span>{fmt(n.date)}</span></div>
                  {n.body ? <p>{n.body}</p> : null}
                  {isOpen && !detail ? <p>Loading…</p> : null}
                  {isOpen && detail?.error ? <p role="alert">{detail.error}</p> : null}
                  {isOpen && detail?.body ? <p style={{ whiteSpace: "pre-wrap" }}>{detail.body}</p> : null}
                  <button type="button" className="mini" style={{ marginTop: 10 }} onClick={() => toggle(n)}>{isOpen ? "Show less" : "Read more"}</button>
                </article>
              );
            })}
          </div>
        ) : <Empty icon={Megaphone}>No notices found.</Empty>}
      </Card>
    </PageShell>
  );
}
