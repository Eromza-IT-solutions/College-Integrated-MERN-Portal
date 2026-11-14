import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Globe2,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import ProgressRing from "../../../components/charts/ProgressRing";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import { ROLES } from "../../../config/roles";
import { superAdminPanels, systemOverview } from "../../../mocks/superAdminData";

const PANEL_ICONS = {
  globe: Globe2,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  shield: ShieldCheck,
};

const PANEL_TONES = {
  info: "bg-blue-50 text-eromza-info",
  accent: "bg-rose-50 text-eromza-accent",
  warning: "bg-amber-50 text-eromza-warning",
  success: "bg-emerald-50 text-eromza-success",
};

const PANEL_ROLES = {
  website: "websiteAdmin",
  admission: "admissionAdmin",
  exam: "examAdmin",
  super: "superAdmin",
};

export default function AdminPanels() {
  const totalAdmins = superAdminPanels.reduce(
    (sum, panel) => sum + panel.users,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Admin Panels"
        description="Review every administrative workspace, its assigned users, and current access status."
        actions={
          <>
            <Button as={Link} to="/super-admin/settings" variant="secondary">
              <Settings size={16} />
              System settings
            </Button>
            <Button as={Link} to="/super-admin/users">
              <Users size={16} />
              Manage users
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Admin panels"
          value={superAdminPanels.length.toLocaleString("en-IN")}
          tone="accent"
          icon={ShieldCheck}
        />
        <StatCard
          label="Panel administrators"
          value={totalAdmins.toLocaleString("en-IN")}
          tone="info"
          icon={Users}
        />
        <StatCard
          label="Active accounts"
          value={`${systemOverview.active}%`}
          tone="success"
          icon={Globe2}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {superAdminPanels.map((panel) => {
          const Icon = PANEL_ICONS[panel.icon] ?? ShieldCheck;
          const role = PANEL_ROLES[panel.id];
          const roleHome = ROLES[role]?.home ?? "/super-admin/dashboard";

          return (
            <Card key={panel.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${PANEL_TONES[panel.tone] ?? PANEL_TONES.info}`}
                >
                  <Icon size={20} />
                </span>
                <Badge variant="success">Active</Badge>
              </div>

              <h2 className="mt-4 text-sm font-semibold text-eromza-text">
                {panel.title}
              </h2>
              <p className="mt-1 text-xs leading-5 text-eromza-muted">
                {panel.description}
              </p>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-eromza-border pt-4">
                <span className="text-[11px] font-medium text-eromza-subtle">
                  {panel.users} administrators
                </span>
                <Button
                  as={Link}
                  to={roleHome}
                  variant="ghost"
                  size="sm"
                  className="text-eromza-accent hover:bg-rose-50"
                >
                  Open panel
                  <ArrowUpRight size={14} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title="Access overview"
          description="Active administrator accounts across the platform"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] md:items-center">
          <ProgressRing
            value={systemOverview.active}
            label="Active"
            caption={`${systemOverview.active}% of administrator accounts are active. ${systemOverview.inactive}% are inactive or pending review.`}
          />
          <div className="space-y-3">
            {superAdminPanels.map((panel) => (
              <div
                key={panel.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-eromza-border px-3 py-2"
              >
                <span className="text-xs text-eromza-text">{panel.title}</span>
                <Badge variant="info">{panel.users} users</Badge>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
