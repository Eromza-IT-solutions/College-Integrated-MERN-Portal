import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  Download,
  FileText,
  GraduationCap,
  Image,
  Megaphone,
  Plus,
} from "lucide-react";
import ActivityFeed from "../../../components/common/ActivityFeed";
import BarList from "../../../components/charts/BarList";
import ProgressRing from "../../../components/charts/ProgressRing";
import TrendChart from "../../../components/charts/TrendChart";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import {
  websiteActivities,
  websiteAdminKpis,
  websiteContentMix,
  websiteNotices,
  websiteRecentContent,
  websiteTrafficSeries,
} from "../../../mocks/websiteAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const KPI_ICONS = {
  pages: FileText,
  building: Building2,
  faculty: GraduationCap,
  notices: Megaphone,
};

const ACTIVITY_ICONS = {
  megaphone: Megaphone,
  file: FileText,
  faculty: GraduationCap,
  image: Image,
  document: FileText,
};

const contentColumns = [
  {
    key: "title",
    header: "Content",
    render: (content) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {content.title}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {content.id} · {content.author}
        </p>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (content) => <Badge variant="neutral">{content.type}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (content) => (
      <Badge variant={getStatusVariant(content.status)}>
        {formatStatus(content.status)}
      </Badge>
    ),
  },
  {
    key: "updated",
    header: "Updated",
    render: (content) => (
      <span className="text-xs text-eromza-muted">{content.updated}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    cellClassName: "text-right",
    render: () => (
      <Button
        as={Link}
        to="/website-admin/content"
        variant="ghost"
        size="sm"
        className="text-eromza-accent hover:bg-rose-50"
      >
        Open
      </Button>
    ),
  },
];

export default function WebsiteAdminDashboard() {
  const handleExport = () => {
    downloadCsv("eromza-website-report.csv", [
      ["Metric", "Value"],
      ...websiteAdminKpis.map((kpi) => [kpi.label, kpi.value]),
      ["Monthly visits", websiteTrafficSeries.values.at(-1)],
      ["Content items", websiteContentMix.reduce((sum, item) => sum + item.value, 0)],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website administration"
        title="Website Admin Dashboard"
        description="Keep the public college website current, structured, and easy for prospective students to explore."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export report
            </Button>
            <Button as={Link} to="/website-admin/content">
              <Plus size={16} />
              New content
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {websiteAdminKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            tone={kpi.tone}
            icon={KPI_ICONS[kpi.icon]}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Website visits"
            description="Monthly traffic across the last six months"
            action={<Badge variant="success">+12.8%</Badge>}
          />
          <CardBody>
            <TrendChart
              labels={websiteTrafficSeries.labels}
              values={websiteTrafficSeries.values}
              ariaLabel="Website visits over the last six months"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Content health"
            description="Published content across the website"
          />
          <CardBody className="space-y-6">
            <ProgressRing
              value={92}
              label="Live"
              caption="22 of 24 pages are published and visible to visitors."
            />
            <BarList
              items={websiteContentMix}
              valueFormatter={(value) => `${value} items`}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Recent content"
            description="Latest pages, notices, and media updates"
            action={
              <Button
                as={Link}
                to="/website-admin/content"
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <DataTable
            columns={contentColumns}
            rows={websiteRecentContent}
            emptyTitle="No content found"
          />
        </Card>

        <Card>
          <CardHeader
            title="Publishing queue"
            description="Notices waiting for attention"
            action={
              <Button
                as={Link}
                to="/website-admin/notices"
                variant="ghost"
                size="sm"
              >
                Manage
                <ArrowUpRight size={14} />
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {websiteNotices.slice(0, 4).map((notice) => (
              <div
                key={notice.id}
                className="rounded-xl border border-eromza-border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-5 text-eromza-text">
                    {notice.title}
                  </p>
                  <Badge
                    variant={notice.priority === "High" ? "accent" : "neutral"}
                  >
                    {notice.priority}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-eromza-subtle">
                  <Badge variant={getStatusVariant(notice.status)}>
                    {formatStatus(notice.status)}
                  </Badge>
                  <span>{notice.publishDate}</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Latest website administration actions"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody>
          <ActivityFeed items={websiteActivities} icons={ACTIVITY_ICONS} />
        </CardBody>
      </Card>
    </div>
  );
}
