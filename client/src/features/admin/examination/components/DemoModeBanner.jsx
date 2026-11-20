import { Info } from "lucide-react";
import { DATA_SOURCE } from "../services/dataSource";

// Shown whenever the data on screen is sample data. Renders nothing for real data.
export default function DemoModeBanner({ source }) {
  if (source !== DATA_SOURCE.DEMO) return null;

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
    >
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">Demo data.</span> These are sample
        values for previewing the interface. They are not real college records,
        and nothing you do on this page is saved to a server.
      </p>
    </div>
  );
}
