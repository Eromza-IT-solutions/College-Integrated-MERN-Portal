export default function Card({ className = "", children, ...props }) {
  return (
    <section
      className={`rounded-card border border-eromza-border bg-white shadow-card ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-eromza-border px-5 py-4 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-eromza-text">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-eromza-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
