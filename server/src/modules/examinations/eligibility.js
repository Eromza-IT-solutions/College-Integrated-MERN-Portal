// Who may fill the exam form for an exam, and if not, why not.
// No imports on purpose: this is a plain function, so it is easy to test.
export const ELIGIBILITY = Object.freeze({
  STUDENT_NOT_ACTIVE: 'STUDENT_NOT_ACTIVE',
  WRONG_CLASS: 'WRONG_CLASS',
  NOT_PUBLISHED: 'NOT_PUBLISHED',
  NOT_OPEN_YET: 'NOT_OPEN_YET',
  FORM_CLOSED: 'FORM_CLOSED',
});

/**
 * @param student { status, programId, currentSemester }
 * @param exam { status, programId, semester, formOpensAt, formClosesAt }
 * @returns { eligible: boolean, reasons: [{ code, message }] }
 * Same rules as Exam.isOpen() and ExamForm.start(), but it reports every reason instead of stopping at the first.
 */
export function checkEligibility(student, exam, now = new Date()) {
  const reasons = [];
  const add = (code, message) => reasons.push({ code, message });

  if (student.status !== 'active') {
    add(ELIGIBILITY.STUDENT_NOT_ACTIVE, 'Only an active student can fill the exam form.');
  }
  if (String(student.programId) !== String(exam.programId) || student.currentSemester !== exam.semester) {
    add(ELIGIBILITY.WRONG_CLASS, 'This exam is not for your class and semester.');
  }
  if (exam.status === 'draft') {
    add(ELIGIBILITY.NOT_PUBLISHED, 'The exam office has not opened this exam yet.');
  } else if (exam.status === 'closed') {
    add(ELIGIBILITY.FORM_CLOSED, 'The exam form is closed.');
  } else if (now < new Date(exam.formOpensAt)) {
    add(ELIGIBILITY.NOT_OPEN_YET, 'The exam form has not opened yet.');
  } else if (now > new Date(exam.formClosesAt)) {
    add(ELIGIBILITY.FORM_CLOSED, 'The last date for the exam form has passed.');
  }
  return { eligible: reasons.length === 0, reasons };
}
