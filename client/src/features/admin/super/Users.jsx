import { useMemo, useState } from "react";
import { Clock, Download, UserCheck, UserPlus, Users as UsersIcon } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { getRoleLabel, ROLE_KEYS } from "../../../config/roles";
import { superAdminUsers } from "../../../mocks/superAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const EMPTY_FORM = {
  name: "",
  email: "",
  role: "teacher",
  status: "active",
};

const userColumns = [
  {
    key: "name",
    header: "User",
    render: (user) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {user.name}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{user.email}</p>
      </div>
    ),
  },
  {
    key: "id",
    header: "User ID",
    render: (user) => (
      <span className="text-xs text-eromza-muted">{user.id}</span>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (user) => <Badge variant="neutral">{getRoleLabel(user.role)}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (user) => (
      <Badge variant={getStatusVariant(user.status)}>
        {formatStatus(user.status)}
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
];

export default function Users() {
  const [users, setUsers] = useState(superAdminUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const pendingUsers = users.filter((user) => user.status === "pending").length;

  const handleExport = () => {
    downloadCsv("eromza-users.csv", [
      ["ID", "Name", "Email", "Role", "Status", "Joined"],
      ...users.map((user) => [
        user.id,
        user.name,
        user.email,
        getRoleLabel(user.role),
        user.status,
        user.joined,
      ]),
    ]);
  };

  const handleAddUser = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setUsers((current) => [
      {
        id: `USR-${1009 + current.length}`,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        joined: "13 Nov 2026",
      },
      ...current,
    ]);
    setForm(EMPTY_FORM);
    setModalOpen(false);
  };

  const toggleStatus = (userId) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: user.status === "active" ? "deactivated" : "active",
            }
          : user,
      ),
    );
  };

  const columns = [
    ...userColumns,
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleStatus(user.id)}
        >
          {user.status === "active" ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User administration"
        title="Users"
        description="Manage platform accounts, assign roles, and control access across every admin panel."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export CSV
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus size={16} />
              Add user
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total users"
          value={users.length.toLocaleString("en-IN")}
          tone="info"
          icon={UsersIcon}
        />
        <StatCard
          label="Active accounts"
          value={activeUsers.toLocaleString("en-IN")}
          tone="success"
          icon={UserCheck}
        />
        <StatCard
          label="Pending invitations"
          value={pendingUsers.toLocaleString("en-IN")}
          tone="warning"
          icon={Clock}
        />
      </div>

      <Card>
        <CardBody className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or user ID"
          />
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All roles</option>
            {ROLE_KEYS.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="deactivated">Deactivated</option>
          </Select>
        </CardBody>
        <DataTable
          columns={columns}
          rows={filteredUsers}
          emptyTitle="No users match your filters"
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add user"
        description="Create a platform account and assign an initial role."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form">
              <UserPlus size={16} />
              Add user
            </Button>
          </>
        }
      >
        <form id="add-user-form" className="space-y-4" onSubmit={handleAddUser}>
          <Input
            label="Full name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Enter full name"
            required
          />
          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="name@abcedu.in"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value }))
              }
            >
              {ROLE_KEYS.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
