import http from "./http";

function dataOf(response) {
  return response.data.data;
}

export async function fetchStudentOverview() {
  const response = await http.get("/students/me");
  return dataOf(response);
}

export async function updateStudentMobile(studentId, mobile) {
  const response = await http.patch(`/students/${studentId}`, { mobile });
  return dataOf(response);
}

export async function fetchAttendanceSummary() {
  const response = await http.get("/attendance/summary");
  return dataOf(response);
}

// Lecture-by-lecture attendance of the signed-in student (for the attendance calendar).
export async function fetchAttendanceRecords(params = {}) {
  const response = await http.get("/attendance/my-records", { params });
  return dataOf(response);
}

export async function fetchTimetable({ programId, semester, division } = {}) {
  const params = { limit: 100 };
  if (programId) params.programId = programId;
  if (semester) params.semester = semester;
  if (division) params.division = division;

  const response = await http.get("/timetable", { params });
  return dataOf(response);
}

export async function fetchResults() {
  const response = await http.get("/results", { params: { limit: 100 } });
  return dataOf(response);
}

export async function fetchExamForms() {
  const response = await http.get("/exam-forms", { params: { limit: 100 } });
  return dataOf(response);
}

export async function fetchAvailableExams() {
  const response = await http.get("/exams/available");
  return dataOf(response);
}

// ---- Exam form: start, tick subjects, continue to payment ----
export async function startExamForm(examId) {
  const response = await http.post(`/exams/${examId}/form`);
  return dataOf(response);
}

export async function fetchExamForm(formId) {
  const response = await http.get(`/exam-forms/${formId}`);
  return dataOf(response);
}

export async function saveExamFormSubjects(formId, subjectIds) {
  const response = await http.put(`/exam-forms/${formId}/subjects`, { subjectIds });
  return dataOf(response);
}

export async function continueExamForm(formId) {
  const response = await http.post(`/exam-forms/${formId}/continue`);
  return dataOf(response);
}

// Every published exam of the student's class, each with eligible: true/false and the reasons.
export async function fetchExamEligibility() {
  const response = await http.get("/exams/eligibility");
  return dataOf(response);
}

export async function fetchHallTickets() {
  const response = await http.get("/exam-forms/hall-tickets/me");
  return dataOf(response);
}

export async function fetchPayments(purpose) {
  const response = await http.get("/payments", {
    params: { purpose, limit: 100 },
  });
  return dataOf(response);
}

export async function fetchPaymentReceipt(paymentId) {
  const response = await http.get(`/payments/${paymentId}/receipt`);
  return dataOf(response);
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

export function downloadHallTicketPdf(ticket) {
  return downloadFile(
    `/exam-forms/hall-tickets/${ticket._id}/pdf`,
    `hall-ticket-${ticket.enrollmentNumber || ticket._id}.pdf`,
  );
}

export function downloadExamFormPdf(form) {
  return downloadFile(
    `/exam-forms/${form._id}/pdf`,
    `exam-form-${form.details?.enrollmentNumber || form._id}.pdf`,
  );
}

export function downloadPaymentReceiptPdf(payment) {
  return downloadFile(
    `/payments/${payment._id}/receipt?format=pdf`,
    `receipt-${payment.receiptNumber || payment._id}.pdf`,
  );
}
