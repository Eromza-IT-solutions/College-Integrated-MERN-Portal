const VARIANTS = {
  primary:
    "bg-eromza-accent text-white shadow-sm hover:bg-eromza-accent-hover focus-visible:ring-eromza-accent/30",
  secondary:
    "border border-eromza-border bg-white text-eromza-text hover:bg-eromza-bg focus-visible:ring-eromza-accent/20",
  ghost:
    "text-eromza-muted hover:bg-eromza-bg hover:text-eromza-text focus-visible:ring-eromza-accent/20",
  danger:
    "bg-eromza-error text-white shadow-sm hover:bg-red-700 focus-visible:ring-eromza-error/30",
};

const SIZES = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export default function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  type,
  className = "",
  children,
  ...props
}) {
  const buttonProps = Component === "button" ? { type: type ?? "button" } : {};

  return (
    <Component
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...buttonProps}
      {...props}
    >
      {children}
    </Component>
  );
}
