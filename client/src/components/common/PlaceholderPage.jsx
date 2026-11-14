import { Construction } from "lucide-react";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import PageHeader from "../ui/PageHeader";

export default function PlaceholderPage({
  title,
  roleLabel,
  description = "This module is connected to the navigation and ready for the next implementation stage.",
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={roleLabel ? `${roleLabel} workspace` : "Workspace"}
        title={title}
        description={description}
      />

      <Card className="p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-eromza-warning">
            <Construction size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-eromza-text">
                Module scaffolded
              </h2>
              <Badge variant="warning">Next stage</Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-eromza-muted">
              The route, role guard, and layout shell are in place. The page content,
              data table, filters, and API integration will be added in the next
              implementation phase.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
