import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  FolderOpen,
  Image,
  Plus,
  Video,
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
import { websiteGallery } from "../../../mocks/websiteAdminData";
import { downloadCsv } from "../../../utils/csv";
import { formatStatus, getStatusVariant } from "../../../utils/status";

const PAGE_SIZE = 6;

const TYPE_ICONS = {
  "Photo album": Image,
  Document: FileText,
  Video: Video,
};

const ASSET_TYPES = ["Photo album", "Document", "Video"];

export default function GalleryAndDocuments() {
  const [rows, setRows] = useState(websiteGallery);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "Photo album",
    category: "Campus Life",
    status: "draft",
  });

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        row.title.toLowerCase().includes(search) ||
        row.category.toLowerCase().includes(search);
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
    total: rows.length,
    albums: rows.filter((row) => row.type === "Photo album").length,
    documents: rows.filter((row) => row.type === "Document").length,
    published: rows.filter((row) => row.status === "published").length,
  };

  const handleExport = () => {
    downloadCsv("eromza-website-gallery.csv", [
      ["Asset", "Type", "Category", "Files", "Size", "Status", "Updated"],
      ...filteredRows.map((row) => [
        row.title,
        row.type,
        row.category,
        row.files,
        row.size,
        row.status,
        row.updated,
      ]),
    ]);
  };

  const handleAddAsset = (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;

    const nextRow = {
      id: `GAL-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      category: form.category,
      files: 0,
      size: "0 MB",
      status: form.status,
      updated: "Just now",
      description:
        "This media item is ready for files to be uploaded and published to the website.",
    };

    setRows((current) => [nextRow, ...current]);
    setForm({
      title: "",
      type: "Photo album",
      category: "Campus Life",
      status: "draft",
    });
    setIsAddOpen(false);
    setPage(1);
  };

  const columns = [
    {
      key: "title",
      header: "Asset",
      render: (row) => {
        const Icon = TYPE_ICONS[row.type] ?? FolderOpen;

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
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.category}</span>
      ),
    },
    {
      key: "files",
      header: "Files",
      render: (row) => (
        <span className="text-xs font-medium text-eromza-text">{row.files}</span>
      ),
    },
    {
      key: "size",
      header: "Size",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{row.size}</span>
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
          onClick={() => setSelectedAsset(row)}
          className="text-eromza-accent hover:bg-rose-50"
        >
          <Eye size={14} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website administration"
        title="Gallery & Documents"
        description="Manage campus photo albums, event galleries, videos, and public documents."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Export library
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus size={16} />
              Add media
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Media Assets"
          value={String(counts.total)}
          icon={FolderOpen}
          tone="info"
        />
        <StatCard
          label="Photo Albums"
          value={String(counts.albums)}
          icon={Image}
          tone="accent"
        />
        <StatCard
          label="Documents"
          value={String(counts.documents)}
          icon={FileText}
          tone="warning"
        />
        <StatCard
          label="Published"
          value={String(counts.published)}
          icon={Eye}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader
          title="Media library"
          description="Public galleries and documents available on the college website"
        />

        <div className="flex flex-col gap-3 border-b border-eromza-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by title or category..."
            className="w-full sm:max-w-xs"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter media by type"
              className="min-w-[150px]"
            >
              <option value="all">All types</option>
              {ASSET_TYPES.map((type) => (
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
              aria-label="Filter media by status"
              className="min-w-[150px]"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="review">In review</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          emptyTitle="No media found"
          emptyDescription="Try adjusting the search or filters."
        />

        <div className="flex flex-col gap-3 border-t border-eromza-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-eromza-subtle">
            Showing {pageRows.length} of {filteredRows.length} media assets
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
        title="Add media"
        description="Create a new gallery or document entry for the website."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="media-form">
              Add media
            </Button>
          </>
        }
      >
        <form id="media-form" onSubmit={handleAddAsset} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Annual Day 2026"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>

            <Select
              label="Category"
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
            >
              <option value="Campus Life">Campus Life</option>
              <option value="Events">Events</option>
              <option value="Academics">Academics</option>
              <option value="Admissions">Admissions</option>
              <option value="Accreditation">Accreditation</option>
              <option value="Compliance">Compliance</option>
            </Select>
          </div>

          <Select
            label="Status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="published">Published</option>
          </Select>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.title ?? "Media preview"}
        description={selectedAsset?.id}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedAsset(null)}>
            Close
          </Button>
        }
      >
        {selectedAsset ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{selectedAsset.type}</Badge>
              <Badge variant="info">{selectedAsset.category}</Badge>
              <Badge variant={getStatusVariant(selectedAsset.status)}>
                {formatStatus(selectedAsset.status)}
              </Badge>
            </div>

            <div className="rounded-lg bg-eromza-bg p-4 text-sm leading-6 text-eromza-muted">
              {selectedAsset.description}
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Files
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedAsset.files}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Total size
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedAsset.size}
                </dd>
              </div>
              <div className="rounded-lg bg-eromza-bg p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Last updated
                </dt>
                <dd className="mt-1 text-sm font-semibold text-eromza-text">
                  {selectedAsset.updated}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
