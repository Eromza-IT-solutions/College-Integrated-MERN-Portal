import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Badge from "../ui/Badge";

const NOTIFICATIONS = [
  {
    id: "notice-1",
    title: "New admission application received",
    detail: "Fatima Khan submitted a B.Com application.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "notice-2",
    title: "Examination timetable published",
    detail: "Winter 2026 timetable is ready for review.",
    time: "18 min ago",
    unread: true,
  },
  {
    id: "notice-3",
    title: "Fee payment verified",
    detail: "Ayesha Shaikh completed the admission fee payment.",
    time: "1 hour ago",
    unread: false,
  },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const menuRef = useRef(null);
  const unreadCount = notifications.filter((item) => item.unread).length;

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, unread: false })),
    );
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-10 w-10 place-items-center rounded-lg text-eromza-muted transition hover:bg-eromza-bg hover:text-eromza-text"
      >
        <Bell size={19} />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-eromza-accent px-1 text-[9px] font-semibold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-eromza-border bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-eromza-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-eromza-text">Notifications</p>
              <p className="text-[11px] text-eromza-subtle">
                {unreadCount} unread updates
              </p>
            </div>
            <Badge variant="accent">Live</Badge>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b border-eromza-border/80 px-4 py-3 last:border-0 hover:bg-eromza-bg/60"
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    item.unread ? "bg-eromza-accent" : "bg-eromza-border"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-eromza-text">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-eromza-muted">
                    {item.detail}
                  </p>
                  <p className="mt-1 text-[10px] text-eromza-subtle">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="flex w-full items-center justify-center gap-2 border-t border-eromza-border px-4 py-2.5 text-xs font-medium text-eromza-accent transition hover:bg-eromza-bg disabled:cursor-not-allowed disabled:text-eromza-subtle"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        </div>
      ) : null}
    </div>
  );
}
