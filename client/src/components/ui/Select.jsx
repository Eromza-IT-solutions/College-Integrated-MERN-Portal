import { useId } from "react";
import { ChevronDown } from "lucide-react";

export default function Select({
  label,
  id,
  className = "",
  children,
  ...props
}) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-xs font-medium text-eromza-text"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          id={selectId}
          className="h-10 w-full appearance-none rounded-lg border border-eromza-border bg-white pl-3 pr-9 text-sm text-eromza-text outline-none transition focus:border-eromza-accent focus:ring-2 focus:ring-eromza-accent/10"
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-eromza-subtle"
        />
      </div>
    </div>
  );
}
