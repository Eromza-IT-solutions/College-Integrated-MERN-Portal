import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  className = "",
}) {
  return (
    <nav
      className={`flex items-center justify-between gap-3 ${className}`}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange?.(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-eromza-border bg-white px-2.5 text-xs font-medium text-eromza-muted transition hover:bg-eromza-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft size={14} />
        Previous
      </button>

      <span className="text-xs text-eromza-subtle">
        Page {page} of {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange?.(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-eromza-border bg-white px-2.5 text-xs font-medium text-eromza-muted transition hover:bg-eromza-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}
