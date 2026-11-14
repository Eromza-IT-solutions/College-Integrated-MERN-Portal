const VARIANTS = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/10",
  error: "bg-rose-50 text-rose-700 ring-rose-600/10",
  info: "bg-blue-50 text-blue-700 ring-blue-600/10",
  accent: "bg-rose-50 text-eromza-accent ring-eromza-accent/10",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export default function Badge({ variant = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
