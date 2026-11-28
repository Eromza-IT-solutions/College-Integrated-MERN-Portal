import http from "./http";

export const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// YYYY-MM-DD in the local time zone
export const toDateString = (d = new Date()) => d.toLocaleDateString("en-CA");
// 1 = Monday ... 7 = Sunday (same as the server)
export const dayOfWeekOf = (dateStr) => new Date(`${dateStr}T00:00:00`).getDay() || 7;

export async function listTimetable(params = {}) {
  const { data } = await http.get("/timetable", { params: { limit: 100, ...params } });
  return data.data;
}

export async function getAttendanceSummary() {
  const { data } = await http.get("/attendance/summary");
  return data.data; // { enrollmentNumber, subjects: [{ subject, held, present, leave, percentage }] }
}

export async function listRegisters(params = {}) {
  const { data } = await http.get("/attendance", { params: { limit: 100, ...params } });
  return data.data;
}

export async function getRoster(slotId, lectureDate) {
  const { data } = await http.get("/attendance/roster", { params: { slotId, lectureDate } });
  return data.data; // { alreadyMarked, students: [{ studentId, enrollmentNumber, fullName, status }] }
}

export async function markAttendance({ slotId, lectureDate, records }) {
  const { data } = await http.post("/attendance/mark", { slotId, lectureDate, records });
  return data.data;
}

// ---- Timetable management (HOD for their department, Super Admin for all) ----
export async function fetchTimetableReference(params = {}) {
  const { data } = await http.get("/timetable/reference", { params });
  return data.data; // { academicYears, programs, subjects, teachers } (subjects and teachers only once programId is sent)
}

export async function createTimetableSlot(body) {
  const { data } = await http.post("/timetable", body);
  return data.data;
}

export async function updateTimetableSlot(id, body) {
  const { data } = await http.patch(`/timetable/${id}`, body);
  return data.data;
}
