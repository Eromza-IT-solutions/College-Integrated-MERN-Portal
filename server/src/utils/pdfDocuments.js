import { buildPdf } from './pdf.js';

const dash = (value) => (value == null || value === '' ? '-' : String(value));
const money = (paise) => `INR ${((Number(paise) || 0) / 100).toFixed(2)}`;
const dateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dash(value);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
};
const dateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? dash(value) : date.toISOString().slice(0, 10);
};
const readable = (value) => {
  if (value == null || value === '') return '-';
  if (Array.isArray(value)) return value.map(readable).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function receiptPdf(receipt) {
  return buildPdf({
    title: 'Payment receipt',
    subtitle: 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT - PAYMENT RECEIPT',
    lines: [
      `Receipt number: ${dash(receipt.receiptNumber)}`,
      `Payment date: ${dateTime(receipt.paidAt)}`,
      `Payer: ${dash(receipt.payerName)}`,
      `Purpose: ${dash(receipt.purpose)}`,
      `Academic year: ${dash(receipt.academicYear)}`,
      `Amount: ${money(receipt.amountPaise)}`,
      `Currency: ${dash(receipt.currency)}`,
      `Gateway payment ID: ${dash(receipt.gatewayPaymentId)}`,
      `Payment ID: ${dash(receipt.paymentId)}`,
      `Test mode: ${receipt.isTestMode ? 'Yes' : 'No'}`,
      '',
      'This is a sample receipt for demonstration purposes.',
    ],
  });
}

function examFormPdf(form) {
  const details = form.details || {};
  const subjects = form.subjects || [];
  return buildPdf({
    title: 'Examination form',
    subtitle: 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT - EXAM FORM',
    lines: [
      `Form ID: ${dash(form._id)}`,
      `Exam ID: ${dash(form.examId)}`,
      `Enrollment number: ${dash(details.enrollmentNumber)}`,
      `Student name: ${dash(details.fullName)}`,
      `Semester: ${dash(details.semester)}`,
      `Fees category: ${dash(details.feesCategory)}`,
      `Division type: ${dash(details.divisionType)}`,
      `Status: ${dash(form.status)}`,
      `Exam fee: ${money(form.feeAmountPaise)}`,
      `Submitted at: ${dateTime(form.submittedAt)}`,
      `Decision note: ${dash(form.decisionNote)}`,
      '',
      'Subjects:',
      ...(subjects.length
        ? subjects.map((subject) => `${dash(subject.code)}  ${dash(subject.name)}  (${dash(subject.category)})`)
        : ['No subjects selected.']),
      '',
      'This is a sample examination form for demonstration purposes.',
    ],
  });
}

function hallTicketPdf(ticket) {
  const schedule = ticket.schedule || [];
  return buildPdf({
    title: 'Hall ticket',
    subtitle: 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT - HALL TICKET',
    lines: [
      `Exam: ${dash(ticket.examName)}`,
      `Enrollment number: ${dash(ticket.enrollmentNumber)}`,
      `Student name: ${dash(ticket.fullName)}`,
      `Program: ${dash(ticket.programName)}`,
      `Semester: ${dash(ticket.semester)}`,
      `Seat number: ${dash(ticket.seatNumber)}`,
      `Room: ${dash(ticket.room)}`,
      `Status: ${dash(ticket.status)}`,
      `Issued at: ${dateTime(ticket.issuedAt)}`,
      '',
      'Paper schedule:',
      ...(schedule.length
        ? schedule.map((item) => `${dateOnly(item.date)}  ${dash(item.startTime)}-${dash(item.endTime)}  ${dash(item.code)} ${dash(item.name)}  Room ${dash(item.room)}`)
        : ['No papers scheduled.']),
      '',
      'Carry this ticket and a photo identity card to every paper.',
      'This is a sample hall ticket for demonstration purposes.',
    ],
  });
}

function resultPdf(result) {
  const lines = result.lines || [];
  return buildPdf({
    title: 'Examination result',
    subtitle: 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT - MARKSHEET',
    lines: [
      `Enrollment number: ${dash(result.enrollmentNumber)}`,
      `Student name: ${dash(result.fullName)}`,
      `Semester: ${dash(result.semester)}`,
      `Exam ID: ${dash(result.examId)}`,
      `Published: ${result.isPublished ? 'Yes' : 'No'}`,
      `Published at: ${dateTime(result.publishedAt)}`,
      '',
      'Subject marks:',
      ...(lines.length
        ? lines.map((line) => `${dash(line.code)} ${dash(line.name)} | CIE ${dash(line.internalMarks)}/${dash(line.maxInternal)} | SEE ${dash(line.externalMarks)}/${dash(line.maxExternal)} | Total ${dash(line.total)}/${dash(line.max)} | Grade ${dash(line.grade)} | ${dash(line.status)}`)
        : ['No result lines.']),
      '',
      `Total obtained: ${dash(result.totalObtained)} / ${dash(result.totalMax)}`,
      `Percentage: ${result.percentage == null ? '-' : `${result.percentage}%`}`,
      `SGPA: ${dash(result.sgpa)}`,
      `Final grade: ${dash(result.finalGrade)}`,
      `Outcome: ${dash(result.outcome)}`,
      `Failed subjects: ${dash(result.failedSubjects)}`,
      '',
      'This is a sample marksheet for demonstration purposes.',
    ],
  });
}

function applicationPdf(application) {
  const student = application.student || {};
  const name = [student.firstName, student.middleName, student.surname].filter(Boolean).join(' ') || student.fullName;
  return buildPdf({
    title: 'Admission application',
    subtitle: 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT - APPLICATION ACKNOWLEDGEMENT',
    lines: [
      `Application number: ${dash(application.applicationNumber)}`,
      `Status: ${dash(application.status)}`,
      `Applicant name: ${dash(name)}`,
      `Email: ${dash(student.email)}`,
      `Mobile: ${dash(student.mobile)}`,
      `Program ID: ${dash(application.programId)}`,
      `Academic year ID: ${dash(application.academicYearId)}`,
      `Year of study: ${dash(application.yearOfStudy)}`,
      `Fees category: ${dash(application.feesCategory)}`,
      `Fee amount: ${money(application.feeAmountPaise)}`,
      `Submitted at: ${dateTime(application.submittedAt)}`,
      `Approved at: ${dateTime(application.approvedAt)}`,
      '',
      'This is a sample admission application acknowledgement for demonstration purposes.',
    ],
  });
}

function reportPdf(report) {
  const summary = Object.entries(report.summary || {}).map(([key, value]) => `${key} = ${readable(value)}`);
  const rows = (report.rows || []).map((row, index) => (
    `Row ${index + 1}: ${Object.entries(row).map(([key, value]) => `${key}=${readable(value)}`).join('; ')}`
  ));
  return buildPdf({
    title: report.title || 'Report',
    subtitle: 'SAMPLE / NOT AN OFFICIAL COLLEGE DOCUMENT - REPORT',
    lines: [
      ...(summary.length ? ['Summary:', ...summary, ''] : []),
      ...(rows.length ? ['Rows:', ...rows] : ['No rows matched the selected filters.']),
      '',
      'This is a sample report for demonstration purposes.',
    ],
  });
}

export { receiptPdf, examFormPdf, hallTicketPdf, resultPdf, applicationPdf, reportPdf };
