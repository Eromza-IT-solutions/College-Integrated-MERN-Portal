export const ROLES = Object.freeze({
  superAdmin: {
    label: "Super Admin",
    shortLabel: "Super Admin",
    home: "/super-admin/dashboard",
    description: "System-wide users, permissions, reports, and audit oversight.",
  },
  websiteAdmin: {
    label: "College Website Admin",
    shortLabel: "Website Admin",
    home: "/website-admin/dashboard",
    description: "Public pages, departments, faculty, gallery, and notices.",
  },
  admissionAdmin: {
    label: "Admission Admin",
    shortLabel: "Admission Admin",
    home: "/admission-admin/dashboard",
    description: "Applications, document verification, admission status, and fees.",
  },
  examAdmin: {
    label: "Examination Admin",
    shortLabel: "Exam Admin",
    home: "/exam-admin/dashboard",
    description: "Exam sessions, forms, timetables, marks, results, and hall tickets.",
  },
  hod: {
    label: "Head of Department",
    shortLabel: "HOD",
    home: "/hod/dashboard",
    description: "Department teachers, students, attendance, and reports.",
  },
  teacher: {
    label: "Teacher",
    shortLabel: "Teacher",
    home: "/teacher/dashboard",
    description: "Classes, attendance, marks, timetable, and updates.",
  },
  student: {
    label: "Student",
    shortLabel: "Student",
    home: "/student/dashboard",
    description: "Profile, attendance, examinations, results, fees, and notices.",
  },
  applicant: {
    label: "Applicant",
    shortLabel: "Applicant",
    home: "/applicant/dashboard",
    description: "Application, documents, status, payments, and notifications.",
  },
});

export const ROLE_KEYS = Object.freeze(Object.keys(ROLES));

export function getRoleLabel(role) {
  return ROLES[role]?.label ?? "User";
}

export function getRoleHome(role) {
  return ROLES[role]?.home ?? "/login";
}
