
import { useMemo, useState } from "react";
import { useApiData } from "../../../hooks/useApiData";
import {
  displayStatus,
  fetchContent,
  fetchContentItem,
  formatShortDate,
  publishContent,
  removeContent,
  saveContent,
  unpublishContent,
} from "../../../services/websiteApi";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Globe,
  Clock,
  CheckCircle2,
  FileEdit,
  X,
  ArrowUpRight,
  LayoutDashboard,
  Save,
  CalendarDays,
  Filter,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";

// A website page as this screen shows it, made from the stored content item.
const toPage = (item) => ({
  id: item.id,
  title: item.title,
  category: item.category || "Other",
  description: item.body ?? item.summary ?? "",
  status: displayStatus(item) === "Draft" ? "Draft" : "Published",
  updated: formatShortDate(item.updatedAt || item.publishedAt),
  raw: item,
});

function ManageContent() {
  const { data, loading, error, reload } = useApiData(() => fetchContent("page"));
  const pages = useMemo(() => (data?.items ?? []).map(toPage), [data]);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [previewPage, setPreviewPage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "Main Pages",
    description: "",
    status: "Draft",
  });

  const totalPages = pages.length;
  const publishedPages = pages.filter(
    (page) => page.status === "Published"
  ).length;
  const draftPages = pages.filter(
    (page) => page.status === "Draft"
  ).length;

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.category.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || page.status === filter;

    return matchesSearch && matchesFilter;
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      title: "",
      category: "Main Pages",
      description: "",
      status: "Draft",
    });
    setShowModal(true);
  };

  // The list carries only a short summary; load the full text before editing or previewing.
  const withFullText = async (page) => {
    try {
      return toPage(await fetchContentItem(page.id));
    } catch {
      return page;
    }
  };

  const openEditModal = async (page) => {
    const full = await withFullText(page);
    setEditingId(full.id);
    setFormData({
      title: full.title,
      category: full.category,
      description: full.description,
      status: full.status,
    });
    setShowModal(true);
  };

  const openPreview = async (page) => setPreviewPage(await withFullText(page));

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || saving) return;

    const description = formData.description.trim();
    const current = pages.find((page) => page.id === editingId)?.raw;

    setSaving(true);
    try {
      await saveContent({
        id: editingId,
        type: "page",
        current,
        fields: {
          title: formData.title.trim(),
          category: formData.category,
          summary: description.slice(0, 500),
          body: description,
        },
        want: formData.status === "Published" ? "published" : "draft",
      });
      setShowModal(false);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSaving(false);
      reload();
    }
  };

  const togglePublish = async (id) => {
    const page = pages.find((item) => item.id === id);
    if (!page) return;
    try {
      if (page.status === "Published") await unpublishContent(id);
      else await publishContent(id);
    } catch (err) {
      window.alert(err.message);
    } finally {
      reload();
    }
  };

  const deletePage = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this page?"
    );

    if (!confirmed) return;
    const page = pages.find((item) => item.id === id);
    try {
      await removeContent(page.raw);
    } catch (err) {
      window.alert(err.message);
    } finally {
      reload();
    }
  };

  const stats = [
    {
      title: "Total Pages",
      value: totalPages,
      subtitle: "All website pages",
      icon: FileText,
      color: "text-[#142B50]",
      bg: "bg-[#142B50]/10",
      border: "border-t-[#142B50]",
    },
    {
      title: "Published",
      value: publishedPages,
      subtitle: "Live on website",
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      border: "border-t-emerald-600",
    },
    {
      title: "Draft Pages",
      value: draftPages,
      subtitle: "Waiting for publishing",
      icon: FileEdit,
      color: "text-[#A00018]",
      bg: "bg-[#A00018]/10",
      border: "border-t-[#A00018]",
    },
    {
      title: "Content Updates",
      value: pages.length,
      subtitle: "Managed content records",
      icon: Globe,
      color: "text-[#997000]",
      bg: "bg-[#D4AF37]/20",
      border: "border-t-[#D4AF37]",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 pb-6">

      {/* Page Heading */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#101D3A] via-[#172E55] to-[#8E0018] p-6 text-white shadow-xl md:p-8">

        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">

          <div>
            <div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-white/10 px-3 py-1.5">
              <LayoutDashboard size={14} className="text-[#FFD76A]" />
              <span className="text-xs font-semibold tracking-wider text-[#FFE8A3]">
                WEBSITE MANAGEMENT
              </span>
            </div>

            <h1 className="text-2xl font-extrabold md:text-3xl">
              Manage Website Content
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Create, edit and manage your college website pages.
              Keep your website information accurate and up to date.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#172951] shadow-lg transition hover:-translate-y-1 hover:bg-[#F2D477]"
          >
            <Plus size={19} />
            Add New Page
          </button>

        </div>
      </section>

      {/* Statistics Cards */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#142B50]">
            Content Overview
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Monitor your website content performance
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className={`rounded-2xl border border-gray-100 border-t-4 ${item.border} bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${item.bg} ${item.color}`}>
                    <Icon size={23} />
                  </div>
                  <ArrowUpRight size={19} className="text-gray-300" />
                </div>

                <p className="mt-4 text-sm font-semibold text-gray-500">
                  {item.title}
                </p>

                <h3 className="mt-1 text-3xl font-extrabold text-[#142B50]">
                  {item.value}
                </h3>

                <p className={`mt-1 text-xs font-medium ${item.color}`}>
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Content Management */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        {/* Table Heading */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#142B50]">
              Website Pages
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              View and manage all your website pages
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-[#A00018] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#780013]"
          >
            <Plus size={17} />
            Create Page
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-[#F8F9FC] p-4 md:flex-row md:items-center md:justify-between">

          <div className="relative w-full md:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#A00018] focus:ring-2 focus:ring-[#A00018]/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={17} className="text-[#142B50]" />

            {["All", "Published", "Draft"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                  filter === status
                    ? "bg-[#142B50] text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-500 hover:border-[#142B50] hover:text-[#142B50]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Pages Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-[#F8F9FC]">
              <tr className="text-xs font-bold uppercase tracking-wider text-gray-500">
                <th className="px-5 py-4">Page Details</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Last Updated</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredPages.map((page) => (
                <tr
                  key={page.id}
                  className="transition hover:bg-[#FAF7F7]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-[#A00018]/10 p-3 text-[#A00018]">
                        <FileText size={19} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#142B50]">
                          {page.title}
                        </p>
                        <p className="mt-1 max-w-[230px] truncate text-xs text-gray-400">
                          {page.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-[#142B50]/5 px-3 py-1.5 text-xs font-semibold text-[#142B50]">
                      {page.category}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={14} />
                      {page.updated}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                        page.status === "Published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          page.status === "Published"
                            ? "bg-emerald-600"
                            : "bg-amber-500"
                        }`}
                      />
                      {page.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">

                      <button
                        title="Preview"
                        onClick={() => openPreview(page)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title="Edit"
                        onClick={() => openEditModal(page)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title={page.status === "Published" ? "Unpublish" : "Publish"}
                        onClick={() => togglePublish(page.id)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Globe size={17} />
                      </button>

                      <button
                        title="Delete"
                        onClick={() => deletePage(page.id)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {filteredPages.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center">
                    <FileText
                      size={35}
                      className="mx-auto mb-3 text-gray-300"
                    />
                    <p className="font-bold text-[#142B50]">
                      {loading
                        ? "Loading pages..."
                        : error
                          ? "Could not load pages"
                          : "No pages found"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {error
                        ? error.message
                        : loading
                          ? "Please wait."
                          : "Try another search or change the filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            Showing <span className="font-bold text-[#142B50]">{filteredPages.length}</span> of{" "}
            <span className="font-bold text-[#142B50]">{totalPages}</span> pages
          </p>

          <span className="text-xs font-semibold text-[#A00018]">
            Content Management Panel
          </span>
        </div>
      </section>

      {/* Add / Edit Page Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101D3A]/70 p-4 backdrop-blur-sm">

          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-gradient-to-r from-[#142B50] to-[#8E0018] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-extrabold">
                  {editingId ? "Edit Website Page" : "Create New Page"}
                </h2>
                <p className="mt-1 text-xs text-white/70">
                  Enter the page details below
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 transition hover:bg-white/15"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Page Title *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Enter page title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#A00018] focus:ring-2 focus:ring-[#A00018]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Page Category
                </label>

                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                >
                  <option>Main Pages</option>
                  <option>Academic</option>
                  <option>Information</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Page Description
                </label>

                <textarea
                  rows="4"
                  placeholder="Write a short description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#A00018] focus:ring-2 focus:ring-[#A00018]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Publishing Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#780013]"
                >
                  <Save size={17} />
                  {editingId ? "Save Changes" : "Create Page"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101D3A]/70 p-4 backdrop-blur-sm">

          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-gradient-to-r from-[#142B50] to-[#8E0018] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold text-[#FFE8A3]">
                  PAGE PREVIEW
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {previewPage.title}
                </h2>
              </div>

              <button
                onClick={() => setPreviewPage(null)}
                className="rounded-lg p-2 transition hover:bg-white/15"
              >
                <X size={21} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-[#142B50]/10 px-3 py-1.5 text-xs font-bold text-[#142B50]">
                  {previewPage.category}
                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    previewPage.status === "Published"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {previewPage.status}
                </span>
              </div>

              <div className="rounded-xl bg-[#F8F9FC] p-5">
                <h3 className="text-lg font-extrabold text-[#142B50]">
                  {previewPage.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  {previewPage.description || "No description added yet."}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                <CalendarDays size={15} />
                Last updated: {previewPage.updated}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    openEditModal(previewPage);
                    setPreviewPage(null);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#780013]"
                >
                  <Pencil size={16} />
                  Edit Page
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default ManageContent;
