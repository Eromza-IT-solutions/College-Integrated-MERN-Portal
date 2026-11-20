import mongoose from 'mongoose';
import Result from '../src/models/Result.js';
import ExamForm from '../src/models/ExamForm.js';
import Subject from '../src/models/Subject.js';
import { evaluate, gradeForMarks, finalGradeFor, cgpa } from '../src/utils/resultRules.js';

const id = () => new mongoose.Types.ObjectId();
const q = (value) => ({ session: async () => value });
// a 4-credit subject worth 100 marks: 40 internal (CIE) + 60 external (SEE)
const line = (internalMarks, externalMarks, extra = {}) => ({ maxInternal: 40, maxExternal: 60, credits: 4, internalMarks, externalMarks, ...extra });

describe('grade for a marks percentage (college grade sheet)', () => {
  test.each([
    [100, 'O', 10], [90, 'O', 10], [89, 'A+', 9], [80, 'A+', 9], [79, 'A', 8], [70, 'A', 8],
    [69, 'B+', 7], [55, 'B+', 7], [54, 'B', 6], [50, 'B', 6], [49, 'C', 5], [45, 'C', 5],
    [44, 'P', 4], [40, 'P', 4], [39, 'F', 0], [0, 'F', 0],
  ])('%i out of 100 is %s (grade point %i)', (marks, grade, point) => {
    expect(gradeForMarks(marks, 100)).toEqual({ grade, point });
  });
  test('works for any maximum: 20 out of 50 is exactly 40%', () => { expect(gradeForMarks(20, 50)).toEqual({ grade: 'P', point: 4 }); });
  test('no maximum marks is F', () => { expect(gradeForMarks(0, 0)).toEqual({ grade: 'F', point: 0 }); });
});

describe('final grade from SGPA or CGPA', () => {
  test.each([
    [10, 'O'], [9.5, 'O'], [9.49, 'A+'], [8.5, 'A+'], [8.49, 'A'], [7.5, 'A'], [7.49, 'B+'], [6.25, 'B+'],
    [6.24, 'B'], [5.25, 'B'], [5.24, 'C'], [4.75, 'C'], [4.74, 'P'], [4, 'P'], [3.99, 'F'], [0, 'F'],
  ])('%s is %s', (gpa, grade) => { expect(finalGradeFor(gpa)).toBe(grade); });
  test('no value gives no grade', () => { expect(finalGradeFor(null)).toBeNull(); });
});

describe('evaluate (CBCS rules)', () => {
  test('a line is pending until marks are entered; nothing is worked out until every line is done', () => {
    const r = evaluate([line(30, 50), line(undefined, undefined)]);
    expect(r.lines[1].status).toBe('pending');
    expect(r.isComplete).toBe(false);
    expect(r.outcome).toBeNull();
    expect(r.sgpa).toBeNull();
    expect(r.finalGrade).toBeNull();
    expect(r.percentage).toBeNull();
  });
  test('only one of the two marks entered is still pending', () => {
    expect(evaluate([line(30, undefined)]).lines[0].status).toBe('pending');
  });
  test('no lines is not complete', () => { expect(evaluate([]).isComplete).toBe(false); });

  test('a passed subject gets its grade, grade point, percent and credits', () => {
    const r = evaluate([line(35, 50)]);
    expect(r.lines[0]).toMatchObject({ total: 85, max: 100, percent: 85, status: 'pass', grade: 'A+', gradePoint: 9, creditsEarned: 4 });
  });
  test('exactly 40% in both parts passes with grade P', () => {
    const r = evaluate([line(16, 24)]);
    expect(r.lines[0]).toMatchObject({ status: 'pass', grade: 'P', gradePoint: 4 });
  });
  test('39% in the internal part fails the subject even when the total is high', () => {
    const r = evaluate([line(15, 60)]); // total 75, but CIE is 37.5%
    expect(r.lines[0]).toMatchObject({ total: 75, status: 'fail', grade: 'F', gradePoint: 0, creditsEarned: 0 });
    expect(r.failedSubjects).toBe(1);
    expect(r.outcome).toBe('fail');
  });
  test('below 40% in the external part fails the subject even when the total is high', () => {
    const r = evaluate([line(40, 23)]); // total 63, but SEE is 38.3%
    expect(r.lines[0]).toMatchObject({ status: 'fail', grade: 'F', gradePoint: 0, creditsEarned: 0 });
  });
  test('failing both parts fails', () => { expect(evaluate([line(5, 5)]).lines[0].status).toBe('fail'); });
  test('absent is AB: fails the subject, grade point 0, counts as zero in the totals', () => {
    const r = evaluate([line(40, 60), line(undefined, undefined, { absent: true })]);
    expect(r.lines[1]).toMatchObject({ total: 0, max: 100, status: 'fail', grade: 'AB', gradePoint: 0, creditsEarned: 0 });
    expect(r.totalObtained).toBe(100);
    expect(r.totalMax).toBe(200);
    expect(r.percentage).toBe(50);
    expect(r.outcome).toBe('fail');
  });
  test('a part with no maximum marks is not checked (a subject graded on one part only)', () => {
    const r = evaluate([{ maxInternal: 0, maxExternal: 100, credits: 2, internalMarks: 0, externalMarks: 50 }]);
    expect(r.lines[0]).toMatchObject({ status: 'pass', grade: 'B', gradePoint: 6 });
  });
  test('a subject with no maximum marks at all cannot be passed', () => {
    expect(evaluate([{ maxInternal: 0, maxExternal: 0, credits: 2, internalMarks: 0, externalMarks: 0 }]).lines[0].status).toBe('fail');
  });
  test('half marks work and the overall percentage is rounded to 2 decimals', () => {
    const r = evaluate([line(20.5, 30), line(30, 40), line(33, 32)]);
    expect(r.totalObtained).toBe(185.5);
    expect(r.percentage).toBe(61.83);
  });

  test('SGPA is credit-weighted: 4 credits at point 10 and 2 credits at point 4 gives 8.00, final grade A', () => {
    const r = evaluate([line(36, 54), line(16, 24, { credits: 2 })]);
    expect(r).toMatchObject({ sgpa: 8, finalGrade: 'A', outcome: 'pass', creditsTotal: 6, creditsEarned: 6 });
  });
  test('SGPA is rounded to 2 decimals: points 10, 9, 9 with equal credits is 9.33 (A+)', () => {
    const r = evaluate([line(36, 54, { credits: 1 }), line(32, 48, { credits: 1 }), line(32, 48, { credits: 1 })]);
    expect(r.sgpa).toBe(9.33);
    expect(r.finalGrade).toBe('A+');
  });
  test('a failed subject still counts in the SGPA with point 0 but earns no credits', () => {
    const r = evaluate([line(36, 54), line(5, 5)]); // 4 credits at 10, 4 credits at 0
    expect(r).toMatchObject({ sgpa: 5, finalGrade: 'C', outcome: 'fail', creditsTotal: 8, creditsEarned: 4 });
  });
  test('a non-CGPA course is graded but left out of the SGPA', () => {
    const r = evaluate([line(36, 54), line(16, 24, { credits: 10, countsForCgpa: false })]);
    expect(r.sgpa).toBe(10);
    expect(r.lines[1].grade).toBe('P');
    expect(r.creditsEarned).toBe(14);
  });
  test('SGPA is null when no subject carries credits', () => {
    expect(evaluate([line(36, 54, { credits: 0 })]).sgpa).toBeNull();
  });
});

describe('cgpa (all semesters)', () => {
  test('is credit-weighted over every subject', () => {
    expect(cgpa([{ credits: 4, gradePoint: 10 }, { credits: 4, gradePoint: 8 }, { credits: 2, gradePoint: 6 }])).toEqual({ cgpa: 8.4, finalGrade: 'A', credits: 10 });
  });
  test('leaves out non-CGPA courses', () => {
    expect(cgpa([{ credits: 4, gradePoint: 8 }, { credits: 9, gradePoint: 4, countsForCgpa: false }]).cgpa).toBe(8);
  });
  test('is null before any credits', () => { expect(cgpa([])).toEqual({ cgpa: null, finalGrade: null, credits: 0 }); });
});

describe('Result model', () => {
  const subj = () => ({ subjectId: id(), code: 'S', name: 'Subject', category: 'major', maxInternal: 40, maxExternal: 60, credits: 4 });
  const sheet = (lines, over = {}) => new Result({ examId: id(), studentId: id(), examFormId: id(), lines, ...over });

  test('totals, grades and SGPA are worked out on validate', async () => {
    const a = subj(); const b = subj();
    const r = sheet([{ ...a, internalMarks: 35, externalMarks: 50 }, { ...b, internalMarks: 30, externalMarks: 40 }]);
    await r.validate();
    expect(r).toMatchObject({ totalObtained: 155, totalMax: 200, percentage: 77.5, outcome: 'pass', isComplete: true, failedSubjects: 0, sgpa: 8.5, finalGrade: 'A+', creditsTotal: 8, creditsEarned: 8 });
    expect(r.lines[0]).toMatchObject({ total: 85, max: 100, status: 'pass', grade: 'A+', gradePoint: 9, creditsEarned: 4 });
    expect(r.lines[1]).toMatchObject({ grade: 'A', gradePoint: 8 });
  });
  test('an empty sheet is valid but incomplete', async () => {
    const r = sheet([subj()]);
    await r.validate();
    expect(r.isComplete).toBe(false);
    expect(r.outcome).toBeUndefined();
    expect(r.sgpa).toBeUndefined();
  });
  test.each([
    ['internal above maximum', { internalMarks: 41, externalMarks: 10 }],
    ['external above maximum', { internalMarks: 10, externalMarks: 61 }],
    ['negative', { internalMarks: -1, externalMarks: 10 }],
    ['quarter mark', { internalMarks: 10.25, externalMarks: 10 }],
    ['absent with marks', { absent: true, internalMarks: 10 }],
  ])('rejects %s', async (_n, patch) => {
    await expect(sheet([{ ...subj(), ...patch }]).validate()).rejects.toThrow();
  });
  test('the same subject twice is rejected', async () => {
    const a = subj();
    await expect(sheet([a, { ...a }]).validate()).rejects.toThrow(/twice/);
  });
  test('an incomplete result cannot be marked published', async () => {
    await expect(sheet([subj()], { isPublished: true }).validate()).rejects.toThrow(/incomplete/i);
  });
});

describe('result flow', () => {
  let store; let form;
  beforeEach(() => {
    store = [];
    form = {
      _id: id(), examId: id(), studentId: id(), status: 'approved',
      details: { enrollmentNumber: 'ENR-1', fullName: 'Aman', semester: 1 },
      subjects: [{ subjectId: id(), code: 'A', name: 'A', category: 'major' }, { subjectId: id(), code: 'B', name: 'B', category: 'aec' }],
    };
    ExamForm.findById = () => q(form);
    // Subject A is a 4-credit subject with 20 internal + 30 external marks; subject B is not found, so it gets the proposed defaults.
    Subject.find = () => q([{ _id: form.subjects[0].subjectId, credits: 4, maxInternal: 20, maxExternal: 30, countsForCgpa: true }]);
    Result.findOne = () => q(store[0] || null);
    Result.create = async ([doc]) => { const r = new Result(doc); r.save = async () => { await r.validate(); return r; }; store.push(r); return [r]; };
  });

  test('a sheet opens from an approved form with each subject maximum marks and credits (defaults when a subject is not found); opening twice returns the same sheet', async () => {
    const r = await Result.openForApprovedForm(form._id);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toMatchObject({ maxInternal: 20, maxExternal: 30, credits: 4, countsForCgpa: true });
    expect(r.lines[1]).toMatchObject({ maxInternal: 40, maxExternal: 60, credits: 2, countsForCgpa: true });
    expect(r).toMatchObject({ enrollmentNumber: 'ENR-1', fullName: 'Aman', semester: 1 });
    expect(await Result.openForApprovedForm(form._id)).toBe(r);
  });
  test('only an approved form gets a sheet', async () => {
    form.status = 'submitted';
    await expect(Result.openForApprovedForm(form._id)).rejects.toMatchObject({ statusCode: 409 });
    ExamForm.findById = () => q(null);
    await expect(Result.openForApprovedForm(id())).rejects.toMatchObject({ statusCode: 404 });
  });
  test('entering marks fills the totals; absent works; unknown subject is refused', async () => {
    const r = await Result.openForApprovedForm(form._id);
    const [a, b] = r.lines.map((l) => l.subjectId);
    const admin = id();
    await r.enterMarks([{ subjectId: a, internalMarks: 15, externalMarks: 25 }], { byUserId: admin });
    expect(r.isComplete).toBe(false);
    await r.enterMarks([{ subjectId: b, absent: true }], { byUserId: admin });
    expect(r).toMatchObject({ isComplete: true, outcome: 'fail', failedSubjects: 1, creditsTotal: 6, creditsEarned: 4 });
    expect(r.lines[0]).toMatchObject({ grade: 'A+', gradePoint: 9 });
    expect(r.lines[1]).toMatchObject({ grade: 'AB', gradePoint: 0 });
    expect(r.sgpa).toBe(6); // (4 x 9 + 2 x 0) / 6
    expect(String(r.lastEditedByUserId)).toBe(String(admin));
    await expect(r.enterMarks([{ subjectId: id(), internalMarks: 1, externalMarks: 1 }])).rejects.toMatchObject({ statusCode: 400 });
  });
  test('changing marks can fix a mistake (absent -> marks)', async () => {
    const r = await Result.openForApprovedForm(form._id);
    const [a, b] = r.lines.map((l) => l.subjectId);
    await r.enterMarks([{ subjectId: a, internalMarks: 15, externalMarks: 25 }, { subjectId: b, absent: true }]);
    await r.enterMarks([{ subjectId: b, internalMarks: 30, externalMarks: 50 }]);
    expect(r).toMatchObject({ failedSubjects: 0, outcome: 'pass', sgpa: 9, finalGrade: 'A+' });
    expect(r.lines[1].absent).toBe(false);
  });
  test('a published result cannot be edited', async () => {
    const r = await Result.openForApprovedForm(form._id);
    r.isPublished = true;
    await expect(r.enterMarks([{ subjectId: r.lines[0].subjectId, internalMarks: 1, externalMarks: 1 }])).rejects.toMatchObject({ statusCode: 409 });
  });

  describe('publishing', () => {
    let doc;
    beforeEach(() => {
      doc = { _id: id(), isPublished: false, isComplete: true };
      Result.findOneAndUpdate = async (filter, update) => {
        if (filter.isPublished === false && doc.isPublished) return null;
        if (filter.isPublished === true && !doc.isPublished) return null;
        if (filter.isComplete && !doc.isComplete) return null;
        Object.assign(doc, update.$set);
        return { ...doc };
      };
      Result.findById = () => q(doc);
    });
    test('a finished result publishes; publishing again changes nothing', async () => {
      const by = id();
      const p = await Result.publish(doc._id, { byUserId: by });
      expect(p.isPublished).toBe(true);
      expect(String(p.publishedByUserId)).toBe(String(by));
      expect((await Result.publish(doc._id, { byUserId: by })).isPublished).toBe(true);
    });
    test('an incomplete result cannot be published; a missing one is 404', async () => {
      doc.isComplete = false;
      await expect(Result.publish(doc._id, {})).rejects.toMatchObject({ statusCode: 409 });
      Result.findById = () => q(null);
      await expect(Result.publish(id(), {})).rejects.toMatchObject({ statusCode: 404 });
    });
    test('unpublish needs a reason and a published result', async () => {
      await expect(Result.unpublish(doc._id, {})).rejects.toMatchObject({ statusCode: 400 });
      await expect(Result.unpublish(doc._id, { reason: 'Wrong marks' })).rejects.toMatchObject({ statusCode: 409 }); // not published yet
      await Result.publish(doc._id, {});
      const u = await Result.unpublish(doc._id, { reason: 'Wrong marks' });
      expect(u).toMatchObject({ isPublished: false, unpublishReason: 'Wrong marks' });
    });
    test('publishExam reports how many were published and how many are still incomplete', async () => {
      Result.updateMany = async () => ({ modifiedCount: 7 });
      Result.countDocuments = () => q(2);
      expect(await Result.publishExam(id(), { byUserId: id() })).toEqual({ published: 7, incomplete: 2 });
    });
    test('CGPA uses only published results and the latest line of a subject that was written again', async () => {
      const [x, y] = [id(), id()];
      const l = (subjectId, gradePoint) => ({ subjectId, credits: 4, gradePoint, countsForCgpa: true });
      let seen;
      Result.find = (f) => { seen = f; return { sort: async () => [{ lines: [l(x, 0), l(y, 8)] }, { lines: [l(x, 6)] }] }; };
      expect(await Result.cgpaFor('S1')).toEqual({ cgpa: 7, finalGrade: 'B+', credits: 8, subjects: 2 }); // (6 x 4 + 8 x 4) / 8
      expect(seen).toEqual({ studentId: 'S1', isPublished: true });
    });
    test('CGPA is empty before anything is published', async () => {
      Result.find = () => ({ sort: async () => [] });
      expect(await Result.cgpaFor('S1')).toEqual({ cgpa: null, finalGrade: null, credits: 0, subjects: 0 });
    });
    test('students see only published results', () => {
      let seen;
      Result.find = (f) => { seen = f; return { sort: () => 'ok' }; };
      Result.publishedFor('S1');
      expect(seen).toEqual({ studentId: 'S1', isPublished: true });
    });
  });
});
