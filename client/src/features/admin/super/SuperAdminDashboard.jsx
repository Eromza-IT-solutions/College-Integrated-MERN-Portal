import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Globe2,
  LayoutGrid,
  Plus,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { ROLES } from "../../../config/roles";
import {
  reportSeries,
  superAdminActivities,
  superAdminKpis,
  superAdminPanels,
  superAdminUsers,
  systemOverview,
} from "../../../mocks/superAdminData";
import { downloadCsv } from "../../../utils/csv";
import { getInitials } from "../../../utils/initials";

const PAGE_SIZE = 5;

const KPI_ICONS = {
  users: Users,
  panels: LayoutGrid,
  reports: FileText,
  shield: ShieldCheck,
};

const ACTIVITY_ICONS = {
  user: UserPlus,
  settings: Settings,
  report: BarChart3,
  check: CheckCircle2,
  shield: ShieldCheck,
};

const PANEL_ICONS = {
  globe: Globe2,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  shield: ShieldCheck,
};

const TONES = {
  accent: "bg-rose-50 text-eromza-accent",
  success: "bg-emerald-50 text-eromza-success",
  warning: "bg-amber-50 text-eromza-warning",
  info: "bg-blue-50 text-eromza-info",
  navy: "bg-slate-100 text-eromza-sidebar",
};

function getStatusVariant(status) {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  if (status === "deactivated") return "error";
  return "neutral";
}

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState(superAdminUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "student",
  });

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleExportReport = () => {
    downloadCsv("eromza-system-report.csv", [
      ["Metric", "Value"],
      ...superAdminKpis.map((kpi) => [kpi.label, kpi.value]),
      ["Active accounts", `${systemOverview.active}%`],
      ["Inactive accounts", `${systemOverview.inactive}%`],
    ]);
  };

  const handleExportUsers = () => {
    downloadCsv("eromza-users.csv", [
      ["Name", "Email", "Role", "Status", "Joined"],
      ...filteredUsers.map((user) => [
        user.name,
        user.email,
        ROLES[user.role]?.label ?? user.role,
        user.status,
        user.joined,
      ]),
    ]);
  };

  const handleAddUser = (event) => {
    event.preventDefault();

    if (!newUser.name.trim() || !newUser.email.trim()) return;

    const nextUser = {
      id: `USR-${Date.now()}`,
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      role: newUser.role,
      status: "active",
      joined: "Today",
    };

    setUsers((current) => [nextUser, ...current]);
    setNewUser({ name: "", email: "", role: "student" });
    setIsAddOpen(false);
    setPage(1);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const userColumns = [
    {
      key: "name",
      header: "User",
      render: (user) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-eromza-bg text-[11px] font-semibold text-eromza-sidebar">
            {getInitials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-eromza-text">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-eromza-subtle">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <Badge variant="neutral">{ROLES[user.role]?.label ?? user.role}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <Badge variant={getStatusVariant(user.status)}>
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (user) => (
        <span className="text-xs text-eromza-muted">{user.joined}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewUser(user)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System administration"
        title="Super Admin Dashboard"
        description="Welcome back, Iqra. Here is what is happening across the college system today."
        actions={
          <>
            <Button variant="secondary" onClick={handleExportReport}>
              <Download size={16} />
              Export report
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              Add user
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {superAdminKpis.map((kpi) => (
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
            title="Reports generated"
            description="Monthly report volume across the last six months"
            action={<Badge variant="success">+18.6%</Badge>}
          />
          <CardBody>
            <ReportChart />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="System overview"
            description="Account activity at a glance"
          />
          <CardBody>
            <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col">
              <div
                className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--color-eromza-success) 0 ${systemOverview.active}%, var(--color-eromza-border) ${systemOverview.active}% 100%)`,
                }}
              >
                <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                  <div>
                    <p className="text-3xl font-semibold text-eromza-text">
                      {systemOverview.active}%
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                      Active
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-eromza-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-eromza-success" />
                    Active accounts
                  </span>
                  <span className="font-semibold text-eromza-text">
                    {systemOverview.active}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-eromza-muted">
                    <span className="h-2.5 w-2.5 rounded-full bg-eromza-border" />
                    Inactive accounts
                  </span>
                  <span className="font-semibold text-eromza-text">
                    {systemOverview.inactive}%
                  </span>
                </div>
                <div className="rounded-lg bg-eromza-bg p-3 text-xs leading-5 text-eromza-muted">
                  All critical services are operational. Last checked 2 minutes
                  ago.
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Manage users"
            description="Recently added and active accounts"
            action={
              <Button
                as={Link}
                to="/super-admin/users"
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowUpRight size={14} />
              </Button>
            }
          />

          <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full sm:max-w-xs"
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by role"
                className="min-w-[140px]"
              >
                <option value="all">All roles</option>
                {Object.entries(ROLES).map(([key, role]) => (
                  <option key={key} value={key}>
                    {role.label}
                  </option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
                className="min-w-[140px]"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="deactivated">Deactivated</option>
              </Select>
            </div>
          </div>

          <DataTable
            columns={userColumns}
            rows={pageUsers}
            emptyTitle="No users found"
            emptyDescription="Try adjusting the search or filters."
          />

          <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-eromza-subtle">
                Showing {pageUsers.length} of {filteredUsers.length} users
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportUsers}
                className="px-2"
              >
                <Download size={14} />
                Export users
              </Button>
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Admin panels"
            description="Role-specific workspaces"
          />
          <CardBody className="space-y-3">
            {superAdminPanels.map((panel) => {
              const Icon = PANEL_ICONS[panel.icon];

              return (
                <div
                  key={panel.id}
                  className="rounded-xl border border-eromza-border p-4 transition hover:border-eromza-accent/30 hover:bg-eromza-bg/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[panel.tone]}`}
                    >
                      <Icon size={18} />
                    </span>
                    <Badge variant="neutral">{panel.users} users</Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-eromza-text">
                    {panel.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-eromza-muted">
                    {panel.description}
                  </p>
                  <Button
                    as={Link}
                    to="/super-admin/admin-panels"
                    variant="ghost"
                    size="sm"
                    className="mt-3 px-0 text-eromza-accent hover:bg-transparent"
                  >
                    Manage
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          description="Latest actions across the system"
          action={<Badge variant="neutral">Live</Badge>}
        />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {superAdminActivities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.icon];

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 rounded-xl border border-eromza-border p-3"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${TONES[activity.tone]}`}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-5 text-eromza-text">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs text-eromza-subtle">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <AddUserModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        form={newUser}
        setForm={setNewUser}
        onSubmit={handleAddUser}
      />

      <UserDetailsModal
        user={selectedUser}
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}

function ReportChart() {
  const { labels, values } = reportSeries;
  const width = 560;
  const height = 220;
  const paddingX = 28;
  const paddingY = 24;
  const max = Math.max(...values) * 1.15;

  const points = values.map((value, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (values.length - 1);
    const y =
      height - paddingY - (value / max) * (height - paddingY * 2);
    return { x, y, value };
  });

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${paddingX},${height - paddingY} ${line} ${width - paddingX},${height - paddingY}`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label="Reports generated over the last six months"
      >
        <defs>
          <linearGradient id="reports-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a9233d" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#a9233d" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((lineIndex) => {
          const y =
            paddingY + (lineIndex * (height - paddingY * 2)) / 3;
          return (
            <line
              key={lineIndex}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="#e5e9f0"
              strokeDasharray="4 4"
            />
          );
        })}

        <polygon points={area} fill="url(#reports-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#a9233d"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <circle
            key={point.x}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#ffffff"
            stroke="#a9233d"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className="mt-2 grid grid-cols-6 text-center text-[11px] text-eromza-subtle">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function AddUserModal({ open, onClose, form, setForm, onSubmit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add user"
      description="Create a demo account and assign a role. This will connect to the user API in the next stage."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-user-form">
            Add user
          </Button>
        </>
      }
    >
      <form id="add-user-form" onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Enter full name"
          required
        />

        <Input
          label="Email address"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="name@abcedu.in"
          required
        />

        <Select
          label="Role"
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
        >
          {Object.entries(ROLES).map(([key, role]) => (
            <option key={key} value={key}>
              {role.label}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

function UserDetailsModal({ user, open, onClose }) {
  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="User details"
      description={user.email}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-eromza-bg p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
            Full name
          </dt>
          <dd className="mt-1 text-sm font-medium text-eromza-text">
            {user.name}
          </dd>
        </div>
        <div className="rounded-lg bg-eromza-bg p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
            Role
          </dt>
          <dd className="mt-1 text-sm font-medium text-eromza-text">
            {ROLES[user.role]?.label ?? user.role}
          </dd>
        </div>
        <div className="rounded-lg bg-eromza-bg p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
            Status
          </dt>
          <dd className="mt-1">
            <Badge variant={getStatusVariant(user.status)}>
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </Badge>
          </dd>
        </div>
        <div className="rounded-lg bg-eromza-bg p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
            Joined
          </dt>
          <dd className="mt-1 text-sm font-medium text-eromza-text">
            {user.joined}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
