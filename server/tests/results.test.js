import mongoose from 'mongoose';
import Result from '../src/models/Result.js';
import ExamForm from '../src/models/ExamForm.js';
import { evaluate } from '../src/utils/resultRules.js';

const id = () => new mongoose.Types.ObjectId();
const q = (value) => ({ session: async () => value });
// a subject worth 100 marks: 40 internal + 60 external
const line = (internalMarks, externalMarks, extra = {}) => ({ maxInternal: 40, maxExternal: 60, internalMarks, externalMarks, ...extra });

describe('evaluate (marking rules)', () => {
  test('a line is pending until marks are entered; no class until every line is done', () => {
    const r = evaluate([line(30, 50), line(undefined, undefined)]);
    expect(r.lines[1].status).toBe('pending');
    expect(r.isComplete).toBe(false);
    expect(r.resultClass).toBeNull();
    expect(r.percentage).toBeNull();
  });
  test('only one of the two marks entered is still pending', () => {
    expect(evaluate([line(30, undefined)]).lines[0].status).toBe('pending');
  });
  test('no lines is not complete', () => { expect(evaluate([]).isComplete).toBe(false); });

  test.each([
    [[line(40, 60), line(30, 50)], 'Distinction', 90],     // 190/200
    [[line(30, 45), line(30, 45)], 'Distinction', 75],     // exactly 75%
    [[line(30, 44), line(30, 44)], 'I Class', 74],         // 148/200
    [[line(24, 36), line(24, 36)], 'I Class', 60],         // exactly 60%
    [[line(20, 30), line(20, 31)], 'II Class', 50.5],
    [[line(16, 24), line(16, 24)], 'Pass Class', 40],      // exactly 40%: passes
  ])('all subjects passed: class by percentage %#', (lines, cls, pct) => {
    const r = evaluate(lines);
    expect(r.resultClass).toBe(cls);
    expect(r.percentage).toBe(pct);
    expect(r.failedSubjects).toBe(0);
  });

  test('39 out of 100 fails the subject', () => {
    const r = evaluate([line(15, 24)]);
    expect(r.lines[0].status).toBe('fail');
    expect(r.failedSubjects).toBe(1);
  });
  test('failing up to 2 subjects gives A.T.K.T., more gives Fail', () => {
    const pass = line(40, 60); const fail = line(5, 5);
    expect(evaluate([pass, pass, fail]).resultClass).toBe('A.T.K.T.');
    expect(evaluate([pass, fail, fail]).resultClass).toBe('A.T.K.T.');
    expect(evaluate([pass, fail, fail, fail]).resultClass).toBe('Fail');
  });
  test('absent fails the subject and counts as zero in the totals', () => {
    const r = evaluate([line(40, 60), line(undefined, undefined, { absent: true })]);
    expect(r.lines[1]).toMatchObject({ total: 0, max: 100, status: 'fail' });
    expect(r.totalObtained).toBe(100);
    expect(r.totalMax).toBe(200);
    expect(r.resultClass).toBe('A.T.K.T.');
    expect(r.percentage).toBe(50);
  });
  test('half marks work and percentage is rounded to 2 decimals', () => {
    const r = evaluate([line(20.5, 30), { maxInternal: 40, maxExternal: 60, internalMarks: 30, externalMarks: 40 }, line(33, 32)]);
    expect(r.totalObtained).toBe(185.5);
    expect(r.percentage).toBe(61.83);
  });
  test('a subject with no maximum marks cannot be passed', () => {
    expect(evaluate([{ maxInternal: 0, maxExternal: 0, internalMarks: 0, externalMarks: 0 }]).lines[0].status).toBe('fail');
  });
});

describe('Result model', () => {
  const subj = () => ({ subjectId: id(), code: 'S', name: 'Subject', category: 'major', maxInternal: 40, maxExternal: 60 });
  const sheet = (lines, over = {}) => new Result({ examId: id(), studentId: id(), examFormId: id(), lines, ...over });

  test('totals and class are worked out on validate', async () => {
    const a = subj(); const b = subj();
    const r = sheet([{ ...a, internalMarks: 35, externalMarks: 50 }, { ...b, internalMarks: 30, externalMarks: 40 }]);
    await r.validate();
    expect(r).toMatchObject({ totalObtained: 155, totalMax: 200, percentage: 77.5, resultClass: 'Distinction', isComplete: true, failedSubjects: 0 });
    expect(r.lines[0]).toMatchObject({ total: 85, max: 100, status: 'pass' });
  });
  test('an empty sheet is valid but incomplete', async () => {
    const r = sheet([subj()]);
    await r.validate();
    expect(r.isComplete).toBe(false);
    expect(r.resultClass).toBeUndefined();
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
    Result.findOne = () => q(store[0] || null);
    Result.create = async ([doc]) => { const r = new Result(doc); r.save = async () => { await r.validate(); return r; }; store.push(r); return [r]; };
  });

  test('a sheet opens from an approved form with default maximum marks; opening twice returns the same sheet', async () => {
    const r = await Result.openForApprovedForm(form._id);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toMatchObject({ maxInternal: 40, maxExternal: 60 });
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
    await r.enterMarks([{ subjectId: a, internalMarks: 30, externalMarks: 50 }], { byUserId: admin });
    expect(r.isComplete).toBe(false);
    await r.enterMarks([{ subjectId: b, absent: true }], { byUserId: admin });
    expect(r).toMatchObject({ isComplete: true, resultClass: 'A.T.K.T.', failedSubjects: 1 });
    expect(String(r.lastEditedByUserId)).toBe(String(admin));
    await expect(r.enterMarks([{ subjectId: id(), internalMarks: 1, externalMarks: 1 }])).rejects.toMatchObject({ statusCode: 400 });
  });
  test('changing marks can fix a mistake (absent -> marks)', async () => {
    const r = await Result.openForApprovedForm(form._id);
    const [a, b] = r.lines.map((l) => l.subjectId);
    await r.enterMarks([{ subjectId: a, internalMarks: 30, externalMarks: 50 }, { subjectId: b, absent: true }]);
    await r.enterMarks([{ subjectId: b, internalMarks: 30, externalMarks: 50 }]);
    expect(r).toMatchObject({ failedSubjects: 0, resultClass: 'Distinction' });
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
    test('students see only published results', () => {
      let seen;
      Result.find = (f) => { seen = f; return { sort: () => 'ok' }; };
      Result.publishedFor('S1');
      expect(seen).toEqual({ studentId: 'S1', isPublished: true });
    });
  });
});
