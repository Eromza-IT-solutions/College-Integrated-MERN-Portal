import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-eromza-sidebar/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${SIZES[size]} rounded-card border border-eromza-border bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-eromza-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-eromza-text">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-eromza-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-eromza-muted transition hover:bg-eromza-bg hover:text-eromza-text"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-eromza-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
