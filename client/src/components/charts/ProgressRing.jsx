export default function ProgressRing({
  value,
  label,
  caption,
  color = "var(--color-eromza-success)",
  size = 160,
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="relative grid shrink-0 place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${color} 0 ${value}%, var(--color-eromza-border) ${value}% 100%)`,
        }}
      >
        <div
          className="grid place-items-center rounded-full bg-white"
          style={{ width: size * 0.7, height: size * 0.7 }}
        >
          <div>
            <p className="text-3xl font-semibold text-eromza-text">{value}%</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
              {label}
            </p>
          </div>
        </div>
      </div>
      {caption ? (
        <p className="max-w-[220px] text-xs leading-5 text-eromza-muted">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
