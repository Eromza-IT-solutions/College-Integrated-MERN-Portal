export const studentKpis = [
  {
    id: "attendance",
    label: "Overall Attendance",
    value: "88%",
    change: "+2.1%",
    tone: "success",
    icon: "attendance",
  },
  {
    id: "gpa",
    label: "Current GPA",
    value: "8.7",
    change: "+0.3",
    tone: "info",
    icon: "gpa",
  },
  {
    id: "fees",
    label: "Pending Fees",
    value: "₹12,500",
    change: "Due 30 Nov",
    tone: "warning",
    icon: "fees",
  },
  {
    id: "exams",
    label: "Upcoming Exams",
    value: "3",
    change: "Next 10 days",
    tone: "accent",
    icon: "exams",
  },
];

export const studentTimetable = [
  {
    id: "STU-CLS-1",
    time: "09:00 AM",
    subject: "Data Structures",
    faculty: "Dr. Sana Patel",
    room: "Lab 2",
  },
  {
    id: "STU-CLS-2",
    time: "10:30 AM",
    subject: "Advanced Algorithms",
    faculty: "Dr. Sana Patel",
    room: "Room 204",
  },
  {
    id: "STU-CLS-3",
    time: "12:00 PM",
    subject: "Web Technologies",
    faculty: "Prof. Zara Ansari",
    room: "Lab 1",
  },
  {
    id: "STU-CLS-4",
    time: "02:00 PM",
    subject: "Database Systems",
    faculty: "Prof. Zara Ansari",
    room: "Lab 1",
  },
];

export const studentAttendanceBreakdown = [
  { label: "Data Structures", value: 92, color: "#19845b" },
  { label: "Advanced Algorithms", value: 88, color: "#3279be" },
  { label: "Web Technologies", value: 84, color: "#d88a2d" },
  { label: "Database Systems", value: 90, color: "#a9233d" },
];

export const studentResults = [
  {
    id: "RES-101",
    subject: "Data Structures",
    marks: "86/100",
    grade: "A",
    status: "published",
  },
  {
    id: "RES-102",
    subject: "Advanced Algorithms",
    marks: "91/100",
    grade: "A+",
    status: "published",
  },
  {
    id: "RES-103",
    subject: "Web Technologies",
    marks: "81/100",
    grade: "A",
    status: "published",
  },
  {
    id: "RES-104",
    subject: "Database Systems",
    marks: "78/100",
    grade: "B+",
    status: "moderated",
  },
];

export const studentExamSchedule = [
  {
    id: "STU-EXM-1",
    subject: "Data Structures",
    date: "19 Nov 2026",
    time: "10:00 AM",
    room: "Lab 2",
    status: "scheduled",
  },
  {
    id: "STU-EXM-2",
    subject: "Advanced Algorithms",
    date: "21 Nov 2026",
    time: "10:00 AM",
    room: "Room 204",
    status: "scheduled",
  },
  {
    id: "STU-EXM-3",
    subject: "Web Technologies",
    date: "23 Nov 2026",
    time: "02:00 PM",
    room: "Lab 1",
    status: "scheduled",
  },
];

export const studentNotices = [
  {
    id: "STU-NTC-1",
    title: "Semester V internal exam timetable released",
    category: "Examination",
    date: "13 Nov 2026",
    priority: "High",
    read: false,
    body: "The internal examination timetable for Semester V is now available. Review your subject schedule and report any clashes to the examination office.",
  },
  {
    id: "STU-NTC-2",
    title: "Library extended hours during examinations",
    category: "Library",
    date: "12 Nov 2026",
    priority: "Medium",
    read: false,
    body: "The central library will remain open until 08:00 PM on weekdays throughout the examination period.",
  },
  {
    id: "STU-NTC-3",
    title: "Fee payment window closes on 30 November",
    category: "Fees",
    date: "10 Nov 2026",
    priority: "High",
    read: true,
    body: "Clear any pending semester fees before 30 November to avoid a late payment charge and examination form hold.",
  },
];

export const studentProfile = {
  name: "Rida Khan",
  rollNo: "CS21-018",
  email: "rida.khan@abcedu.in",
  phone: "+91 98765 43218",
  program: "B.Sc. Computer Science",
  semester: "V",
  division: "A",
  department: "Computer Science",
  admissionYear: "2021",
  address: "Flat 402, Crescent Residency, Pune, Maharashtra",
  guardian: "Imran Khan",
  guardianPhone: "+91 98220 11445",
  status: "active",
};

export const studentAttendanceRows = [
  {
    id: "STU-ATT-1",
    subject: "Data Structures",
    faculty: "Dr. Sana Patel",
    attended: 46,
    total: 50,
    percentage: 92,
    status: "good",
  },
  {
    id: "STU-ATT-2",
    subject: "Advanced Algorithms",
    faculty: "Dr. Sana Patel",
    attended: 44,
    total: 50,
    percentage: 88,
    status: "good",
  },
  {
    id: "STU-ATT-3",
    subject: "Web Technologies",
    faculty: "Prof. Zara Ansari",
    attended: 42,
    total: 50,
    percentage: 84,
    status: "warning",
  },
  {
    id: "STU-ATT-4",
    subject: "Database Systems",
    faculty: "Prof. Zara Ansari",
    attended: 45,
    total: 50,
    percentage: 90,
    status: "good",
  },
  {
    id: "STU-ATT-5",
    subject: "Operating Systems",
    faculty: "Dr. Imran Shaikh",
    attended: 41,
    total: 50,
    percentage: 82,
    status: "warning",
  },
];

export const studentExamForms = [
  {
    id: "FORM-501",
    exam: "Semester V Internal Assessment",
    submitted: "11 Nov 2026",
    feeStatus: "paid",
    status: "approved",
  },
  {
    id: "FORM-502",
    exam: "Semester V Practical Examination",
    submitted: "12 Nov 2026",
    feeStatus: "paid",
    status: "submitted",
  },
  {
    id: "FORM-503",
    exam: "Semester V End Examination",
    submitted: "Not submitted",
    feeStatus: "unpaid",
    status: "pending",
  },
];

export const studentWeeklyTimetable = [
  {
    id: "STU-TT-1",
    day: "Monday",
    time: "09:00 AM",
    subject: "Data Structures",
    faculty: "Dr. Sana Patel",
    room: "Lab 2",
  },
  {
    id: "STU-TT-2",
    day: "Monday",
    time: "12:00 PM",
    subject: "Web Technologies",
    faculty: "Prof. Zara Ansari",
    room: "Lab 1",
  },
  {
    id: "STU-TT-3",
    day: "Tuesday",
    time: "10:30 AM",
    subject: "Advanced Algorithms",
    faculty: "Dr. Sana Patel",
    room: "Room 204",
  },
  {
    id: "STU-TT-4",
    day: "Tuesday",
    time: "02:00 PM",
    subject: "Database Systems",
    faculty: "Prof. Zara Ansari",
    room: "Lab 1",
  },
  {
    id: "STU-TT-5",
    day: "Wednesday",
    time: "09:00 AM",
    subject: "Data Structures",
    faculty: "Dr. Sana Patel",
    room: "Lab 2",
  },
  {
    id: "STU-TT-6",
    day: "Wednesday",
    time: "12:00 PM",
    subject: "Web Technologies",
    faculty: "Prof. Zara Ansari",
    room: "Lab 1",
  },
  {
    id: "STU-TT-7",
    day: "Thursday",
    time: "10:30 AM",
    subject: "Advanced Algorithms",
    faculty: "Dr. Sana Patel",
    room: "Room 204",
  },
  {
    id: "STU-TT-8",
    day: "Thursday",
    time: "03:30 PM",
    subject: "Operating Systems",
    faculty: "Dr. Imran Shaikh",
    room: "Room 108",
  },
  {
    id: "STU-TT-9",
    day: "Friday",
    time: "09:00 AM",
    subject: "Data Structures",
    faculty: "Dr. Sana Patel",
    room: "Lab 2",
  },
  {
    id: "STU-TT-10",
    day: "Friday",
    time: "02:00 PM",
    subject: "Database Systems",
    faculty: "Prof. Zara Ansari",
    room: "Lab 1",
  },
];

export const studentHallTickets = [
  {
    id: "HT-501",
    exam: "Semester V Internal Assessment",
    subject: "Data Structures",
    date: "19 Nov 2026",
    time: "10:00 AM",
    room: "Lab 2",
    seat: "CS-V-018",
    status: "issued",
  },
  {
    id: "HT-502",
    exam: "Semester V Internal Assessment",
    subject: "Advanced Algorithms",
    date: "21 Nov 2026",
    time: "10:00 AM",
    room: "Room 204",
    seat: "CS-V-018",
    status: "issued",
  },
  {
    id: "HT-503",
    exam: "Semester V Internal Assessment",
    subject: "Web Technologies",
    date: "23 Nov 2026",
    time: "02:00 PM",
    room: "Lab 1",
    seat: "CS-V-018",
    status: "pending",
  },
];

export const studentSemesterSummary = {
  gpa: "8.7",
  credits: "22 / 24",
  rank: "12",
  attendance: "88%",
  status: "published",
};

export const studentFeeSummary = {
  total: 62500,
  paid: 50000,
  pending: 12500,
  dueDate: "30 Nov 2026",
  status: "unpaid",
};

export const studentFeeTransactions = [
  {
    id: "TXN-9001",
    description: "Semester V tuition fee",
    amount: 30000,
    method: "UPI",
    date: "02 Aug 2026",
    status: "paid",
  },
  {
    id: "TXN-9002",
    description: "Semester V examination fee",
    amount: 12500,
    method: "Net banking",
    date: "18 Sep 2026",
    status: "paid",
  },
  {
    id: "TXN-9003",
    description: "Semester V laboratory fee",
    amount: 7500,
    method: "Card",
    date: "04 Oct 2026",
    status: "paid",
  },
];
