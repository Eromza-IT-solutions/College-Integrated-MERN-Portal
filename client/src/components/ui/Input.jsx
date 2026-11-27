import { useId } from "react";

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  id,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium text-eromza-text"
        >
          {label}
        </label>
      ) : null}

      <div
        className={`flex h-10 items-center gap-2 rounded-lg border bg-white px-3 transition focus-within:ring-2 ${
          error
            ? "border-eromza-error focus-within:border-eromza-error focus-within:ring-eromza-error/10"
            : "border-eromza-border focus-within:border-eromza-accent focus-within:ring-eromza-accent/10"
        }`}
      >
        {Icon ? <Icon size={16} className="shrink-0 text-eromza-subtle" /> : null}
        <input
          id={inputId}
          className="min-w-0 flex-1 bg-transparent text-sm text-eromza-text outline-none placeholder:text-eromza-subtle"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
      </div>

      {error || hint ? (
        <p
          id={messageId}
          className={`mt-1.5 text-xs ${error ? "text-eromza-error" : "text-eromza-subtle"}`}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
