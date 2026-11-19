import http from "./http";

// GET /api/v1/audit-logs  (Super Admin only). Server limit is 100 rows per page.
export async function fetchAuditLogs(params = {}) {
  const { data } = await http.get("/audit-logs", { params: { limit: 100, ...params } });
  return { rows: data.data, meta: data.meta };
}

// Screen filters/sorts in the browser, so load the latest rows (max 5 pages = 500 rows).
export async function fetchAllAuditLogs(maxPages = 5) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { rows, meta } = await fetchAuditLogs({ page });
    all.push(...rows);
    if (page >= meta.totalPages) break;
  }
  return all;
}
