import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Paperclip, Pin } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import ErrorState from "../../../components/ui/ErrorState";
import Loader from "../../../components/ui/Loader";
import Pagination from "../../../components/ui/Pagination";
import { useApiData } from "../../../hooks/useApiData";
import { fetchPublicContent, fetchPublicItem } from "../../../services/websiteApi";
import { formatDate } from "../../../utils/format";

// Public pages for what the Website Admin publishes: the notice board (/notices),
// one notice, news item or event (/notices/:type/:slug) and plain pages (/pages/:slug).
// No login needed; the server only sends what is published and public right now.

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-eromza-bg">
      <header className="border-b border-eromza-border bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-semibold text-eromza-text">
            Abeda Inamdar Senior College
          </Link>
          <nav className="flex gap-4 text-xs font-medium text-eromza-muted">
            <Link to="/" className="hover:text-eromza-text">Home</Link>
            <Link to="/notices" className="hover:text-eromza-text">Notices</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

const TYPES = [
  { id: "notice", label: "Notices" },
  { id: "news", label: "News" },
  { id: "event", label: "Events" },
];
const PAGE_SIZE = 10;

export function NoticeBoardPage() {
  const [type, setType] = useState("notice");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiData(
    () => fetchPublicContent(type, { page, limit: PAGE_SIZE }),
    `${type}-${page}`,
  );
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-eromza-text">Notice board</h1>
      <p className="mt-1 text-xs text-eromza-muted">Latest announcements from the college.</p>

      <div className="mt-5 flex gap-2 border-b border-eromza-border">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setType(t.id); setPage(1); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              type === t.id
                ? "border-eromza-accent text-eromza-accent"
                : "border-transparent text-eromza-muted hover:text-eromza-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? <Loader label="Loading..." /> : null}
        {error ? <ErrorState description={error.message} onRetry={reload} /> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="py-10 text-center text-xs text-eromza-subtle">Nothing published here yet.</p>
        ) : null}
        {!loading && !error
          ? items.map((item) => (
              <article key={item.id} className="rounded-xl border border-eromza-border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-eromza-subtle">
                  {item.isPinned ? (
                    <Badge variant="accent"><Pin size={11} /> Pinned</Badge>
                  ) : null}
                  {item.category ? <Badge variant="neutral">{item.category}</Badge> : null}
                  <span>{formatDate(item.type === "event" ? item.startsAt : item.publishedAt)}</span>
                </div>
                <Link
                  to={`/notices/${item.type}/${item.slug}`}
                  className="mt-2 block text-sm font-semibold text-eromza-text hover:underline"
                >
                  {item.title}
                </Link>
                {item.summary ? (
                  <p className="mt-1 text-xs leading-5 text-eromza-muted">{item.summary}</p>
                ) : null}
              </article>
            ))
          : null}
      </div>

      {totalPages > 1 ? <Pagination className="mt-5" page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
    </Shell>
  );
}

// fixedType: "page" for /pages/:slug; otherwise the type comes from the address.
export function ContentDetailPage({ fixedType }) {
  const params = useParams();
  const type = fixedType || params.type;
  const { data: item, loading, error } = useApiData(
    () => fetchPublicItem(type, params.slug),
    `${type}/${params.slug}`,
  );

  return (
    <Shell>
      <Link
        to="/notices"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-eromza-muted hover:text-eromza-text"
      >
        <ArrowLeft size={14} /> All notices
      </Link>

      {loading ? <Loader label="Loading..." /> : null}
      {error ? (
        <ErrorState title="Not available" description={error.message} />
      ) : null}

      {item ? (
        <article className="rounded-xl border border-eromza-border bg-white p-6">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-eromza-subtle">
            {item.category ? <Badge variant="neutral">{item.category}</Badge> : null}
            {item.type !== "page" ? (
              <span>{formatDate(item.type === "event" ? item.startsAt : item.publishedAt)}</span>
            ) : null}
          </div>
          <h1 className="mt-2 text-xl font-semibold text-eromza-text">{item.title}</h1>

          {item.type === "event" ? (
            <p className="mt-2 flex flex-wrap items-center gap-4 text-xs text-eromza-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} /> {formatDate(item.startsAt)}
                {item.endsAt ? ` to ${formatDate(item.endsAt)}` : ""}
              </span>
              {item.venue ? (
                <span className="inline-flex items-center gap-1"><MapPin size={13} /> {item.venue}</span>
              ) : null}
            </p>
          ) : null}

          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="mt-4 max-h-80 w-full rounded-lg object-cover" />
          ) : null}

          {/* The text is shown as plain text, so nothing in it can run as code. */}
          <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-eromza-text">{item.body}</div>

          {item.images?.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {item.images.map((image) => (
                <figure key={image.url}>
                  <img src={image.url} alt={image.caption || ""} className="w-full rounded-lg object-cover" />
                  {image.caption ? (
                    <figcaption className="mt-1 text-[11px] text-eromza-subtle">{image.caption}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : null}

          {item.attachments?.length ? (
            <ul className="mt-5 space-y-1 border-t border-eromza-border pt-4">
              {item.attachments.map((file) => (
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
        </article>
      ) : null}
    </Shell>
  );
}
