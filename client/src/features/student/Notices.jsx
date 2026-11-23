import { useState } from "react";
import { Bell, MailOpen, Megaphone, Paperclip } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import { fetchMemberNotice, fetchMemberNotices } from "../../services/websiteApi";
import { formatDate } from "../../utils/format";

// Which notices this browser has opened. Kept in the browser only (the server does not track reads).
const STORAGE_KEY = "eromza.readNotices";

function loadRead() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveRead(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be blocked; the page still works, it just forgets what was read.
  }
}

const priorityOf = (notice) => notice.meta?.priority || "Medium";

export default function Notices() {
  const { data, loading, error, reload } = useApiData(() => fetchMemberNotices({ limit: 100 }));
  const [readIds, setReadIds] = useState(loadRead);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null); // slug of the notice that is open
  const [details, setDetails] = useState({}); // slug -> { body } or { error }

  const notices = data?.items ?? [];
  const isRead = (notice) => readIds.has(notice.id);

  const filtered =
    filter === "all"
      ? notices
      : filter === "high"
        ? notices.filter((notice) => priorityOf(notice) === "High")
        : notices.filter((notice) => isRead(notice) === (filter === "read"));

  const unread = notices.filter((notice) => !isRead(notice)).length;
  const highPriority = notices.filter((notice) => priorityOf(notice) === "High").length;

  const update = (next) => {
    saveRead(next);
    setReadIds(next);
  };

  const toggleRead = (notice) => {
    const next = new Set(readIds);
    if (next.has(notice.id)) next.delete(notice.id);
    else next.add(notice.id);
    update(next);
  };

  const markAllRead = () => update(new Set([...readIds, ...notices.map((notice) => notice.id)]));

  // Opening a notice loads its full text and counts as reading it.
  async function toggleOpen(notice) {
    if (expanded === notice.slug) {
      setExpanded(null);
      return;
    }
    setExpanded(notice.slug);
    if (!readIds.has(notice.id)) update(new Set(readIds).add(notice.id));
    if (details[notice.slug]) return;
    try {
      const full = await fetchMemberNotice(notice.slug);
      setDetails((current) => ({ ...current, [notice.slug]: { body: full.body } }));
    } catch (err) {
      setDetails((current) => ({ ...current, [notice.slug]: { error: err.message } }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Notices"
        description="Read announcements from the college, examination office, and library."
        actions={
          <Button variant="secondary" onClick={markAllRead} disabled={!unread}>
            <MailOpen size={16} />
            Mark all read
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Loader label="Loading notices..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState title="Could not load notices" description={error.message} onRetry={reload} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total notices" value={String(notices.length)} tone="info" icon={Bell} />
            <StatCard label="Unread" value={String(unread)} tone="warning" icon={MailOpen} />
            <StatCard label="High priority" value={String(highPriority)} tone="accent" icon={Megaphone} />
          </div>

          <Card>
            <CardHeader
              title="Notice board"
              description="Published announcements from the college"
              action={
                <Select
                  aria-label="Filter notices"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="min-w-[160px]"
                >
                  <option value="all">All notices</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="high">High priority</option>
                </Select>
              }
            />
            <CardBody className="space-y-3">
              {filtered.map((notice) => {
                const read = isRead(notice);
                const priority = priorityOf(notice);
                const detail = details[notice.slug];
                const open = expanded === notice.slug;
                return (
                  <div
                    key={notice.id}
                    className={`rounded-xl border p-4 ${
                      read ? "border-eromza-border" : "border-rose-200 bg-rose-50/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="neutral">{notice.category || "General"}</Badge>
                          <Badge variant={priority === "High" ? "accent" : "warning"}>{priority}</Badge>
                          {!read ? <Badge variant="info">Unread</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-5 text-eromza-text">{notice.title}</p>
                        <p className="mt-1 text-[11px] text-eromza-subtle">{formatDate(notice.publishedAt)}</p>
                        {notice.summary ? (
                          <p className="mt-2 text-xs leading-5 text-eromza-muted">{notice.summary}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleOpen(notice)}>
                          {open ? "Hide" : "Read more"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleRead(notice)}>
                          {read ? "Mark unread" : "Mark read"}
                        </Button>
                      </div>
                    </div>

                    {open ? (
                      <div className="mt-3 border-t border-eromza-border pt-3">
                        {!detail ? <p className="text-xs text-eromza-muted">Loading...</p> : null}
                        {detail?.error ? (
                          <p role="alert" className="text-xs text-eromza-error">{detail.error}</p>
                        ) : null}
                        {detail?.body ? (
                          <p className="whitespace-pre-wrap text-xs leading-5 text-eromza-text">{detail.body}</p>
                        ) : null}
                        {detail && !detail.error && !detail.body ? (
                          <p className="text-xs text-eromza-muted">This notice has no more text.</p>
                        ) : null}
                        {notice.attachments?.length ? (
                          <ul className="mt-3 space-y-1">
                            {notice.attachments.map((file) => (
                              <li key={file.url}>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-xs font-medium text-eromza-accent hover:underline"
                                >
                                  <Paperclip size={13} /> {file.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!filtered.length ? (
                <p className="py-8 text-center text-xs text-eromza-subtle">
                  {notices.length ? "No notices match this filter." : "No notices have been published yet."}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
