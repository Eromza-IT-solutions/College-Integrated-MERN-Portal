export { formatDate, formatDateTime, formatTime } from "./format";

export const SEMESTERS = Array.from({ length: 12 }, (_, index) => index + 1);

export function labelOf(id, rows = [], fields = ["name"]) {
  const row = rows.find((item) => String(item._id) === String(id));
  if (!row) return String(id ?? "—");
  return fields.map((field) => row[field]).filter(Boolean).join(" · ");
}

export function academicYearLabel(id, years = []) {
  return labelOf(id, years, ["label"]);
}

export function programLabel(id, programs = []) {
  return labelOf(id, programs, ["name", "code"]);
}

export function subjectLabel(id, subjects = []) {
  return labelOf(id, subjects, ["code", "name"]);
}

export function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formDisplayName(form) {
  return form?.details?.fullName || form?.studentId?.fullName || form?.studentId?.enrollmentNumber || "Student";
}

export function formEnrollment(form) {
  return form?.details?.enrollmentNumber || form?.studentId?.enrollmentNumber || "—";
}
