import http from "./http";

export async function listMarks(params = {}) {
  const { data } = await http.get("/marks", { params: { limit: 100, ...params } });
  return data.data;
}
export async function enterMarks(body) {
  const { data } = await http.post("/marks", body);
  return data.data; // { saved: [], failed: [] }
}
export async function submitMarks(ids) {
  const { data } = await http.post("/marks/submit", { ids });
  return data.data;
}
export async function decideMarks({ ids, approve, note }) {
  const { data } = await http.post("/marks/decision", { ids, approve, ...(note ? { note } : {}) });
  return data.data;
}
export async function listResults() {
  const { data } = await http.get("/results", { params: { limit: 100 } });
  return data.data;
}
export async function downloadResultPdf(id, name) {
  const res = await http.get(`/results/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `result-${name || id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
