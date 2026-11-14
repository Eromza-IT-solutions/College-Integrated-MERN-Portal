import { useMemo, useState } from "react";
import { Download, ScrollText, ShieldAlert, ShieldCheck } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import PageHeader from "../../../components/ui/PageHeader";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { superAdminAuditLogs } from "../../../mocks/superAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const auditColumns = [
  {
    key: "action",
    header: "Activity",
    render: (log) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {log.action}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {log.id} · {log.time}
        </p>
      </div>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    render: (log) => (
      <div className="min-w-0">
        <p className="truncate text-xs text-eromza-text">{log.actor}</p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{log.role}</p>
      </div>
    ),
  },
  {
    key: "module",
    header: "Module",
    render: (log) => <Badge variant="neutral">{log.module}</Badge>,
  },
  {
    key: "ip",
    header: "IP address",
    render: (log) => (
      <span className="font-mono text-[11px] text-eromza-muted">{log.ip}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (log) => (
      <Badge variant={getStatusVariant(log.status)}>
        {formatStatus(log.status)}
      </Badge>
    ),
  },
];

const MODULES = [
  "Authentication",
  "Admissions",
  "Examinations",
  "Website",
  "Users",
  "Reports",
  "Settings",
];

export default function AuditLogs() {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();

    return superAdminAuditLogs.filter((log) => {
      const matchesSearch =
        !search ||
        log.actor.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.id.toLowerCase().includes(search);
      const matchesModule =
        moduleFilter === "all" || log.module === moduleFilter;
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [moduleFilter, query, statusFilter]);

  const successful = superAdminAuditLogs.filter(
    (log) => log.status === "success",
  ).length;
  const failed = superAdminAuditLogs.filter(
    (log) => log.status === "failed",
  ).length;

  const handleExport = () => {
    downloadCsv("eromza-audit-logs.csv", [
      ["ID", "Actor", "Role", "Action", "Module", "IP", "Time", "Status"],
      ...superAdminAuditLogs.map((log) => [
        log.id,
        log.actor,
        log.role,
        log.action,
        log.module,
        log.ip,
        log.time,
        log.status,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Audit Logs"
        description="Review platform activity, authentication events, and administrative actions."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Export logs
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total events"
          value={superAdminAuditLogs.length.toLocaleString("en-IN")}
          tone="info"
          icon={ScrollText}
        />
        <StatCard
          label="Successful actions"
          value={successful.toLocaleString("en-IN")}
          tone="success"
          icon={ShieldCheck}
        />
        <StatCard
          label="Failed attempts"
          value={failed.toLocaleString("en-IN")}
          tone="warning"
          icon={ShieldAlert}
        />
      </div>

      <Card>
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by actor, action, or log ID"
          />
          <Select
            aria-label="Filter by module"
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
          >
            <option value="all">All modules</option>
            {MODULES.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </Select>
        </CardBody>
        <DataTable
          columns={auditColumns}
          rows={filteredLogs}
          emptyTitle="No audit events match your filters"
        />
      </Card>
    </div>
  );
}
