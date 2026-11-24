import http from "./http";

// Same lists as server/src/utils/constants.js (the server rejects any other value).
export const LEVELS = ["Undergraduate", "Post Graduate", "Ph.D.", "Post-Doctoral", "UG Diploma", "PG Diploma", "Certificate Course"];
export const FACULTIES = ["Arts and Humanities", "Science and Technology", "Commerce and Management"];
export const CATEGORIES = ["major", "minor", "openElective", "vsc", "sec", "aec", "iks", "vec", "ccProject"];

const asPage = ({ data }) => ({ rows: data.data, meta: data.meta }); // list answer: { rows, meta }
const asOne = ({ data }) => data.data;                               // one record

// ---- departments  (/api/v1/admin/departments) ----
export const listDepartments = async (params = {}) => asPage(await http.get("/admin/departments", { params: { limit: 100, ...params } }));
export const createDepartment = async (body) => asOne(await http.post("/admin/departments", body));
export const updateDepartment = async (id, body) => asOne(await http.patch(`/admin/departments/${id}`, body));
export const deactivateDepartment = async (id) => asOne(await http.delete(`/admin/departments/${id}`));

// ---- programs = courses  (/api/v1/admin/programs) ----
export const listPrograms = async (params = {}) => asPage(await http.get("/admin/programs", { params: { limit: 100, ...params } }));
export const createProgram = async (body) => asOne(await http.post("/admin/programs", body));
export const updateProgram = async (id, body) => asOne(await http.patch(`/admin/programs/${id}`, body));
export const deactivateProgram = async (id) => asOne(await http.delete(`/admin/programs/${id}`));

// ---- subjects  (/api/v1/admin/subjects) ----
export const listSubjects = async (params = {}) => asPage(await http.get("/admin/subjects", { params: { limit: 100, ...params } }));
export const createSubject = async (body) => asOne(await http.post("/admin/subjects", body));
export const updateSubject = async (id, body) => asOne(await http.patch(`/admin/subjects/${id}`, body));
export const deactivateSubject = async (id) => asOne(await http.delete(`/admin/subjects/${id}`));
