import { checkEligibility, ELIGIBILITY } from '../src/modules/examinations/eligibility.js';

const hours = (h) => new Date(Date.now() + h * 3600 * 1000);
const student = (over = {}) => ({ status: 'active', programId: 'p1', currentSemester: 3, ...over });
const exam = (over = {}) => ({
  status: 'open', programId: 'p1', semester: 3, formOpensAt: hours(-24), formClosesAt: hours(24), ...over,
});
const codes = (result) => result.reasons.map((r) => r.code);

describe('checkEligibility', () => {
  test('active student, right class, open window: eligible', () => {
    expect(checkEligibility(student(), exam())).toEqual({ eligible: true, reasons: [] });
  });

  test('inactive student is not eligible', () => {
    const r = checkEligibility(student({ status: 'graduated' }), exam());
    expect(r.eligible).toBe(false);
    expect(codes(r)).toEqual([ELIGIBILITY.STUDENT_NOT_ACTIVE]);
  });

  test('other program or semester is not eligible', () => {
    expect(codes(checkEligibility(student({ programId: 'p2' }), exam()))).toEqual([ELIGIBILITY.WRONG_CLASS]);
    expect(codes(checkEligibility(student({ currentSemester: 4 }), exam()))).toEqual([ELIGIBILITY.WRONG_CLASS]);
  });

  test('draft and closed exams are not eligible', () => {
    expect(codes(checkEligibility(student(), exam({ status: 'draft' })))).toEqual([ELIGIBILITY.NOT_PUBLISHED]);
    expect(codes(checkEligibility(student(), exam({ status: 'closed' })))).toEqual([ELIGIBILITY.FORM_CLOSED]);
  });

  test('before opening and after closing date', () => {
    expect(codes(checkEligibility(student(), exam({ formOpensAt: hours(1), formClosesAt: hours(5) })))).toEqual([
      ELIGIBILITY.NOT_OPEN_YET]);
    expect(codes(checkEligibility(student(), exam({ formOpensAt: hours(-5), formClosesAt: hours(-1) })))).toEqual([
      ELIGIBILITY.FORM_CLOSED]);
  });

  test('reports every reason, not just the first', () => {
    const r = checkEligibility(student({ status: 'withdrawn', programId: 'p9' }), exam({ status: 'closed' }));
    expect(codes(r)).toEqual([ELIGIBILITY.STUDENT_NOT_ACTIVE, ELIGIBILITY.WRONG_CLASS, ELIGIBILITY.FORM_CLOSED]);
  });

  test('agrees with Exam.isOpen at the window edges', () => {
    const now = new Date('2026-11-22T10:00:00Z');
    expect(checkEligibility(student(), exam({ formOpensAt: now, formClosesAt: now }), now).eligible).toBe(true);
  });
});
