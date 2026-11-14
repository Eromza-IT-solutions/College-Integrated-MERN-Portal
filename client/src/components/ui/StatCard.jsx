import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Card from "./Card";

const TONES = {
  accent: "bg-rose-50 text-eromza-accent",
  success: "bg-emerald-50 text-eromza-success",
  warning: "bg-amber-50 text-eromza-warning",
  info: "bg-blue-50 text-eromza-info",
  navy: "bg-slate-100 text-eromza-sidebar",
};

export default function StatCard({
  label,
  value,
  change,
  changeLabel = "vs last month",
  icon: Icon,
  tone = "navy",
}) {
  const isPositive = !String(change ?? "").startsWith("-");

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-eromza-text">
            {value}
          </p>
        </div>
        {Icon ? (
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONES[tone] ?? TONES.navy}`}
          >
            <Icon size={19} />
          </span>
        ) : null}
      </div>

      {change ? (
        <p
          className={`mt-4 flex items-center gap-1 text-xs font-medium ${
            isPositive ? "text-eromza-success" : "text-eromza-error"
          }`}
        >
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
          <span className="font-normal text-eromza-subtle">{changeLabel}</span>
        </p>
      ) : null}
    </Card>
  );
}
