// Website Admin pages talk to the real website API module; only the HTTP layer is replaced, so these tests
// check that each button sends the right request (endpoint + payload) and that the page shows the server's data.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../../../services/http", () => ({ default: http }));

import ManageContent from "./ManageContent";
import NoticesAndAnnouncements from "./NoticesAndAnnouncements";
import FacultyProfiles from "./FacultyProfiles";
import GalleryAndDocuments from "./GalleryAndDocuments";
import WebsiteAdminDashboard from "./WebsiteAdminDashboard";

const ok = (data) => Promise.resolve({ data: { success: true, data } });
const item = (over) => ({
  status: "draft",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
  images: [],
  attachments: [],
  meta: {},
  ...over,
});

let db;
beforeEach(() => {
  db = { page: [], notice: [], faculty: [], gallery: [], document: [] };
  http.get.mockImplementation((url, config) => {
    if (url === "/website/content") {
      const items = db[config.params.type] ?? [];
      return ok({ items, total: items.length, page: 1, limit: 100 });
    }
    if (url.startsWith("/website/content/") && url !== "/website/content/stats") {
      const id = url.split("/").pop();
      return ok(Object.values(db).flat().find((x) => x.id === id));
    }
    if (url === "/admin/departments") return ok([{ id: "a1", name: "Computer Science" }]);
    if (url === "/website/content/stats") {
      return ok({
        byType: {
          page: { published: 7 },
          department: { total: 3 },
          course: { total: 5 },
          notice: { total: 11 },
          gallery: { total: 4 },
          document: { total: 2 },
        },
      });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  http.post.mockImplementation((url, body) => ok({ id: "new1", status: url.endsWith("/publish") ? "published" : "draft", ...body }));
  http.patch.mockImplementation((url, body) => ok({ id: url.split("/").pop(), status: "draft", ...body }));
  http.delete.mockImplementation(() => ok({ deleted: true }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const renderPage = (page) => render(<MemoryRouter>{page}</MemoryRouter>);

describe("Manage Content", () => {
  it("lists pages from the server and creates + publishes a new page", async () => {
    db.page = [item({ id: "p1", type: "page", title: "About College", category: "Main Pages", summary: "History", status: "published", publishedAt: "2026-11-01T00:00:00.000Z" })];
    renderPage(<ManageContent />);

    expect(await screen.findByText("About College")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add New Page/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter page title"), { target: { value: "Admission Information" } });
    fireEvent.change(screen.getByPlaceholderText("Write a short description..."), { target: { value: "How to apply" } });
    const dialog = screen.getByRole("heading", { name: "Create New Page" }).closest("div.my-auto");
    fireEvent.change(within(dialog).getAllByRole("combobox")[1], { target: { value: "Published" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Create Page/i }));

    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith("/website/content", expect.objectContaining({
        type: "page", title: "Admission Information", category: "Main Pages", summary: "How to apply", body: "How to apply",
      })),
    );
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/website/content/new1/publish", {}));
  });

  it("unpublishes and deletes through the API", async () => {
    db.page = [item({ id: "p1", type: "page", title: "Contact Us", summary: "Address", status: "published", publishedAt: "2026-11-01T00:00:00.000Z" })];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage(<ManageContent />);
    await screen.findByText("Contact Us");

    fireEvent.click(screen.getByTitle("Unpublish"));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/website/content/p1/unpublish"));

    fireEvent.click(screen.getByTitle("Delete"));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith("/website/content/p1"));
  });

  it("shows the server's error when the list cannot be loaded", async () => {
    http.get.mockImplementation(() => Promise.reject(new Error("Please sign in.")));
    renderPage(<ManageContent />);
    expect(await screen.findByText("Could not load pages")).toBeInTheDocument();
    expect(screen.getByText("Please sign in.")).toBeInTheDocument();
  });
});

describe("Notices & Announcements", () => {
  it("shows stored notices with their details and publishes a draft", async () => {
    db.notice = [item({ id: "n1", type: "notice", title: "Library Renewal", summary: "Renew cards", category: "Academic", meta: { priority: "Low", audience: "Students" } })];
    renderPage(<NoticesAndAnnouncements />);

    expect(await screen.findByText("Library Renewal")).toBeInTheDocument();
    expect(screen.getByText("Low Priority")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Publish$/ }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/website/content/n1/publish", {}));
    expect(await screen.findByText("Notice published successfully")).toBeInTheDocument();
  });

  it("pins a notice by saving isPinned", async () => {
    db.notice = [item({ id: "n2", type: "notice", title: "Holiday", summary: "Closed", isPinned: false })];
    const { container } = renderPage(<NoticesAndAnnouncements />);
    await screen.findByText("Holiday");
    const pinButton = [...container.querySelectorAll("button")].find((b) => b.querySelector(".lucide-pin"));
    fireEvent.click(pinButton);
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith("/website/content/n2", { isPinned: true }));
  });
});

describe("Faculty Profiles", () => {
  it("lists profiles and marks an active one inactive (taken off the website)", async () => {
    db.faculty = [item({ id: "f1", type: "faculty", title: "Dr. Neha Kulkarni", category: "Computer Science", status: "published", publishedAt: "2026-11-01T00:00:00.000Z", meta: { employeeId: "FAC005", designation: "Professor" } })];
    renderPage(<FacultyProfiles />);
    expect(await screen.findByText("Dr. Neha Kulkarni")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Deactivate|Inactive|Disable/i }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/website/content/f1/unpublish"));
  });
});

describe("Gallery & Documents", () => {
  it("uploads a picture, records it as a gallery item and publishes it", async () => {
    const { container } = renderPage(<GalleryAndDocuments />);
    await screen.findByText("No Images Available");
    http.post.mockImplementation((url, body) => {
      if (url === "/website/uploads") {
        return ok({ url: "/api/v1/website/files/aaaaaaaaaaaaaaaaaaaaaaaa.png", name: "campus.png", mimeType: "image/png", sizeBytes: 10, kind: "image" });
      }
      return ok({ id: "g1", status: "draft", ...body });
    });

    // The file picker lives in the upload dialog.
    fireEvent.click(screen.getAllByRole("button", { name: /Upload/i })[0]);
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File([new Uint8Array([0x89, 0x50])], "campus.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/website/uploads", expect.any(FormData), expect.anything()));
    await waitFor(() =>
      expect(http.post).toHaveBeenCalledWith("/website/content", expect.objectContaining({
        type: "gallery", title: "campus.png", images: [{ url: "/api/v1/website/files/aaaaaaaaaaaaaaaaaaaaaaaa.png" }],
      })),
    );
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/website/content/g1/publish", {}));
  });
});

describe("Website Admin dashboard", () => {
  it("shows live counts from the stats endpoint", async () => {
    renderPage(<WebsiteAdminDashboard />);
    expect(await screen.findByText("7")).toBeInTheDocument(); // published pages
    expect(screen.getByText("8")).toBeInTheDocument(); // 3 departments + 5 courses
    expect(screen.getByText("11")).toBeInTheDocument(); // notices
    expect(screen.getByText("6")).toBeInTheDocument(); // 4 pictures + 2 documents
  });
});
