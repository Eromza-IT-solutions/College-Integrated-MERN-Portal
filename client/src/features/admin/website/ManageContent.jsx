import { useMemo, useState } from "react";
import {
  Clock3,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
} from "lucide-react";
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
import { websiteContentLibrary } from "../../../mocks/websiteAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const CONTENT_TYPES = ["Page", "Notice", "Gallery", "Faculty", "Document"];

const TYPE_ICONS = {
  Page: FileText,
  Notice: FileText,
  Gallery: FileText,
  Faculty: FileText,
  Document: FileText,
};

export default function ManageContent() {
  const [rows, setRows] = useState(websiteContentLibrary);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [form, setForm] = useState({
    title: "",
    type: "Page",
    status: "draft",
    summary: "",
  });

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.title.toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search) ||
        row.author.toLowerCase().includes(search);
      const matchesType = typeFilter === "all" || row.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [query, rows, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const counts = {
    published: rows.filter((row) => row.status === "published").length,
    draft: rows.filter((row) => row.status === "draft").length,
    review: rows.filter((row) => row.status === "review").length,
  };

  const handleExport = () => {
    downloadCsv("eromza-website-content.csv", [
      ["ID", "Title", "Type", "Status", "Author", "Updated"],
      ...filteredRows.map((row) => [
        row.id,
        row.title,
        row.type,
        row.status,
        row.author,
        row.updated,
      ]),
    ]);
  };

  const handleAddContent = (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;

    const nextRow = {
      id: `CNT-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      updated: "Just now",
      author: "Ayesha Khan",
      summary:
        form.summary.trim() ||
        "This content item is ready for review and publishing.",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({ title: "", type: "Page", status: "draft", summary: "" });
    setIsAddOpen(false);
    setPage(1);
  };

  const columns = [
    {
      key: "title",
      header: "Content",
      render: (row) => {
        const Icon = TYPE_ICONS[row.type] ?? FileText;

        return (
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-eromza-bg text-eromza-accent">
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-eromza-text">
                {row.title}
              </p>
              <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <Badge variant="neutral">{row.type}</Badge>,
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
      key: "author",
      header: "Author",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.author}</span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.updated}</span>
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
          onClick={() => setSelectedContent(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Eye size={14} />
          Preview
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website administration"
        title="Manage Content"
        description="Create, review, and publish pages, notices, faculty profiles, galleries, and documents."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export content
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              New content
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Published"
          value={String(counts.published)}
          icon={FileText}
          tone="success"
        />
        <StatCard
          label="Drafts"
          value={String(counts.draft)}
          icon={Pencil}
          tone="warning"
        />
        <StatCard
          label="In review"
          value={String(counts.review)}
          icon={Clock3}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Content library"
          description="All website content across the public site"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by title, ID, or author..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by content type"
              className="min-w-[150px]"
            >
              <option value="all">All types</option>
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by content status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="review">In review</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No content found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} content items
          </p>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create content"
        description="Add a new content item to the website library."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="content-form">
              Create content
            </Button>
          </>
        }
      >
        <form id="content-form" onSubmit={handleAddContent} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Enter content title"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
            </Select>
          </div>

          <Input
            label="Summary"
            value={form.summary}
            onChange={(event) =>
              setForm({ ...form, summary: event.target.value })
            }
            placeholder="Short summary for the content team"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedContent)}
        onClose={() => setSelectedContent(null)}
        title={selectedContent?.title ?? "Content preview"}
        description={selectedContent?.id}
        footer={
          <Button variant="secondary" onClick={() => setSelectedContent(null)}>
            Close
          </Button>
        }
      >
        {selectedContent ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{selectedContent.type}</Badge>
              <Badge variant={getStatusVariant(selectedContent.status)}>
                {formatStatus(selectedContent.status)}
              </Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Author
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedContent.author}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Last updated
                </dt>
                <dd className="mt-1 text-sm font-medium text-eromza-text">
                  {selectedContent.updated}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg bg-eromza-bg p-3 text-sm leading-6 text-eromza-muted">
              {selectedContent.summary ??
                "This content item is part of the public website library. Connect the content API to load the full body and publishing workflow."}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
