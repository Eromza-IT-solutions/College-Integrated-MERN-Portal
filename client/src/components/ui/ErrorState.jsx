import { AlertTriangle } from "lucide-react";
import Button from "./Button";

export default function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  onRetry,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-eromza-error">
        <AlertTriangle size={22} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-eromza-text">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-eromza-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
