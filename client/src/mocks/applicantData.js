export const applicantKpis = [
  {
    id: "status",
    label: "Application Status",
    value: "Under Review",
    change: "Stage 3 of 5",
    tone: "warning",
    icon: "status",
  },
  {
    id: "documents",
    label: "Documents",
    value: "3/4",
    change: "1 pending",
    tone: "info",
    icon: "documents",
  },
  {
    id: "payment",
    label: "Admission Fee",
    value: "Pending",
    change: "₹18,500",
    tone: "accent",
    icon: "payment",
  },
  {
    id: "notifications",
    label: "Notifications",
    value: "2",
    change: "Unread",
    tone: "success",
    icon: "notifications",
  },
];

export const applicantProfile = {
  applicationId: "APP-2026-0486",
  name: "Rida Khan",
  program: "B.Sc. Computer Science",
  submitted: "13 Nov 2026",
  stage: "Document verification",
  status: "under review",
  nextStep: "Re-upload your Class XII marksheet to complete document verification.",
  counselor: "Ayesha Khan",
};

export const applicantTimeline = [
  {
    id: "submitted",
    label: "Application submitted",
    description: "Application form received",
    status: "completed",
  },
  {
    id: "documents",
    label: "Documents uploaded",
    description: "3 of 4 documents verified",
    status: "completed",
  },
  {
    id: "verification",
    label: "Document verification",
    description: "Marksheet re-upload required",
    status: "in progress",
  },
  {
    id: "merit",
    label: "Merit review",
    description: "Pending document clearance",
    status: "pending",
  },
  {
    id: "decision",
    label: "Admission decision",
    description: "Offer letter and fee payment",
    status: "pending",
  },
];

export const applicantDocuments = [
  {
    id: "DOC-1",
    name: "Government ID proof",
    status: "verified",
    updated: "13 Nov 2026",
  },
  {
    id: "DOC-2",
    name: "Class XII marksheet",
    status: "pending",
    updated: "Re-upload required",
  },
  {
    id: "DOC-3",
    name: "Leaving certificate",
    status: "verified",
    updated: "13 Nov 2026",
  },
  {
    id: "DOC-4",
    name: "Passport-size photograph",
    status: "verified",
    updated: "13 Nov 2026",
  },
];

export const applicantPayment = {
  amount: 18500,
  status: "pending",
  dueDate: "30 Nov 2026",
  reference: "ADM-2026-0486",
};

export const applicantNotices = [
  {
    id: "APP-NTC-1",
    title: "Re-upload your Class XII marksheet",
    category: "Documents",
    date: "13 Nov 2026",
    priority: "High",
    read: false,
    body: "The uploaded marksheet is not legible. Please re-upload a clear scan or photograph to continue document verification.",
  },
  {
    id: "APP-NTC-2",
    title: "Admission fee payment window is now open",
    category: "Payments",
    date: "12 Nov 2026",
    priority: "Medium",
    read: false,
    body: "You can now pay the admission fee from the Payments section. Complete payment before 30 November to confirm your seat.",
  },
  {
    id: "APP-NTC-3",
    title: "Document verification checklist updated",
    category: "Admissions",
    date: "10 Nov 2026",
    priority: "Low",
    read: true,
    body: "The document checklist has been updated with clearer upload requirements for identity and academic records.",
  },
];

export const applicantApplication = {
  applicationId: "APP-2026-0486",
  name: "Rida Khan",
  email: "rida.khan@example.com",
  phone: "+91 98765 43218",
  dateOfBirth: "14 Mar 2008",
  gender: "Female",
  category: "General",
  program: "B.Sc. Computer Science",
  specialization: "Computer Science",
  previousSchool: "St. Mary's Junior College, Pune",
  previousBoard: "Maharashtra State Board",
  previousPercentage: "87.4%",
  address: "Flat 402, Crescent Residency, Pune, Maharashtra",
  guardian: "Imran Khan",
  guardianPhone: "+91 98220 11445",
  submitted: "13 Nov 2026",
  status: "under review",
};

export const applicantPaymentHistory = [
  {
    id: "APP-TXN-1",
    description: "Application processing fee",
    amount: 750,
    method: "UPI",
    date: "13 Nov 2026",
    status: "paid",
  },
];

export const applicantPersonalProfile = {
  name: "Rida Khan",
  email: "rida.khan@example.com",
  phone: "+91 98765 43218",
  dateOfBirth: "14 Mar 2008",
  gender: "Female",
  address: "Flat 402, Crescent Residency, Pune, Maharashtra",
  guardian: "Imran Khan",
  guardianPhone: "+91 98220 11445",
  preferredContact: "Email",
  status: "active",
};
