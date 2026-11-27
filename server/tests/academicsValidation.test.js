import {
  slotBody, slotUpdateBody, markBody, marksEnterBody, marksDecisionBody, resultMarksBody, resultUnpublishBody, resultQuery, parse,
} from '../src/modules/academics/academics.validation.js';

// Koi database nahi: sirf "browser ne galat cheez bheji to 400 milega" wale rules.
const id = '64b0000000000000000000b1';
const slot = { academicYearId: id, programId: id, semester: 1, subjectId: id, teacherUserId: id, dayOfWeek: 1, period: 2 };
const bad = (schema, input) => { try { parse(schema, input); } catch (e) { return e; } return null; };

test('a good slot passes and division defaults to A', () => {
  expect(parse(slotBody, slot).division).toBe('A');
});
test.each([
  ['day 8', { ...slot, dayOfWeek: 8 }],
  ['period 99', { ...slot, period: 99 }],
  ['time 9:30', { ...slot, startTime: '9:30' }],
  ['extra field departmentId (department server decide karta hai)', { ...slot, departmentId: id }],
])('slot is refused: %s', (_n, input) => {
  expect(bad(slotBody, input).code).toBe('VALIDATION_ERROR');
});
test('slot update needs at least one field', () => {
  expect(bad(slotUpdateBody, {})).not.toBeNull();
  expect(bad(slotUpdateBody, { room: 'R1' })).toBeNull();
});
test('attendance: status must be present / absent / leave; date must look like 2026-11-16', () => {
  expect(bad(markBody, { slotId: id, lectureDate: '2026-11-16', records: [{ studentId: id, status: 'late' }] })).not.toBeNull();
  expect(bad(markBody, { slotId: id, lectureDate: '16-11-2026', records: [] })).not.toBeNull();
  expect(bad(markBody, { slotId: id, lectureDate: '2026-11-16', records: [{ studentId: id, status: 'present' }] })).toBeNull();
});
test('marks go in steps of 0.5 and need at least one student', () => {
  const body = { subjectId: id, semester: 1, academicYearId: id, component: 'T1', outOf: 20 };
  expect(bad(marksEnterBody, { ...body, entries: [{ studentId: id, obtained: 17.5 }] })).toBeNull();
  expect(bad(marksEnterBody, { ...body, entries: [{ studentId: id, obtained: 17.3 }] })).not.toBeNull();
  expect(bad(marksEnterBody, { ...body, entries: [] })).not.toBeNull();
});
test('returning marks needs a note; approving does not', () => {
  expect(bad(marksDecisionBody, { ids: [id], approve: false })).not.toBeNull();
  expect(bad(marksDecisionBody, { ids: [id], approve: true })).toBeNull();
});
test('result marks: an absent student cannot also have marks; unpublish needs a reason', () => {
  expect(bad(resultMarksBody, { entries: [{ subjectId: id, absent: true, internalMarks: 5 }] })).not.toBeNull();
  expect(bad(resultMarksBody, { entries: [{ subjectId: id, internalMarks: 30, externalMarks: 45.5 }] })).toBeNull();
  expect(bad(resultUnpublishBody, {})).not.toBeNull();
});
test('list query: page defaults to 1 and isPublished text becomes a boolean', () => {
  const q = parse(resultQuery, { isPublished: 'true' });
  expect(q).toMatchObject({ page: 1, limit: 20, isPublished: true });
});
