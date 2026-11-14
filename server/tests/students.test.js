import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Subject from '../src/models/Subject.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';
import Application from '../src/models/Application.js';
import Counter from '../src/models/Counter.js';
import AcademicYear from '../src/models/AcademicYear.js';
import { parseLoginId, hashAadhaar } from '../src/utils/loginId.js';

const id = () => new mongoose.Types.ObjectId();
beforeAll(() => { process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing'; });

describe('parseLoginId', () => {
  test.each([
    ['Aman@Demo.example', { type: 'email', value: 'aman@demo.example' }],
    ['  a@b.co ', { type: 'email', value: 'a@b.co' }],
    ['9876543210', { type: 'mobile', value: '9876543210' }],
    ['98765 43210', { type: 'mobile', value: '9876543210' }],
    ['+91 98765-43210', { type: 'mobile', value: '9876543210' }],
    ['1234 5678 9012', { type: 'aadhaar', value: '123456789012' }],
    ['1234-5678-9012', { type: 'aadhaar', value: '123456789012' }],
  ])('reads %s', (input, expected) => { expect(parseLoginId(input)).toEqual(expected); });

  test.each([[''], ['   '], ['not an email'], ['12345'], ['12345678901'], ['abc@'], ['98765x43210'], [null], [undefined], [12345], ['+1 555']])(
    'returns null for %p', (input) => { expect(parseLoginId(input)).toBeNull(); }
  );
});

describe('hashAadhaar', () => {
  test('same number gives the same hash, however it is typed; it is not the number', () => {
    const a = hashAadhaar('123456789012');
    expect(hashAadhaar('1234 5678 9012')).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('123456789012');
  });
  test('different numbers differ; a different secret differs', () => {
    const a = hashAadhaar('123456789012');
    expect(hashAadhaar('123456789013')).not.toBe(a);
    process.env.LOGIN_ID_HASH_SECRET = 'another-long-test-secret-value';
    expect(hashAadhaar('123456789012')).not.toBe(a);
    process.env.LOGIN_ID_HASH_SECRET = 'a-long-test-secret-for-hashing';
  });
  test('refuses bad numbers and a missing secret', () => {
    expect(() => hashAadhaar('123')).toThrow(/12 digits/);
    const keep = process.env.LOGIN_ID_HASH_SECRET;
    delete process.env.LOGIN_ID_HASH_SECRET;
    expect(() => hashAadhaar('123456789012')).toThrow(/LOGIN_ID_HASH_SECRET/);
    process.env.LOGIN_ID_HASH_SECRET = keep;
  });
});

describe('User sign-in identifiers', () => {
  const user = (over = {}) => new User({ fullName: 'A', email: 'a@b.com', passwordHash: 'x', role: 'student', ...over });

  test('mobile must be 10 digits when given; it is optional', async () => {
    await expect(user().validate()).resolves.toBeUndefined();
    await expect(user({ mobile: '9876543210' }).validate()).resolves.toBeUndefined();
    await expect(user({ mobile: '12345' }).validate()).rejects.toThrow();
  });

  test('setAadhaar keeps only a hash and the last 4 digits, and the hash never leaves in JSON', () => {
    const u = user();
    u.setAadhaar('1234 5678 9012');
    expect(u.aadhaarLast4).toBe('9012');
    expect(u.aadhaarHash).toBe(hashAadhaar('123456789012'));
    expect(JSON.stringify(u.toJSON())).not.toContain(u.aadhaarHash);
    expect(User.schema.path('aadhaarHash').options.select).toBe(false);
  });

  test('findByLoginId searches the right field for each kind of input', () => {
    const seen = [];
    User.findOne = (filter) => { seen.push(filter); return { select: (s) => ({ filter, s }) }; };
    expect(User.findByLoginId('A@B.com')).toEqual({ filter: { email: 'a@b.com' }, s: '+passwordHash' });
    expect(User.findByLoginId('98765 43210').filter).toEqual({ mobile: '9876543210' });
    expect(User.findByLoginId('1234 5678 9012').filter).toEqual({ aadhaarHash: hashAadhaar('123456789012') });
    expect(User.findByLoginId('nonsense')).toBeNull();
    expect(seen).toHaveLength(3);
  });
});

describe('Subject, Student and Enrollment models', () => {
  test('subject: valid, uppercase code, bad semester and category are rejected', async () => {
    const s = new Subject({ code: 'fa-101', name: 'Financial Accounting', programId: id(), semester: 1, category: 'major' });
    await expect(s.validate()).resolves.toBeUndefined();
    expect(s.code).toBe('FA-101');
    await expect(new Subject({ ...s.toObject(), semester: 0 }).validate()).rejects.toThrow();
    await expect(new Subject({ ...s.toObject(), semester: 1.5 }).validate()).rejects.toThrow();
    await expect(new Subject({ ...s.toObject(), category: 'fun' }).validate()).rejects.toThrow();
  });
  test('student needs its links and number; starts active in semester 1', async () => {
    await expect(new Student({}).validate()).rejects.toThrow();
    const st = new Student({ userId: id(), applicationId: id(), programId: id(), admissionYearId: id(), enrollmentNumber: 'ENR-1' });
    await expect(st.validate()).resolves.toBeUndefined();
    expect(st).toMatchObject({ status: 'active', currentSemester: 1 });
  });
  test('enrollment starts as enrolled', async () => {
    const e = new Enrollment({ studentId: id(), subjectId: id(), semester: 1, academicYearId: id() });
    await expect(e.validate()).resolves.toBeUndefined();
    expect(e.status).toBe('enrolled');
  });
});

describe('Student.createFromApplication', () => {
  const programId = id();
  const subjects = [
    { _id: id(), code: 'FA-101', name: 'Financial Accounting', category: 'major' },
    { _id: id(), code: 'EN-AEC', name: 'English Communication', category: 'aec' },
    { _id: id(), code: 'ENV-VEC', name: 'Environmental Studies', category: 'vec' },
  ];
  let app; let user; let created; let enrolled; let counter;

  beforeEach(() => {
    counter = 0;
    user = new User({ fullName: 'Aman', email: 'aman@demo.example', passwordHash: 'x', role: 'applicant' });
    user.save = async () => user;
    app = new Application({
      applicantUserId: user._id, academicYearId: id(), programId, status: 'approved', aadhaarNumber: '123456789012',
      student: { mobile: '9876543210' },
      subjects: { mainGroup: 'Commerce', majorGroup: 'Accounts', minorGroup: 'Maths',
        nep: { major: ['financial accounting'], aec: ['EN-AEC'], vec: ['Yoga'] } },
    });
    created = null; enrolled = null;
    const q = (value) => ({ select: () => ({ session: async () => value }), session: async () => value });
    Application.findById = () => q(app);
    User.findById = () => q(user);
    AcademicYear.findById = () => q({ label: '2026-27' });
    Counter.next = async () => { counter += 1; return counter; };
    Student.findOne = () => q(null);
    Student.create = async ([doc]) => { created = { _id: id(), ...doc }; return [created]; };
    Subject.find = () => q(subjects);
    Enrollment.insertMany = async (rows) => { enrolled = rows; };
  });

  test('approved application becomes a student: role, sign-in details, number and matching subjects', async () => {
    const out = await Student.createFromApplication(app._id);
    expect(user.role).toBe('student');
    expect(user.mobile).toBe('9876543210');
    expect(user.aadhaarHash).toBe(hashAadhaar('123456789012'));
    expect(user.aadhaarLast4).toBe('9012');
    expect(created.enrollmentNumber).toBe('ENR-2026-27-000001');
    expect(created.groups).toMatchObject({ mainGroup: 'Commerce', majorGroup: 'Accounts', minorGroup: 'Maths' });
    expect(out.enrolled).toBe(2); // matched by name (any case) and by code
    expect(enrolled.map((r) => String(r.subjectId)).sort()).toEqual([String(subjects[0]._id), String(subjects[1]._id)].sort());
    expect(out.unmatched).toEqual([{ category: 'vec', name: 'Yoga' }]);
  });

  test.each(['draft', 'submitted', 'returned', 'rejected'])('a %s application is refused', async (status) => {
    app.status = status;
    await expect(Student.createFromApplication(app._id)).rejects.toMatchObject({ statusCode: 409 });
    expect(user.role).toBe('applicant');
  });

  test('missing application is 404; an application that already has a student is 409', async () => {
    Application.findById = () => ({ select: () => ({ session: async () => null }) });
    await expect(Student.createFromApplication(id())).rejects.toMatchObject({ statusCode: 404 });
  });
  test('second time for the same application is refused', async () => {
    Student.findOne = () => ({ session: async () => ({ _id: id() }) });
    await expect(Student.createFromApplication(app._id)).rejects.toMatchObject({ statusCode: 409 });
    expect(counter).toBe(0); // no number used up
  });
});
