export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-eromza-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-eromza-text sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-eromza-muted">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
