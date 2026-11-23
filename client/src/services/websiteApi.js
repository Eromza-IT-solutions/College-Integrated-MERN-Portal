import http from "./http";

// Website content for the Website Admin panel and the public site.
// Backend: /api/v1/website (see server/src/modules/website/website.routes.js).

const dataOf = (response) => response.data.data;

/** All items of one type the editor may see (newest first). */
export async function fetchContent(type, params = {}) {
  const response = await http.get("/website/content", {
    params: { type, limit: 100, ...params },
  });
  return dataOf(response);
}

export async function fetchContentItem(id) {
  return dataOf(await http.get(`/website/content/${id}`));
}

export async function fetchContentStats() {
  return dataOf(await http.get("/website/content/stats"));
}

export async function createContent(payload) {
  return dataOf(await http.post("/website/content", payload));
}

export async function updateContent(id, payload) {
  return dataOf(await http.patch(`/website/content/${id}`, payload));
}

export async function publishContent(id, { publishAt, expiresAt } = {}) {
  const body = {};
  if (publishAt !== undefined) body.publishAt = publishAt;
  if (expiresAt !== undefined) body.expiresAt = expiresAt;
  return dataOf(await http.post(`/website/content/${id}/publish`, body));
}

export async function unpublishContent(id) {
  return dataOf(await http.post(`/website/content/${id}/unpublish`));
}

export async function archiveContent(id) {
  return dataOf(await http.post(`/website/content/${id}/archive`));
}

export async function deleteContent(id) {
  return dataOf(await http.delete(`/website/content/${id}`));
}

/** Upload one picture or document; returns { url, name, mimeType, sizeBytes, kind }. */
export async function uploadWebsiteFile(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await http.post("/website/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return dataOf(response);
}

/** Academic departments (read-only for the website admin). */
export async function fetchAcademicDepartments() {
  const response = await http.get("/admin/departments", { params: { limit: 100 } });
  const data = dataOf(response);
  return Array.isArray(data) ? data : data?.items ?? [];
}

/** Published content for the public website. */
export async function fetchPublicContent(type, params = {}) {
  const response = await http.get("/website/public", {
    params: { type, limit: 50, ...params },
  });
  return dataOf(response);
}

/** One published item with its full text (for example a notice or a page, found by its slug). */
export async function fetchPublicItem(type, slug) {
  const response = await http.get(`/website/public/${type}/${encodeURIComponent(slug)}`);
  return dataOf(response);
}

/** Notices for signed-in people (students, teachers ...), including the members-only ones. */
export async function fetchMemberNotices(params = {}) {
  const response = await http.get("/website/members/notices", {
    params: { limit: 50, ...params },
  });
  return dataOf(response);
}

/** One of those notices with its full text. */
export async function fetchMemberNotice(slug) {
  const response = await http.get(`/website/members/notices/${encodeURIComponent(slug)}`);
  return dataOf(response);
}

// ---- helpers shared by the admin pages ----

/** "Published" / "Scheduled" / "Draft" / "Archived" as the pages show it. */
export function displayStatus(item, now = new Date()) {
  if (!item) return "Draft";
  if (item.status === "published") {
    return item.publishedAt && new Date(item.publishedAt) > now ? "Scheduled" : "Published";
  }
  if (item.status === "archived") return "Archived";
  return "Draft";
}

/**
 * Create or update an item, then bring it to the wanted state:
 *   "published" (optionally with publishAt / expiresAt) or "draft".
 * Returns the saved item as the server has it.
 */
export async function saveContent({ id, type, fields, want, publishAt, expiresAt, current }) {
  let saved = id ? await updateContent(id, fields) : await createContent({ type, ...fields });
  const isLive = (current ?? saved).status === "published";
  if (want === "published") {
    saved = await publishContent(saved.id, { publishAt, expiresAt });
  } else if (want === "draft" && isLive) {
    saved = await unpublishContent(saved.id);
  }
  return saved;
}

/** Delete an item; a published one is taken off the website first. */
export async function removeContent(item) {
  if (item.status === "published") await unpublishContent(item.id);
  return deleteContent(item.id);
}

export function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
