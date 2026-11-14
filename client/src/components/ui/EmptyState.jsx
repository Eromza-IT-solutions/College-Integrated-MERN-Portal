import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "Nothing here yet",
  description = "There are no records to show.",
  icon: Icon = Inbox,
  action,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-eromza-bg text-eromza-subtle">
        <Icon size={22} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-eromza-text">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-eromza-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
