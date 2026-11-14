import { Search } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  ...props
}) {
  return (
    <label
      className={`flex h-10 items-center gap-2 rounded-lg border border-eromza-border bg-white px-3 text-sm text-eromza-muted transition focus-within:border-eromza-accent focus-within:ring-2 focus-within:ring-eromza-accent/10 ${className}`}
    >
      <Search size={16} className="shrink-0" />
      <span className="sr-only">{placeholder}</span>
      <input
        className="min-w-0 flex-1 bg-transparent text-sm text-eromza-text outline-none placeholder:text-eromza-subtle"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        {...props}
      />
    </label>
  );
}
