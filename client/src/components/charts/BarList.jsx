export default function BarList({
  items,
  color = "#a9233d",
  valueFormatter = (value) => value,
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-eromza-text">{item.label}</span>
            <span className="font-semibold text-eromza-muted">
              {valueFormatter(item.value)}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-eromza-bg">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
