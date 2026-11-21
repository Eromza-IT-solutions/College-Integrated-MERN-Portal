import http from "./http";

// type: department | admission | exam | payment
export async function fetchReport(type, params = {}) {
  const { data } = await http.get(`/reports/${type}`, { params });
  return data.data; // { title, summary, rows }
}

// format: csv | pdf  (needs the "export" permission)
export async function downloadReport(type, format, params = {}) {
  const res = await http.get(`/reports/${type}`, { params: { ...params, format }, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
