const TONES = {
  accent: "bg-rose-50 text-eromza-accent",
  success: "bg-emerald-50 text-eromza-success",
  warning: "bg-amber-50 text-eromza-warning",
  info: "bg-blue-50 text-eromza-info",
  navy: "bg-slate-100 text-eromza-sidebar",
};

export default function ActivityFeed({ items, icons }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((activity) => {
        const Icon = icons[activity.icon];

        return (
          <div
            key={activity.id}
            className="flex gap-3 rounded-xl border border-eromza-border p-3"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${TONES[activity.tone] ?? TONES.navy}`}
            >
              {Icon ? <Icon size={16} /> : null}
            </span>
            <div className="min-w-0">
              <p className="text-sm leading-5 text-eromza-text">
                {activity.title}
              </p>
              <p className="mt-1 text-xs text-eromza-subtle">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
