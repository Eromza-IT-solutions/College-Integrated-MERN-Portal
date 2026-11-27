export default function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-eromza-border p-4"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-eromza-text">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-[11px] leading-5 text-eromza-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
        />
        <span className="block h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-eromza-accent peer-focus-visible:ring-2 peer-focus-visible:ring-eromza-accent/30" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
