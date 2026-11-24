
import { useMemo, useRef, useState } from "react";
import { useApiData } from "../../../hooks/useApiData";
import {
  createContent,
  fetchContent,
  publishContent,
  removeContent,
  uploadWebsiteFile,
} from "../../../services/websiteApi";
import {
  Images,
  FileText,
  Upload,
  Search,
  Trash2,
  Eye,
  Download,
  Image as ImageIcon,
  X,
  FolderOpen,
  Filter,
  Plus,
  GraduationCap,
  CalendarDays,
  File,
  FilePlus2,
  ImagePlus,
} from "lucide-react";

const categories = [
  "All",
  "Campus",
  "Events",
  "Activities",
  "Certificates",
  "Documents",
  "Others",
];

// One uploaded file as this screen shows it: a "gallery" item holds one picture, a "document" item one file.
const toMediaItem = (item) => {
  const isImage = item.type === "gallery";
  const file = isImage ? item.images?.[0] : item.attachments?.[0];
  return {
    id: item.id,
    name: item.title,
    type: isImage ? "Image" : "Document",
    category: item.category || (isImage ? "Others" : "Documents"),
    size: Number(file?.sizeBytes || item.meta?.sizeBytes || 0),
    url: file?.url || item.imageUrl || "",
    uploadedAt: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-GB")
      : "",
    raw: item,
  };
};

function GalleryAndDocuments() {
  const { data, loading, error, reload } = useApiData(async () => {
    const [gallery, documents] = await Promise.all([
      fetchContent("gallery"),
      fetchContent("document"),
    ]);
    return [...(gallery?.items ?? []), ...(documents?.items ?? [])];
  });
  const items = useMemo(
    () =>
      (data ?? [])
        .map(toMediaItem)
        .sort((a, b) =>
          String(b.raw.createdAt || "").localeCompare(String(a.raw.createdAt || ""))
        ),
    [data]
  );
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Campus");
  const [toast, setToast] = useState("");

  const fileInputRef = useRef(null);

  const imageCount = items.filter(
    (item) => item.type === "Image"
  ).length;

  const documentCount = items.filter(
    (item) => item.type === "Document"
  ).length;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Images" && item.type === "Image") ||
        (activeTab === "Documents" && item.type === "Document");

      const matchesCategory =
        category === "All" || item.category === category;

      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesTab && matchesCategory && matchesSearch;
    });
  }, [items, activeTab, category, search]);

  const showMessage = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };

  // Each file: upload it securely, record it as website content, and put it live.
  const uploadOne = async (file) => {
    const saved = await uploadWebsiteFile(file);
    const isImage = saved.kind === "image";
    const title = (saved.name || file.name).slice(0, 200);
    const created = await createContent(
      isImage
        ? {
            type: "gallery",
            title,
            category: uploadCategory,
            images: [{ url: saved.url }],
            meta: { sizeBytes: saved.sizeBytes, mimeType: saved.mimeType },
          }
        : {
            type: "document",
            title,
            category: "Documents",
            attachments: [
              {
                name: saved.name,
                url: saved.url,
                mimeType: saved.mimeType,
                sizeBytes: saved.sizeBytes,
              },
            ],
          }
    );
    await publishContent(created.id);
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length || uploading) return;

    setUploading(true);
    let done = 0;
    const failed = [];
    for (const file of files) {
      try {
        await uploadOne(file);
        done += 1;
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
    setShowUpload(false);
    reload();
    showMessage(
      failed.length
        ? `${done} file(s) uploaded. Not uploaded: ${failed.join("; ")}`
        : `${done} file(s) uploaded successfully`
    );
  };

  const deleteItem = async (id) => {
    const item = items.find((entry) => entry.id === id);

    if (!item) return;
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      await removeContent(item.raw);
      if (previewItem?.id === id) {
        setPreviewItem(null);
      }
      showMessage("File deleted successfully");
    } catch (err) {
      showMessage(err.message);
    } finally {
      reload();
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src =
      "https://placehold.co/900x600/F1F3F8/142B50?text=Image+Unavailable";
  };

  return (
    <div className="min-h-screen w-full space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#142B50] via-[#243E65] to-[#7D0015] p-6 text-white shadow-lg md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
            <GraduationCap size={18} />
            EROMZA ICMS / Website Admin
          </div>

          <h1 className="text-2xl font-bold md:text-3xl">
            Gallery & Documents
          </h1>

          <p className="mt-2 max-w-xl text-sm text-white/75">
            Organize campus photographs, student activities, college events
            and important academic documents.
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#142B50] shadow transition hover:bg-gray-100"
        >
          <Upload size={19} />
          Upload Files
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Files",
            value: items.length,
            icon: FolderOpen,
            color: "bg-blue-50 text-blue-700",
          },
          {
            title: "Gallery Images",
            value: imageCount,
            icon: Images,
            color: "bg-purple-50 text-purple-700",
          },
          {
            title: "Documents",
            value: documentCount,
            icon: FileText,
            color: "bg-amber-50 text-amber-700",
          },
          {
            title: "Categories",
            value: new Set(items.map((item) => item.category)).size,
            icon: Filter,
            color: "bg-green-50 text-green-700",
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

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-bold text-[#142B50]">Media Library</h2>
          <p className="mt-1 text-xs text-gray-400">
            Browse and manage your college files
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", "Images", "Documents"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-[#142B50] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files by name..."
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#A00018]"
          />
        </div>

        <div className="relative md:w-56">
          <Filter
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A00018]"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All Categories" : item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gallery Images */}
      {activeTab !== "Documents" && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#142B50]">
              <Images size={21} className="text-[#A00018]" />
              Gallery Images
            </h2>

            <span className="text-sm text-gray-500">
              {filteredItems.filter((item) => item.type === "Image").length} files
            </span>
          </div>

          {filteredItems.filter((item) => item.type === "Image").length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-5 py-14 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <ImagePlus size={30} />
              </div>

              <h3 className="text-lg font-bold text-[#142B50]">
                {loading ? "Loading Gallery..." : error ? "Could Not Load Gallery" : "No Images Available"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                {error
                  ? error.message
                  : "Your college gallery is currently empty. Upload campus, classroom, student and event photographs to get started."}
              </p>

              <button
                onClick={() => setShowUpload(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-semibold text-white hover:bg-[#7D0015]"
              >
                <Plus size={17} />
                Add First Image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems
                .filter((item) => item.type === "Image")
                .map((item) => (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-56 overflow-hidden bg-gray-100">
                      <img
                        src={item.url}
                        alt={item.name}
                        onError={handleImageError}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-[#142B50]/50 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="rounded-full bg-white p-3 text-[#142B50] hover:bg-gray-100"
                          title="Preview"
                        >
                          <Eye size={19} />
                        </button>

                        <button
                          onClick={() => deleteItem(item.id)}
                          className="rounded-full bg-white p-3 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>

                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#142B50]">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="truncate font-semibold text-[#142B50]">
                        {item.name}
                      </h3>

                      <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <CalendarDays size={13} />
                        {item.uploadedAt}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Documents */}
      {activeTab !== "Images" && (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#142B50]">
                <FileText size={21} className="text-[#A00018]" />
                Documents Library
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                College brochures, certificates and academic files
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {filteredItems.filter((item) => item.type === "Document").length} files
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Document Name</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">File Size</th>
                  <th className="px-5 py-4">Upload Date</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredItems
                  .filter((item) => item.type === "Document")
                  .map((item) => (
                    <tr key={item.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-red-50 p-2 text-red-600">
                            <FileText size={20} />
                          </div>
                          <span className="font-semibold text-[#142B50]">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {item.category}
                      </td>

                      <td className="px-5 py-4 text-gray-500">
                        {formatSize(item.size)}
                      </td>

                      <td className="px-5 py-4 text-gray-500">
                        {item.uploadedAt}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                            title="Open document"
                          >
                            <Eye size={17} />
                          </a>

                          <a
                            href={item.url}
                            download={item.name}
                            className="rounded-lg bg-green-50 p-2 text-green-700 hover:bg-green-100"
                            title="Download"
                          >
                            <Download size={17} />
                          </a>

                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {filteredItems.filter((item) => item.type === "Document").length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <FilePlus2 size={32} className="mx-auto text-gray-300" />
                      <p className="mt-3 font-semibold text-gray-600">
                        No Documents Available
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Upload your first college document.
                      </p>
                      <button
                        onClick={() => setShowUpload(true)}
                        className="mt-4 rounded-lg bg-[#A00018] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7D0015]"
                      >
                        Upload Document
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#142B50]">
                  Upload Files
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Add images or documents to your library
                </p>
              </div>

              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Image Category
            </label>

            <select
              value={uploadCategory}
              onChange={(event) => setUploadCategory(event.target.value)}
              className="mb-5 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#A00018]"
            >
              {categories
                .filter((item) => item !== "All" && item !== "Documents")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center transition hover:border-[#A00018] hover:bg-red-50/30"
            >
              <div className="mx-auto mb-3 w-fit rounded-full bg-red-50 p-4 text-[#A00018]">
                <Upload size={28} />
              </div>

              <h3 className="font-semibold text-[#142B50]">
                Click to choose files
              </h3>

              <p className="mt-2 text-xs text-gray-500">
                JPG, PNG, PDF, DOC, DOCX, XLSX and PPTX
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx"
                onChange={handleUpload}
                className="hidden"
              />
            </div>

            <p className="mt-4 text-xs text-gray-400">
              {uploading
                ? "Uploading files, please wait..."
                : "Files are stored securely on the college server and published to the website (up to 10 MB each)."}
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-5 w-full rounded-xl bg-[#A00018] py-3 font-semibold text-white transition hover:bg-[#7D0015]"
            >
              Choose Files
            </button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white">
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white p-2 text-gray-700 shadow-lg"
            >
              <X size={22} />
            </button>

            <img
              src={previewItem.url}
              alt={previewItem.name}
              onError={handleImageError}
              className="max-h-[75vh] w-full bg-gray-100 object-contain"
            />

            <div className="p-4">
              <h3 className="font-bold text-[#142B50]">
                {previewItem.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {previewItem.category}
              </p>
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

export default GalleryAndDocuments;
