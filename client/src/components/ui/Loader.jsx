import { Loader2 } from "lucide-react";

export default function Loader({ label = "Loading...", className = "" }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-10 text-sm text-eromza-muted ${className}`}
      role="status"
    >
      <Loader2 size={18} className="animate-spin text-eromza-accent" />
      {label}
    </div>
  );
}
