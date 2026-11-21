import http from "./http";

function dataOf(response) {
  return response.data.data;
}

async function downloadFile(url, filename) {
  const response = await http.get(url, { responseType: "blob" });
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function fetchExamReference({ programId, semester } = {}) {
  const params = {};
  if (programId) params.programId = programId;
  if (semester) params.semester = semester;
  const response = await http.get("/exams/reference", { params });
  return dataOf(response);
}

export async function fetchExams(params = {}) {
  const response = await http.get("/exams", {
    params: { limit: 100, ...params },
  });
  return dataOf(response);
}

export async function fetchExam(examId) {
  const response = await http.get(`/exams/${examId}`);
  return dataOf(response);
}

export async function createExam(payload) {
  const response = await http.post("/exams", payload);
  return dataOf(response);
}

export async function updateExam(examId, payload) {
  const response = await http.patch(`/exams/${examId}`, payload);
  return dataOf(response);
}

export async function fetchExamForms(params = {}) {
  const response = await http.get("/exam-forms", {
    params: { limit: 100, ...params },
  });
  return dataOf(response);
}

export async function fetchExamForm(formId) {
  const response = await http.get(`/exam-forms/${formId}`);
  return dataOf(response);
}

export async function decideExamForm(formId, { approve, note }) {
  const response = await http.post(`/exam-forms/${formId}/decision`, {
    approve,
    ...(note ? { note } : {}),
  });
  return dataOf(response);
}

export async function fetchExamTickets(examId) {
  const response = await http.get(`/exams/${examId}/hall-tickets`);
  return dataOf(response);
}

export async function generateHallTickets(examId, { overwrite = false } = {}) {
  const response = await http.post(`/exams/${examId}/hall-tickets/generate`, {
    overwrite,
  });
  return dataOf(response);
}

export async function updateHallTicket(ticketId, payload) {
  const response = await http.patch(`/exam-forms/hall-tickets/${ticketId}`, payload);
  return dataOf(response);
}

export function downloadAdminHallTicketPdf(ticket) {
  return downloadFile(
    `/exam-forms/hall-tickets/${ticket._id}/pdf`,
    `hall-ticket-${ticket.enrollmentNumber || ticket._id}.pdf`,
  );
}

export function downloadAdminExamFormPdf(form) {
  return downloadFile(
    `/exam-forms/${form._id}/pdf`,
    `exam-form-${form.details?.enrollmentNumber || form._id}.pdf`,
  );
}
