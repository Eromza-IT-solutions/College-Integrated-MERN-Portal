import mongoose from 'mongoose';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import Program from '../src/models/Program.js';
import Counter from '../src/models/Counter.js';
import AcademicYear from '../src/models/AcademicYear.js';

const id = () => new mongoose.Types.ObjectId();
const base = () => ({ applicantUserId: id(), academicYearId: id(), programId: id() });

function completeApplication(over = {}) {
  const addr = { line1: 'A', line2: 'B', country: 'INDIA', pincode: '411001', state: 'Maharashtra', district: 'Pune', taluka: 'Pune City', location: 'Pune' };
  return new Application({
    ...base(),
    admissionType: 'Provisional', divisionType: 'P.N.G.', feesCategory: 'PAYING', aadhaarNumber: '123412341234',
    student: {
      surname: 'Shaikh', firstName: 'Aman', middleName: 'R', nameCombination: 'Surname First Middle', fullName: 'Shaikh Aman R',
      gender: 'Male', address: addr, mobile: '9876543210', email: 'Aman@Demo.example', birthDate: new Date('2007-01-02'),
      birthPlace: 'Pune', birthPlaceCountry: 'INDIA', nationality: 'INDIAN', motherTongue: 'Marathi', maritalStatus: 'Single',
      bloodGroup: 'O+', religion: 'ISLAM', caste: 'X', casteCategory: 'OPEN',
    },
    parent: { fatherFullName: 'F', motherFirstName: 'M', address: addr, fatherMobile: '9876543211', isAlumni: false },
    lastExam: { lastClass: 'XII', instituteName: 'I', boardName: 'B', eligibility: 'Same Institute/College', stateOfResidence: 'Maharashtra',
      qualifiedExam: 'HSC', passingMonth: 'Mar', passingYear: '2026', obtainedMarks: 450, outOfMarks: 600, percentage: 75,
      result: 'Distinction', attempt: '1st', seatNo: 'S1', hasGap: false },
    subjects: { mainGroup: 'Science', majorGroup: 'Computer', minorGroup: 'Maths' },
    ...over,
  });
}

describe('Application', () => {
  test('a nearly empty draft is valid, status starts as draft, passport defaults to not applicable', async () => {
    const a = new Application(base());
    await expect(a.validate()).resolves.toBeUndefined();
    expect(a.status).toBe('draft');
    expect(a.passport.notApplicable).toBe(true);
  });

  test('the form model needs the applicant, year and class', async () => {
    await expect(new Application({}).validate()).rejects.toThrow(/applicantUserId/);
  });

  test.each([
    ['gender', { 'student.gender': 'Robot' }],
    ['fees category', { feesCategory: 'FREE' }],
    ['aadhaar length', { aadhaarNumber: '123' }],
    ['mobile', { 'student.mobile': '12345' }],
    ['pincode', { 'student.address.pincode': '41' }],
    ['email', { 'student.email': 'nope' }],
    ['percentage', { 'lastExam.percentage': 120 }],
  ])('rejects bad %s', async (_n, patch) => {
    const a = new Application(base());
    Object.entries(patch).forEach(([k, v]) => a.set(k, v));
    await expect(a.validate()).rejects.toThrow();
  });

  test('obtained marks above out-of marks is rejected', async () => {
    const a = new Application({ ...base(), lastExam: { obtainedMarks: 700, outOfMarks: 600 } });
    await expect(a.validate()).rejects.toThrow(/Obtained marks/);
  });

  test('passport expiry must be after issue date', async () => {
    const a = new Application({ ...base(), passport: { notApplicable: false, issueDate: new Date('2025-01-01'), expiryDate: new Date('2024-01-01') } });
    await expect(a.validate()).rejects.toThrow(/expiry/);
  });

  test('same address as student copies the address to the parent', async () => {
    const a = new Application({ ...base(), student: { address: { line1: 'Home', pincode: '411001' } }, parent: { sameAddressAsStudent: true } });
    await a.validate();
    expect(a.parent.address.line1).toBe('Home');
  });

  test('email is lowercased; Aadhaar is hidden from normal queries', () => {
    const a = completeApplication();
    expect(a.student.email).toBe('aman@demo.example');
    expect(Application.schema.path('aadhaarNumber').options.select).toBe(false);
  });

  test('a complete application has nothing missing', async () => {
    const a = completeApplication();
    await expect(a.validate()).resolves.toBeUndefined();
    expect(a.missingForSubmit()).toEqual([]);
  });

  test('missing fields are named; passport is required only when it applies', () => {
    const a = completeApplication({ student: undefined, subjects: undefined });
    const m = a.missingForSubmit();
    expect(m).toEqual(expect.arrayContaining(['student.surname', 'subjects.mainGroup']));
    const b = completeApplication({ passport: { notApplicable: false } });
    expect(b.missingForSubmit()).toEqual(expect.arrayContaining(['passport.number', 'passport.expiryDate']));
  });

  test('"no middle name" removes the middle-name requirement', () => {
    const a = completeApplication();
    a.student.middleName = '';
    expect(a.missingForSubmit()).toContain('student.middleName');
    a.student.noMiddleName = true;
    expect(a.missingForSubmit()).not.toContain('student.middleName');
  });

  test('submit: incomplete is refused with the list of fields', async () => {
    const a = new Application(base());
    await expect(a.submit()).rejects.toMatchObject({ statusCode: 400 });
  });

  test('submit: assigns a number once, sets status, and later edits are blocked', async () => {
    const a = completeApplication();
    AcademicYear.findById = () => ({ session: async () => ({ label: '2026-27' }) });
    let n = 0;
    Counter.next = async () => { n += 1; return 7; };
    a.save = async () => a;
    await a.submit();
    expect(a.applicationNumber).toBe('APP-2026-27-000007');
    expect(a.status).toBe('submitted');
    expect(a.submittedAt).toBeInstanceOf(Date);
    expect(() => a.assertEditable()).toThrow(/submitted/);
    // sent back, edited and submitted again: same number, no new counter value
    a.status = 'returned';
    await a.submit();
    expect(a.applicationNumber).toBe('APP-2026-27-000007');
    expect(n).toBe(1);
  });

  test('only draft and returned can be edited', () => {
    const a = new Application(base());
    ['draft', 'returned'].forEach((s) => { a.status = s; expect(a.isEditable()).toBe(true); });
    ['submitted', 'approved', 'rejected'].forEach((s) => { a.status = s; expect(a.isEditable()).toBe(false); });
  });
});

describe('AdmissionDocument', () => {
  const doc = (over = {}) => new AdmissionDocument({
    applicationId: id(), type: 'originalLc', fileName: 'lc.jpg', mimeType: 'image/jpeg', sizeBytes: 100000, storageKey: 'k/1', ...over,
  });

  test('a good document is valid and starts as pending', async () => {
    const d = doc();
    await expect(d.validate()).resolves.toBeUndefined();
    expect(d.status).toBe('pending');
  });

  test.each([
    ['too big', { sizeBytes: 600 * 1024 }],
    ['pdf', { mimeType: 'application/pdf' }],
    ['unknown type', { type: 'passportCopy' }],
    ['photo size', { type: 'photo', width: 100, height: 100 }],
    ['signature size', { type: 'signature', width: 80, height: 100 }],
  ])('rejects %s', async (_n, over) => {
    await expect(doc(over).validate()).rejects.toThrow();
  });

  test('photo 80x100 and signature 80x50 are accepted', async () => {
    await expect(doc({ type: 'photo', width: 80, height: 100 }).validate()).resolves.toBeUndefined();
    await expect(doc({ type: 'signature', width: 80, height: 50 }).validate()).resolves.toBeUndefined();
  });

  test('rejecting a document needs a reason', async () => {
    await expect(doc({ status: 'rejected' }).validate()).rejects.toThrow(/reason|why/i);
    await expect(doc({ status: 'rejected', reviewNote: 'Blurry' }).validate()).resolves.toBeUndefined();
  });

  test('missingRequired lists the required documents not uploaded yet', async () => {
    AdmissionDocument.find = () => ({ distinct: async () => ['originalLc', 'photo'] });
    expect(await AdmissionDocument.missingRequired(id())).toEqual(['marksheet10', 'marksheet12']);
  });
});

describe('Program', () => {
  test('needs name, code and department; code is upper-cased', async () => {
    await expect(new Program({}).validate()).rejects.toThrow();
    const p = new Program({ name: 'F.Y.B.Sc.(Computer Application)', code: 'fybsc-ca', departmentId: id() });
    await expect(p.validate()).resolves.toBeUndefined();
    expect(p.code).toBe('FYBSC-CA');
  });
});
