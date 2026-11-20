
import { useMemo, useState } from "react";
import { useApiData } from "../../../hooks/useApiData";
import {
  displayStatus,
  fetchContent,
  fetchContentItem,
  publishContent,
  removeContent,
  saveContent,
  toDateInput,
  unpublishContent,
  updateContent,
} from "../../../services/websiteApi";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  CalendarDays,
  Clock,
  Eye,
  Pencil,
  Trash2,
  X,
  Bell,
  FileText,
  CheckCircle,
  AlertCircle,
  Send,
  Download,
  Pin,
} from "lucide-react";

// A notice as this screen shows it, made from the stored content item.
const toNotice = (item) => {
  const meta = item.meta || {};
  const status = displayStatus(item);
  return {
    id: item.id,
    title: item.title,
    description: item.body ?? item.summary ?? "",
    category: item.category || "General",
    priority: meta.priority || "Medium",
    status: status === "Archived" ? "Draft" : status,
    publishDate: item.publishedAt ? toDateInput(item.publishedAt) : meta.publishDate || "",
    expiryDate: item.expiresAt ? toDateInput(item.expiresAt) : meta.expiryDate || "",
    audience: meta.audience || "All Students",
    pinned: !!item.isPinned,
    raw: item,
  };
};

// yyyy-mm-dd -> start of that day (local time), as an ISO string for the server.
const dayStart = (value) => (value ? new Date(`${value}T00:00:00`).toISOString() : undefined);
const dayEnd = (value) => (value ? new Date(`${value}T23:59:59`).toISOString() : undefined);
const todayInput = () => toDateInput(new Date());

const categories = [
  "All",
  "Admission",
  "Academic",
  "Examination",
  "Events",
  "Faculty",
  "General",
];

const emptyForm = {
  title: "",
  description: "",
  category: "General",
  priority: "Medium",
  status: "Draft",
  publishDate: "",
  expiryDate: "",
  audience: "All Students",
  pinned: false,
};

function NoticesAndAnnouncements() {
  const { data, loading, error, reload } = useApiData(() => fetchContent("notice"));
  const notices = useMemo(() => (data?.items ?? []).map(toNotice), [data]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [viewNotice, setViewNotice] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");

  const showMessage = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const publishedCount = notices.filter(
    (notice) => notice.status === "Published"
  ).length;

  const draftCount = notices.filter(
    (notice) => notice.status === "Draft"
  ).length;

  const scheduledCount = notices.filter(
    (notice) => notice.status === "Scheduled"
  ).length;

  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      const matchesSearch =
        notice.title.toLowerCase().includes(search.toLowerCase()) ||
        notice.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || notice.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        notice.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [notices, search, statusFilter, categoryFilter]);

  // The list carries only a short summary; load the full text before editing or viewing.
  const withFullText = async (notice) => {
    try {
      return toNotice(await fetchContentItem(notice.id));
    } catch {
      return notice;
    }
  };

  const openViewModal = async (notice) => setViewNotice(await withFullText(notice));

  const openAddModal = () => {
    setEditingNotice(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = async (notice) => {
    const full = await withFullText(notice);
    setEditingNotice(full);
    setForm({
      title: full.title,
      description: full.description,
      category: full.category,
      priority: full.priority,
      status: full.status,
      publishDate: full.publishDate,
      expiryDate: full.expiryDate,
      audience: full.audience,
      pinned: full.pinned,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (
      form.expiryDate &&
      form.publishDate &&
      form.expiryDate < form.publishDate
    ) {
      showMessage("Expiry date cannot be before publish date");
      return;
    }

    if (form.status === "Scheduled" && !(form.publishDate > todayInput())) {
      showMessage("A scheduled notice needs a publish date after today");
      return;
    }

    const description = form.description.trim();
    const current = editingNotice?.raw;
    const live = form.status === "Published" || form.status === "Scheduled";

    setSaving(true);
    try {
      await saveContent({
        id: editingNotice?.id,
        type: "notice",
        current,
        fields: {
          title: form.title.trim(),
          summary: description.slice(0, 500),
          body: description,
          category: form.category,
          isPinned: !!form.pinned,
          meta: {
            priority: form.priority,
            audience: form.audience,
            publishDate: form.publishDate,
            expiryDate: form.expiryDate,
          },
        },
        want: live ? "published" : "draft",
        // An already published notice keeps its publish time unless a date is given.
        publishAt: live
          ? dayStart(form.publishDate) ||
            (current?.status === "published" ? current.publishedAt : undefined)
          : undefined,
        expiresAt: live ? dayEnd(form.expiryDate) ?? null : undefined,
      });
      showMessage(
        editingNotice
          ? "Notice updated successfully"
          : "Notice created successfully"
      );
      setShowModal(false);
      setEditingNotice(null);
      setForm(emptyForm);
    } catch (err) {
      showMessage(err.message);
    } finally {
      setSaving(false);
      reload();
    }
  };

  const deleteNotice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) {
      return;
    }

    const notice = notices.find((item) => item.id === id);
    try {
      await removeContent(notice.raw);
      if (viewNotice?.id === id) {
        setViewNotice(null);
      }
      showMessage("Notice deleted successfully");
    } catch (err) {
      showMessage(err.message);
    } finally {
      reload();
    }
  };

  const changeStatus = async (notice) => {
    const goingLive = notice.status === "Draft";

    try {
      if (goingLive) {
        const expiry =
          notice.expiryDate && notice.expiryDate >= todayInput()
            ? dayEnd(notice.expiryDate)
            : undefined;
        await publishContent(notice.id, { expiresAt: expiry });
      } else {
        await unpublishContent(notice.id);
      }
      showMessage(
        goingLive
          ? "Notice published successfully"
          : "Notice moved to drafts"
      );
    } catch (err) {
      showMessage(err.message);
    } finally {
      reload();
    }
  };

  const togglePin = async (id) => {
    const notice = notices.find((item) => item.id === id);
    if (!notice) return;
    try {
      await updateContent(id, { isPinned: !notice.pinned });
    } catch (err) {
      showMessage(err.message);
    } finally {
      reload();
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not set";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const statusStyle = (status) => {
    const styles = {
      Published: "bg-green-50 text-green-700",
      Draft: "bg-gray-100 text-gray-600",
      Scheduled: "bg-blue-50 text-blue-700",
    };

    return styles[status] || "bg-gray-100 text-gray-600";
  };

  const priorityStyle = (priority) => {
    const styles = {
      High: "bg-red-50 text-red-700",
      Medium: "bg-amber-50 text-amber-700",
      Low: "bg-green-50 text-green-700",
    };

    return styles[priority] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="w-full space-y-6 pb-8">

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#142B50] via-[#243E65] to-[#7D0015] p-6 text-white shadow-lg md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-white/70">
            WEBSITE MANAGEMENT / COMMUNICATION
          </p>

          <h1 className="text-2xl font-bold md:text-3xl">
            Notices & Announcements
          </h1>

          <p className="mt-2 max-w-xl text-sm text-white/75">
            Create, manage and publish important college announcements
            for students, faculty and staff.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#142B50] shadow transition hover:bg-gray-100"
        >
          <Plus size={19} />
          Create Notice
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Notices",
            value: notices.length,
            icon: Megaphone,
            color: "bg-purple-50 text-purple-700",
          },
          {
            title: "Published",
            value: publishedCount,
            icon: CheckCircle,
            color: "bg-green-50 text-green-700",
          },
          {
            title: "Drafts",
            value: draftCount,
            icon: FileText,
            color: "bg-amber-50 text-amber-700",
          },
          {
            title: "Scheduled",
            value: scheduledCount,
            icon: Clock,
            color: "bg-blue-50 text-blue-700",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-[#142B50]">
                    {stat.value}
                  </h2>
                </div>

                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notices and announcements..."
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A00018]"
          />
        </div>

        <div className="relative lg:w-48">
          <Filter
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A00018]"
          >
            {["All", "Published", "Draft", "Scheduled"].map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Statuses" : status}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:w-48">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#142B50]">
              All Announcements
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Manage your college announcements
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {filteredNotices.length} results
          </span>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-5 py-14 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-[#A00018]">
              <Megaphone size={30} />
            </div>

            <h3 className="text-lg font-bold text-[#142B50]">
              {loading
                ? "Loading Notices..."
                : error
                  ? "Could Not Load Notices"
                  : "No Notices Found"}
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              {error
                ? error.message
                : loading
                  ? "Please wait."
                  : "Try another search or create a new announcement."}
            </p>

            <button
              onClick={openAddModal}
              className="mt-5 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-semibold text-white hover:bg-[#7D0015]"
            >
              Create First Notice
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#A00018] sm:flex">
                      <Megaphone size={23} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(notice.status)}`}>
                          {notice.status}
                        </span>

                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(notice.priority)}`}>
                          {notice.priority} Priority
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          {notice.category}
                        </span>

                        {notice.pinned && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-[#A00018]">
                            <Pin size={13} />
                            Pinned
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#142B50] md:text-lg">
                        {notice.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                        {notice.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={14} />
                          Publish: {formatDate(notice.publishDate)}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Expires: {formatDate(notice.expiryDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 xl:border-0 xl:pt-0">
                    <button
                      onClick={() => openViewModal(notice)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      onClick={() => openEditModal(notice)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      onClick={() => changeStatus(notice)}
                      className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                    >
                      <Send size={15} />
                      {notice.status === "Published" ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={() => togglePin(notice.id)}
                      className={`rounded-lg p-2 ${
                        notice.pinned
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                      title="Toggle pin"
                    >
                      <Pin size={16} />
                    </button>

                    <button
                      onClick={() => deleteNotice(notice.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-5 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-[#142B50]">
                  {editingNotice ? "Edit Notice" : "Create New Notice"}
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Enter announcement details below
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Notice Title *
                </label>

                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="Enter notice title"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Description *
                </label>

                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Write announcement details..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    {categories
                      .filter((item) => item !== "All")
                      .map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    {["High", "Medium", "Low"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Publish Date
                  </label>

                  <input
                    type="date"
                    value={form.publishDate}
                    onChange={(event) =>
                      setForm({ ...form, publishDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Expiry Date
                  </label>

                  <input
                    type="date"
                    min={form.publishDate || undefined}
                    value={form.expiryDate}
                    onChange={(event) =>
                      setForm({ ...form, expiryDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Target Audience
                  </label>

                  <select
                    value={form.audience}
                    onChange={(event) =>
                      setForm({ ...form, audience: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    {[
                      "All Students",
                      "Students",
                      "Faculty",
                      "Staff",
                      "Parents",
                    ].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Notice Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    {["Draft", "Published", "Scheduled"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) =>
                    setForm({ ...form, pinned: event.target.checked })
                  }
                  className="h-4 w-4 accent-[#A00018]"
                />

                <span className="text-sm font-medium text-gray-700">
                  Pin this notice as an important announcement
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#A00018] px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#7D0015]"
                >
                  {editingNotice ? "Save Changes" : "Create Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Notice Modal */}
      {viewNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#142B50] p-5 text-white">
              <div className="flex items-center gap-2">
                <Bell size={20} />
                <h2 className="font-bold">Notice Details</h2>
              </div>

              <button
                onClick={() => setViewNotice(null)}
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(viewNotice.status)}`}>
                  {viewNotice.status}
                </span>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(viewNotice.priority)}`}>
                  {viewNotice.priority} Priority
                </span>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {viewNotice.category}
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#142B50]">
                {viewNotice.title}
              </h3>

              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {viewNotice.description}
              </p>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Publish Date</p>
                  <p className="mt-1 font-semibold text-gray-700">
                    {formatDate(viewNotice.publishDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Expiry Date</p>
                  <p className="mt-1 font-semibold text-gray-700">
                    {formatDate(viewNotice.expiryDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Target Audience</p>
                  <p className="mt-1 font-semibold text-gray-700">
                    {viewNotice.audience}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Priority</p>
                  <p className="mt-1 font-semibold text-gray-700">
                    {viewNotice.priority}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewNotice(null)}
                className="w-full rounded-xl bg-[#142B50] py-3 text-sm font-semibold text-white hover:bg-[#243E65]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] rounded-xl bg-[#142B50] px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default NoticesAndAnnouncements;
