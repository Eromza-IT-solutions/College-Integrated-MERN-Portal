import { useMemo, useState } from "react";
import { BellRing, CalendarClock, Download, Megaphone, Plus } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import StatCard from "../../../components/ui/StatCard";
import { websiteNotices } from "../../../mocks/websiteAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const PRIORITY_VARIANTS = {
  High: "accent",
  Medium: "warning",
  Low: "neutral",
};

export default function NoticesAndAnnouncements() {
  const [rows, setRows] = useState(websiteNotices);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    priority: "Medium",
    status: "draft",
    publishDate: "",
  });

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.title.toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || row.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, query, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    published: rows.filter((row) => row.status === "published").length,
    scheduled: rows.filter((row) => row.status === "scheduled").length,
    draft: rows.filter((row) => row.status === "draft").length,
  };

  const handleExport = () => {
    downloadCsv("eromza-website-notices.csv", [
      ["ID", "Notice", "Priority", "Status", "Publish date"],
      ...filteredRows.map((row) => [
        row.id,
        row.title,
        row.priority,
        row.status,
        row.publishDate,
      ]),
    ]);
  };

  const handleCreateNotice = (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;

    const nextRow = {
      id: `NTC-${Date.now()}`,
      title: form.title.trim(),
      priority: form.priority,
      status: form.status,
      publishDate: form.publishDate.trim() || "Not scheduled",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      title: "",
      priority: "Medium",
      status: "draft",
      publishDate: "",
    });
    setIsCreateOpen(false);
    setPage(1);
  };

  const togglePublished = (noticeId) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== noticeId) return row;

        const isPublished = row.status === "published";
        return {
          ...row,
          status: isPublished ? "draft" : "published",
          publishDate: isPublished ? "Not scheduled" : "Today",
        };
      }),
    );
  };

  const columns = [
    {
      key: "title",
      header: "Notice",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.title}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <Badge variant={PRIORITY_VARIANTS[row.priority] ?? "neutral"}>
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: "publishDate",
      header: "Publish date",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.publishDate}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => togglePublished(row.id)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          {row.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website administration"
        title="Notices & Announcements"
        description="Publish timely updates for students, parents, and prospective applicants."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export notices
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              Create notice
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Published"
          value={String(counts.published)}
          icon={Megaphone}
          tone="success"
        />
        <StatCard
          label="Scheduled"
          value={String(counts.scheduled)}
          icon={CalendarClock}
          tone="info"
        />
        <StatCard
          label="Drafts"
          value={String(counts.draft)}
          icon={BellRing}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader
          title="Notice board"
          description="Published, scheduled, and draft announcements"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search notices..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by notice status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
            </Select>

            <Select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by priority"
              className="min-w-[150px]"
            >
              <option value="all">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No notices found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} notices
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create notice"
        description="Draft a notice and choose when it should appear on the website."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="notice-form">
              Create notice
            </Button>
          </>
        }
      >
        <form id="notice-form" onSubmit={handleCreateNotice} className="space-y-4">
          <Input
            label="Notice title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Enter notice title"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>

            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </Select>
          </div>

          <Input
            label="Publish date"
            value={form.publishDate}
            onChange={(event) =>
              setForm({ ...form, publishDate: event.target.value })
            }
            placeholder="e.g. 20 Nov 2026"
          />
        </form>
      </Modal>
    </div>
  );
}
