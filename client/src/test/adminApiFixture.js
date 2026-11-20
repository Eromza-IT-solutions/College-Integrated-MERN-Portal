import { vi } from "vitest";

export const adminApiFixtures = {
  exams: [
    {
      _id: "exam-1",
      name: "End Semester Examination",
      status: "open",
      semester: 5,
      programId: "prog-1",
      academicYearId: "year-1",
      formOpensAt: "2026-10-01T09:00:00.000Z",
      formClosesAt: "2026-11-01T17:00:00.000Z",
      updatedAt: "2026-11-10T10:00:00.000Z",
      schedule: [
        {
          subjectId: "sub-2",
          date: "2026-11-25",
          startTime: "10:00",
          endTime: "13:00",
          room: "A-201",
        },
      ],
    },
  ],
  reference: {
    academicYears: [{ _id: "year-1", label: "2026-27" }],
    programs: [{ _id: "prog-1", name: "B.Sc. Computer Science", code: "BScCS" }],
    subjects: [
      { _id: "sub-1", code: "CS-503", name: "Data Structures", programId: "prog-1", semester: 5 },
      { _id: "sub-2", code: "CS-504", name: "Advanced Accounting", programId: "prog-1", semester: 5 },
    ],
  },
  forms: [
    {
      _id: "form-1",
      status: "submitted",
      subjects: ["sub-1", "sub-2"],
      feeAmountPaise: 228500,
      submittedAt: "2026-10-20T08:30:00.000Z",
      updatedAt: "2026-10-20T08:30:00.000Z",
      details: { fullName: "Fatima Khan", enrollmentNumber: "2024A001" },
    },
  ],
  tickets: [
    {
      _id: "ticket-1",
      fullName: "Fatima Khan",
      enrollmentNumber: "2024A001",
      examName: "End Semester Examination",
      programName: "B.Sc. Computer Science",
      semester: 5,
      seatNumber: "S-001",
      room: "A-201",
      status: "issued",
      issuedAt: "2026-11-12T06:00:00.000Z",
    },
  ],
  results: [
    {
      _id: "result-1",
      examId: "exam-1",
      examFormId: "form-1",
      enrollmentNumber: "2024A001",
      fullName: "Fatima Khan",
      semester: 5,
      totalObtained: 87,
      totalMax: 100,
      percentage: 87,
      outcome: "pass",
      sgpa: 8.7,
      finalGrade: "A+",
      isComplete: true,
      isPublished: false,
      lines: [
        {
          subjectId: "sub-1",
          code: "CS-503",
          name: "Data Structures",
          maxInternal: 40,
          maxExternal: 60,
          internalMarks: 35,
          externalMarks: 52,
          absent: false,
          total: 87,
          percent: 87,
          status: "pass",
          grade: "A+",
        },
      ],
    },
  ],
};

export function createAdminApiMock() {
  const result = () => adminApiFixtures.results[0];
  return {
    fetchExams: vi.fn(async () => adminApiFixtures.exams),
    fetchExam: vi.fn(async (id) => adminApiFixtures.exams.find((exam) => exam._id === id)),
    fetchExamReference: vi.fn(async () => adminApiFixtures.reference),
    fetchExamForms: vi.fn(async () => adminApiFixtures.forms),
    fetchExamForm: vi.fn(async (id) => adminApiFixtures.forms.find((form) => form._id === id)),
    fetchExamTickets: vi.fn(async () => adminApiFixtures.tickets),
    createExam: vi.fn(async (payload) => ({ _id: "exam-new", ...payload })),
    updateExam: vi.fn(async (id, payload) => ({ ...adminApiFixtures.exams[0], ...payload })),
    decideExamForm: vi.fn(async () => ({ status: "approved" })),
    generateHallTickets: vi.fn(async () => ({ rows: [], created: 1, updated: 0, skipped: 0 })),
    updateHallTicket: vi.fn(async () => adminApiFixtures.tickets[0]),
    downloadAdminHallTicketPdf: vi.fn(),
    downloadAdminExamFormPdf: vi.fn(),
    fetchResults: vi.fn(async () => adminApiFixtures.results),
    openResult: vi.fn(async () => result()),
    enterMarks: vi.fn(async () => result()),
    publishResult: vi.fn(async () => ({ ...result(), isPublished: true })),
    publishExamResults: vi.fn(async () => ({ published: 1, incomplete: 0 })),
    unpublishResult: vi.fn(async () => ({ ...result(), isPublished: false })),
    downloadAdminResultPdf: vi.fn(),
  };
}
