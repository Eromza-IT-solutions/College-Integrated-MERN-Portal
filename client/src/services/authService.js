import { ROLES, ROLE_KEYS } from "../config/roles";

const DEMO_ACCOUNTS = Object.freeze({
  "superadmin@eromza.test": "superAdmin",
  "website@eromza.test": "websiteAdmin",
  "admission@eromza.test": "admissionAdmin",
  "exam@eromza.test": "examAdmin",
  "hod@eromza.test": "hod",
  "teacher@eromza.test": "teacher",
  "student@eromza.test": "student",
  "applicant@eromza.test": "applicant",
});

const DEMO_NAMES = Object.freeze({
  superAdmin: "Iqra Shaikh",
  websiteAdmin: "Ayesha Khan",
  admissionAdmin: "Sana Patel",
  examAdmin: "Zara Ansari",
  hod: "Dr. Sneha Patil",
  teacher: "Riya M",
  student: "Fatima Khan",
  applicant: "Rida Khan",
});

const DEMO_DEPARTMENTS = Object.freeze({
  hod: "Computer Science & Engineering",
  teacher: "Computer Science & Engineering",
  student: "B.Sc. Computer Science",
  applicant: "B.Com",
});

function buildUser(role, email) {
  return {
    id: `demo-${role}`,
    name: DEMO_NAMES[role] ?? ROLES[role]?.label ?? "User",
    email: email ?? `${role.toLowerCase()}@eromza.test`,
    role,
    department: DEMO_DEPARTMENTS[role] ?? null,
    status: "active",
  };
}

export async function loginWithDemoAccount({ identifier, password }) {
  await new Promise((resolve) => setTimeout(resolve, 450));

  const email = identifier?.trim().toLowerCase();
  if (!email || !password) {
    throw new Error("Please enter your username/email and password.");
  }

  const role = DEMO_ACCOUNTS[email] ?? "superAdmin";
  return buildUser(role, email);
}

export function createDemoUser(role) {
  if (!ROLE_KEYS.includes(role)) {
    throw new Error("Unknown demo role.");
  }
  return buildUser(role);
}
