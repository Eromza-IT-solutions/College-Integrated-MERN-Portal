import { useState } from "react";
import { Bell, MailOpen, Megaphone } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { studentNotices } from "../../mocks/studentData";

export default function Notices() {
  const [notices, setNotices] = useState(studentNotices);
  const [filter, setFilter] = useState("all");

  const filteredNotices =
    filter === "all"
      ? notices
      : filter === "high"
        ? notices.filter((notice) => notice.priority === "High")
        : notices.filter((notice) => notice.read === (filter === "read"));

  const unread = notices.filter((notice) => !notice.read).length;
  const highPriority = notices.filter(
    (notice) => notice.priority === "High",
  ).length;

  const toggleRead = (noticeId) => {
    setNotices((current) =>
      current.map((notice) =>
        notice.id === noticeId ? { ...notice, read: !notice.read } : notice,
      ),
    );
  };

  const markAllRead = () => {
    setNotices((current) =>
      current.map((notice) => ({ ...notice, read: true })),
    );
  };

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total notices"
          value={String(notices.length)}
          tone="info"
          icon={Bell}
        />
        <StatCard
          label="Unread"
          value={String(unread)}
          tone="warning"
          icon={MailOpen}
        />
        <StatCard
          label="High priority"
          value={String(highPriority)}
          tone="accent"
          icon={Megaphone}
        />
      </div>

      <Card>
        <CardHeader
          title="Notice board"
          description="Announcements for your programme and semester"
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
          {filteredNotices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-xl border p-4 ${
                notice.read
                  ? "border-eromza-border"
                  : "border-rose-200 bg-rose-50/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{notice.category}</Badge>
                    <Badge
                      variant={notice.priority === "High" ? "accent" : "warning"}
                    >
                      {notice.priority}
                    </Badge>
                    {!notice.read ? <Badge variant="info">Unread</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-5 text-eromza-text">
                    {notice.title}
                  </p>
                  <p className="mt-1 text-[11px] text-eromza-subtle">
                    {notice.date}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-eromza-muted">
                    {notice.body}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRead(notice.id)}
                >
                  {notice.read ? "Mark unread" : "Mark read"}
                </Button>
              </div>
            </div>
          ))}
          {!filteredNotices.length ? (
            <p className="py-8 text-center text-xs text-eromza-subtle">
              No notices match this filter.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
