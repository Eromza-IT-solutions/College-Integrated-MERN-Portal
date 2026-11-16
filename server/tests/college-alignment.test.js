import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Program from '../src/models/Program.js';
import Payment from '../src/models/Payment.js';
import Subject from '../src/models/Subject.js';
import { requiredDocuments } from '../src/utils/documentRules.js';
import { firstSemesterOf, yearOfSemester } from '../src/utils/academic.js';
import { checkData, buildRows, toPaise } from '../src/utils/feeSheets.js';
const feeData = JSON.parse(readFileSync(new URL('../scripts/data/college-fees-2026-27.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('../scripts/data/college-programs.json', import.meta.url), 'utf8'));
import * as C from '../src/utils/constants.js';

const id = () => new mongoose.Types.ObjectId();
const q = (value) => ({ session: async () => value, select: () => ({ session: async () => value }) });
const DAY = 24 * 60 * 60 * 1000;
const types = (list) => list.map((d) => d.type);

// ---------------------------------------------------------------------------------------------
describe('college data files', () => {
  test('every class total printed on the fee sheets equals the sum of its lines', () => {
    expect(checkData()).toEqual([]);
  });
  test('the checker really catches a wrong number', () => {
    const bad = JSON.parse(JSON.stringify(feeData));
    bad.groups[0].classes[0].heads.tuitionFee += 100;
    expect(checkData(bad)).toHaveLength(1);
    expect(checkData(bad)[0]).toMatch(/F\.Y\. B\.A\./);
  });
  test('the checker catches an unknown fee line', () => {
    const bad = JSON.parse(JSON.stringify(feeData));
    bad.groups[0].classes[0].heads.mystery = 0;
    expect(checkData(bad).some((p) => /unknown fee line "mystery"/.test(p))).toBe(true);
  });
  test('spot checks against the printed sheets', () => {
    const find = (g, label) => feeData.groups.find((x) => x.code === g).classes.find((c) => c.label === label);
    expect(find('UG-PNG-BA', 'F.Y. B.A.').printedTotal).toBe(13080);
    expect(find('UG-PNG-BSC', 'T.Y. B.Sc.').printedTotal).toBe(22880);
    expect(find('UG-GRANT-BA', 'F.Y. B.A.').printedTotal).toBe(6450);
    expect(find('UG-PNG-PROF-CS', 'T.Y. B.Sc. (Computer Science)').printedTotal).toBe(36305);
    expect(find('PG-MSC-CS', 'M.Sc. Computer Science I').printedTotal).toBe(56015);
    expect(find('PHD-CHEM', 'Ph.D. Chemistry II-V').printedTotal).toBe(26940);
    expect(find('PHD-CHEM', 'Ph.D. Chemistry II-V').years).toEqual([2, 3, 4, 5]);
  });
  test('the sheet has 66 classes in 28 groups', () => {
    expect(feeData.groups).toHaveLength(28);
    expect(feeData.groups.reduce((n, g) => n + g.classes.length, 0)).toBe(66);
  });
  test('grantable fees are for the Grantable division, everything else is P.N.G.', () => {
    for (const g of feeData.groups) expect(g.divisionType).toBe(g.code.startsWith('UG-GRANT') ? 'Grantable' : 'P.N.G.');
  });

  test('the program catalog has the 59 programs of the college summary table', () => {
    const by = (level) => catalog.programs.filter((p) => p.level === level).length;
    expect(catalog.programs).toHaveLength(59);
    expect([by('Undergraduate'), by('Post Graduate'), by('UG Diploma'), by('PG Diploma'), by('Certificate Course'), by('Ph.D.'), by('Post-Doctoral')]).toEqual([22, 13, 3, 6, 7, 7, 1]);
    expect(new Set(catalog.programs.map((p) => p.code)).size).toBe(59);
    expect(new Set(catalog.programs.map((p) => p.name)).size).toBe(59);
  });
  test('every program has a known faculty, level and department code', () => {
    for (const p of catalog.programs) {
      expect(C.PROGRAM_FACULTIES).toContain(p.faculty);
      expect(C.PROGRAM_LEVELS).toContain(p.level);
      expect(['ART', 'SCI', 'COM', 'CSC']).toContain(p.departmentCode);
    }
  });
  test('every program code used by the fee sheets exists, and no program has two fee groups in one division', () => {
    const codes = new Set(catalog.programs.map((p) => p.code));
    const seen = new Set();
    for (const g of feeData.groups) {
      for (const code of g.programCodes) {
        expect(codes.has(code)).toBe(true);
        const key = `${g.divisionType}:${code}:${g.classes[0].years[0]}`;
        // Professional B.Sc. (Computer Science) and general B.Sc. are different programs, so no program repeats within a division
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
  test('programs and fee years fit together: a fee year never exceeds the program duration', () => {
    const programs = Object.fromEntries(catalog.programs.map((p) => [p.code, p]));
    for (const g of feeData.groups) {
      for (const code of g.programCodes) {
        for (const c of g.classes) for (const y of c.years) expect(y).toBeLessThanOrEqual(C.PROGRAM_YEARS[programs[code].level]);
      }
    }
  });
  test('buildRows makes one admission row per program, year and class, in paise, with lines that add up', () => {
    const ids = Object.fromEntries(catalog.programs.map((p) => [p.code, id()]));
    const year = id();
    const { rows, skipped } = buildRows(ids, year);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(134);
    const ba = rows.filter((r) => r.programId === ids.BDPAEN && r.divisionType === 'P.N.G.');
    expect(ba.map((r) => [r.yearOfStudy, r.amountPaise])).toEqual([[1, 1308000], [2, 1148000], [3, 1148000]]);
    for (const r of rows) {
      expect(r.heads.reduce((n, h) => n + h.amountPaise, 0)).toBe(r.amountPaise);
      expect(r.purpose).toBe('admission');
      expect(r.feesCategory).toBe('PAYING');
    }
    const phd = rows.filter((r) => r.programId === ids.DDPSCH);
    expect(phd.map((r) => r.yearOfStudy)).toEqual([1, 2, 3, 4, 5]);
  });
  test('a program that is not in the database is reported, not silently dropped', () => {
    const { rows, skipped } = buildRows({ BDPAEN: id() }, id());
    expect(rows.length).toBeGreaterThan(0);
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped[0]).toMatch(/not found/);
  });
  test('toPaise', () => { expect(toPaise(13080)).toBe(1308000); });
});

// ---------------------------------------------------------------------------------------------
describe('academic year helpers', () => {
  test.each([[1, 1], [2, 3], [3, 5]])('year %i starts at semester %i', (y, s) => { expect(firstSemesterOf(y)).toBe(s); });
  test.each([[1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3]])('semester %i is in year %i', (s, y) => { expect(yearOfSemester(s)).toBe(y); });
});

// ---------------------------------------------------------------------------------------------
describe('Program', () => {
  const make = (over = {}) => new Program({ name: 'B.A. English', code: 'bdpaen', departmentId: id(), faculty: 'Arts and Humanities', level: 'Undergraduate', ...over });

  test('the duration starts from the level', async () => {
    const cases = [['Undergraduate', 3], ['Post Graduate', 2], ['Ph.D.', 5], ['Post-Doctoral', 1], ['UG Diploma', 1], ['PG Diploma', 1], ['Certificate Course', 1]];
    for (const [level, years] of cases) {
      const p = make({ level });
      await p.validate();
      expect(p.durationYears).toBe(years);
    }
  });
  test('an explicit duration is kept, and must be a whole number', async () => {
    const p = make({ level: 'Undergraduate', durationYears: 4 });
    await p.validate();
    expect(p.durationYears).toBe(4);
    await expect(make({ durationYears: 2.5 }).validate()).rejects.toThrow();
    await expect(make({ durationYears: 0 }).validate()).rejects.toThrow();
  });
  test('an unknown level or faculty is rejected', async () => {
    await expect(make({ level: 'Masters' }).validate()).rejects.toThrow();
    await expect(make({ faculty: 'Sports' }).validate()).rejects.toThrow();
  });
  test('year labels follow the college names', () => {
    expect([1, 2, 3].map((y) => make({ level: 'Undergraduate' }).yearLabel(y))).toEqual(['F.Y.', 'S.Y.', 'T.Y.']);
    expect([1, 2].map((y) => make({ level: 'Post Graduate' }).yearLabel(y))).toEqual(['I', 'II']);
    expect(make({ level: 'Ph.D.' }).yearLabel(5)).toBe('V');
    expect(make({ level: 'Certificate Course' }).yearLabel(1)).toBe('1');
  });
  test('hasYear respects the duration', async () => {
    const p = make({ level: 'Post Graduate' });
    await p.validate();
    expect([p.hasYear(1), p.hasYear(2), p.hasYear(3), p.hasYear(0), p.hasYear(1.5)]).toEqual([true, true, false, false, false]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('FeeStructure with fee lines', () => {
  const line = (key, amountPaise) => ({ key, label: key, amountPaise });
  const make = (over = {}) => new FeeStructure({
    purpose: 'admission', academicYearId: id(), programId: id(), feesCategory: 'PAYING',
    heads: [line('tuitionFee', 800000), line('gymkhana', 25000)], ...over,
  });

  test('the total is worked out from the lines', async () => {
    const f = make();
    await f.validate();
    expect(f.amountPaise).toBe(825000);
    expect(f.yearOfStudy).toBe(1);
    expect(f.divisionType).toBe('P.N.G.');
  });
  test('a total that does not match the lines is rejected', async () => {
    await expect(make({ amountPaise: 825001 }).validate()).rejects.toThrow(/not the sum/);
  });
  test('a matching total is fine', async () => { await expect(make({ amountPaise: 825000 }).validate()).resolves.toBeUndefined(); });
  test('the same fee line twice is rejected', async () => {
    await expect(make({ heads: [line('a', 100), line('a', 200)] }).validate()).rejects.toThrow(/twice/);
  });
  test.each([[-1], [10.5]])('a fee line of %s paise is rejected', async (n) => {
    await expect(make({ heads: [line('a', n)] }).validate()).rejects.toThrow();
  });
  test('without lines an amount is still required (exam fees are one amount)', async () => {
    await expect(make({ heads: [] }).validate()).rejects.toThrow(/Amount is required/);
    await expect(make({ heads: [], amountPaise: 80000 }).validate()).resolves.toBeUndefined();
  });
  test('a free class (zero) is allowed', async () => { await expect(make({ heads: [], amountPaise: 0 }).validate()).resolves.toBeUndefined(); });
  test('the division must be a known one; Grantable is allowed', async () => {
    await expect(make({ divisionType: 'Grantable' }).validate()).resolves.toBeUndefined();
    await expect(make({ divisionType: 'Evening' }).validate()).rejects.toThrow();
  });
  test('year of study must be a whole number from 1', async () => {
    await expect(make({ yearOfStudy: 0 }).validate()).rejects.toThrow();
    await expect(make({ yearOfStudy: 1.5 }).validate()).rejects.toThrow();
    await expect(make({ yearOfStudy: 3 }).validate()).resolves.toBeUndefined();
  });
  test('the unique index covers year of study and division', () => {
    const idx = FeeStructure.schema.indexes().find(([, o]) => o.unique);
    expect(Object.keys(idx[0])).toEqual(['purpose', 'academicYearId', 'programId', 'yearOfStudy', 'divisionType', 'feesCategory']);
  });
  test('findFor asks for the exact class, division and category, with sensible defaults', async () => {
    let seen;
    FeeStructure.findOne = (f) => { seen = f; return q({ _id: 'fee' }); };
    const [y, p] = [id(), id()];
    expect(await FeeStructure.findFor({ purpose: 'admission', academicYearId: y, programId: p, feesCategory: 'PAYING' })).toEqual({ _id: 'fee' });
    expect(seen).toEqual({ purpose: 'admission', academicYearId: y, programId: p, yearOfStudy: 1, divisionType: 'P.N.G.', feesCategory: 'PAYING', isActive: true });
    await FeeStructure.findFor({ purpose: 'admission', academicYearId: y, programId: p, yearOfStudy: 2, divisionType: 'Grantable', feesCategory: 'PAYING' });
    expect(seen).toMatchObject({ yearOfStudy: 2, divisionType: 'Grantable' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('required documents by category', () => {
  const base = ['photo', 'marksheet10', 'marksheet12', 'originalLc', 'eligibilityForm', 'antiRagingForm', 'undertakingForm', 'aadhaar'];

  test('open category: the everyday set only', () => {
    expect(types(requiredDocuments({ casteCategory: 'OPEN', feesCategory: 'PAYING', hasGap: false }))).toEqual(base);
  });
  test('nothing known yet still gives the everyday set', () => { expect(types(requiredDocuments())).toEqual(base); });
  test('a gap adds the gap certificate', () => {
    expect(types(requiredDocuments({ casteCategory: 'OPEN', feesCategory: 'PAYING', hasGap: true }))).toEqual([...base, 'gapCertificate']);
  });
  test.each(C.RESERVED_CASTE_CATEGORIES)('reserved category %s needs caste, validity, scholarship, income, bank and domicile', (cat) => {
    expect(types(requiredDocuments({ casteCategory: cat, feesCategory: 'PAYING' }))).toEqual([
      ...base, 'scholarshipForm', 'casteCertificate', 'casteValidityCertificate', 'incomeCertificate', 'bankPassbook', 'domicileCertificate',
    ]);
  });
  test('EWS needs the concession set', () => {
    expect(types(requiredDocuments({ casteCategory: 'EWS', feesCategory: 'PAYING' }))).toEqual([...base, 'concessionForm', 'incomeCertificate', 'bankPassbook', 'domicileCertificate']);
  });
  test('other state adds the migration certificate', () => {
    expect(types(requiredDocuments({ casteCategory: 'OPEN', feesCategory: 'OTHER STATE' }))).toEqual([...base, 'migrationCertificate']);
  });
  test.each(['N.R.I.', 'SAARC', 'FOREIGNER'])('%s needs the foreign student set and no Aadhaar', (cat) => {
    const list = types(requiredDocuments({ casteCategory: 'OPEN', feesCategory: cat }));
    expect(list).not.toContain('aadhaar');
    expect(list).toEqual(expect.arrayContaining(['universityAdmissionLetter', 'passportVisa', 'residentialProof', 'policeRegistration', 'cForm', 'photo', 'marksheet12']));
  });
  test('a document is never listed twice (income certificate for a reserved student on a gap)', () => {
    const list = types(requiredDocuments({ casteCategory: 'OBC', feesCategory: 'OTHER STATE', hasGap: true }));
    expect(new Set(list).size).toBe(list.length);
  });
  test('each entry says why it is needed', () => {
    for (const d of requiredDocuments({ casteCategory: 'SC', feesCategory: 'PAYING', hasGap: true })) expect(d.why).toBeTruthy();
  });
  test('every document type the rules can ask for is a known type', () => {
    const all = [
      ...requiredDocuments({ casteCategory: 'SC', feesCategory: 'OTHER STATE', hasGap: true }),
      ...requiredDocuments({ casteCategory: 'EWS', feesCategory: 'N.R.I.' }),
    ];
    for (const d of all) expect(C.DOCUMENT_TYPES_VALUES).toContain(d.type);
  });

  describe('AdmissionDocument lookups', () => {
    const appDoc = (over = {}) => ({ feesCategory: 'PAYING', student: { casteCategory: 'SC' }, lastExam: { hasGap: false }, ...over });
    test('requiredFor reads the category from the application', async () => {
      Application.findById = () => q(appDoc());
      expect(types(await AdmissionDocument.requiredFor(id()))).toContain('casteCertificate');
    });
    test('requiredFor of a missing application is empty', async () => {
      Application.findById = () => q(null);
      expect(await AdmissionDocument.requiredFor(id())).toEqual([]);
    });
    test('missingRequired for a reserved student lists the extra documents too', async () => {
      Application.findById = () => q(appDoc());
      AdmissionDocument.find = () => ({ session: () => ({ distinct: async () => base }) });
      expect(await AdmissionDocument.missingRequired(id())).toEqual(['scholarshipForm', 'casteCertificate', 'casteValidityCertificate', 'incomeCertificate', 'bankPassbook', 'domicileCertificate']);
    });
    test('notVerified lists uploaded required documents that are pending or rejected', async () => {
      Application.findById = () => q(appDoc({ student: { casteCategory: 'OPEN' } }));
      AdmissionDocument.find = () => q([{ type: 'photo', status: 'verified' }, { type: 'aadhaar', status: 'pending' }, { type: 'marksheet10', status: 'rejected' }]);
      expect(await AdmissionDocument.notVerified(id())).toEqual(['aadhaar', 'marksheet10']);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('Application: Grantable division is for girls only', () => {
  const app = (gender, divisionType) => new Application({ applicantUserId: id(), academicYearId: id(), programId: id(), divisionType, student: { gender } });
  test('a girl can take Grantable', async () => { await expect(app('Female', 'Grantable').validate()).resolves.toBeUndefined(); });
  test('a boy cannot', async () => { await expect(app('Male', 'Grantable').validate()).rejects.toThrow(/girls only/); });
  test('a draft with no gender yet is fine', async () => { await expect(app(undefined, 'Grantable').validate()).resolves.toBeUndefined(); });
  test('P.N.G. is open to everyone', async () => { await expect(app('Male', 'P.N.G.').validate()).resolves.toBeUndefined(); });
});

// ---------------------------------------------------------------------------------------------
describe('Application: subjects come from the Subject list', () => {
  const programId = id();
  const sub = (category, over = {}) => ({ _id: id(), code: `${category}-1`, name: category, category, programId, semester: 1, isActive: true, ...over });
  let major; let aec; let app; let saved;
  beforeEach(() => {
    major = sub('major'); aec = sub('aec');
    app = new Application({ applicantUserId: id(), academicYearId: id(), programId, status: 'draft' });
    saved = null;
    app.save = async () => { saved = app; return app; };
    Subject.find = (f) => {
      const all = [major, aec];
      const ids = f._id.$in.map(String);
      return q(all.filter((x) => ids.includes(String(x._id))));
    };
  });

  test('valid picks are saved as ids under their groups; other groups are emptied', async () => {
    await app.chooseSubjects({ major: [major._id], aec: [aec._id] });
    expect(saved).toBe(app);
    expect(app.subjects.nep.major.map(String)).toEqual([String(major._id)]);
    expect(app.subjects.nep.aec.map(String)).toEqual([String(aec._id)]);
    expect(app.subjects.nep.minor).toHaveLength(0);
  });
  test('picking again replaces the earlier picks', async () => {
    await app.chooseSubjects({ major: [major._id] });
    await app.chooseSubjects({ aec: [aec._id] });
    expect(app.subjects.nep.major).toHaveLength(0);
    expect(app.subjects.nep.aec).toHaveLength(1);
  });
  test('an empty pick clears everything', async () => {
    await app.chooseSubjects({ major: [major._id] });
    await app.chooseSubjects({});
    expect(app.subjects.nep.major).toHaveLength(0);
  });
  test('a subject filed under the wrong group is refused with its field', async () => {
    await expect(app.chooseSubjects({ minor: [major._id] })).rejects.toMatchObject({ statusCode: 400, errors: [{ field: 'subjects.nep.minor' }] });
  });
  test('a subject of another program is refused', async () => {
    major.programId = id();
    await expect(app.chooseSubjects({ major: [major._id] })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('a subject of another semester is refused', async () => {
    major.semester = 2;
    await expect(app.chooseSubjects({ major: [major._id] })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('a second-year application takes semester 3 subjects', async () => {
    app.yearOfStudy = 2;
    await expect(app.chooseSubjects({ major: [major._id] })).rejects.toMatchObject({ statusCode: 400 }); // major is semester 1
    major.semester = 3;
    await app.chooseSubjects({ major: [major._id] });
    expect(app.subjects.nep.major).toHaveLength(1);
  });
  test('an inactive subject is refused', async () => {
    major.isActive = false;
    await expect(app.chooseSubjects({ major: [major._id] })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('a subject that does not exist is refused', async () => {
    await expect(app.chooseSubjects({ major: [id()] })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('the same subject twice is refused', async () => {
    await expect(app.chooseSubjects({ major: [major._id, major._id] })).rejects.toMatchObject({ statusCode: 400 });
  });
  test('an unknown group is refused', async () => {
    await expect(app.chooseSubjects({ hobbies: [major._id] })).rejects.toMatchObject({ statusCode: 400 });
  });
  test.each(['submitted', 'waitlisted', 'approved', 'feePaid', 'admitted', 'rejected', 'cancelled'])('a %s application cannot change its subjects', async (status) => {
    app.status = status;
    await expect(app.chooseSubjects({ major: [major._id] })).rejects.toMatchObject({ statusCode: 409 });
  });
  test('a returned application can', async () => {
    app.status = 'returned';
    await app.chooseSubjects({ major: [major._id] });
    expect(saved).toBe(app);
  });

  test('offeredSubjects lists the first semester of the year, grouped by category', async () => {
    let seen;
    const list = [sub('major', { code: 'A' }), sub('major', { code: 'B' }), sub('aec', { code: 'C' })];
    Subject.find = (f) => { seen = f; return { sort: async () => list }; };
    const out = await Application.offeredSubjects(programId, 2);
    expect(seen).toEqual({ programId, semester: 3, isActive: true });
    expect(Object.keys(out).sort()).toEqual(['aec', 'major']);
    expect(out.major.map((x) => x.code)).toEqual(['A', 'B']);
  });
  test('offeredSubjects defaults to the first year', async () => {
    let seen;
    Subject.find = (f) => { seen = f; return { sort: async () => [] }; };
    expect(await Application.offeredSubjects(programId)).toEqual({});
    expect(seen.semester).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Application: admission workflow', () => {
  const NOW = new Date('2026-07-01T10:00:00Z');
  const admin = id();
  let app; let calls; let result; let current;

  const make = (over = {}) => new Application({
    applicantUserId: id(), academicYearId: id(), programId: id(), yearOfStudy: 1, status: 'submitted',
    divisionType: 'P.N.G.', feesCategory: 'PAYING', student: { gender: 'Female' },
    subjectsApprovedAt: NOW, documentsApprovedAt: NOW, ...over,
  });

  beforeEach(() => {
    app = make();
    calls = [];
    current = { status: 'submitted' };
    result = { updated: true };
    Application.findOneAndUpdate = async (filter, update, opts) => {
      calls.push({ filter, update, opts });
      return result.updated ? { ...result.doc, _id: app._id, status: update.$set.status || 'submitted' } : null;
    };
    Application.findById = () => q(current);
  });

  describe('every step is one guarded update', () => {
    test('a lost race gives 409 with the status it found', async () => {
      result.updated = false;
      current = { status: 'approved' };
      await expect(app.approveSubjects({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('approved') });
    });
    test('an application that vanished gives 404', async () => {
      result.updated = false;
      current = null;
      await expect(app.approveSubjects({ byUserId: admin })).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('step 1: subjects', () => {
    test('allowed from submitted or waitlisted, and records who and when', async () => {
      await app.approveSubjects({ byUserId: admin });
      expect(calls[0].filter).toEqual({ _id: app._id, status: { $in: ['submitted', 'waitlisted'] } });
      expect(calls[0].update.$set).toMatchObject({ subjectsApprovedByUserId: admin });
      expect(calls[0].update.$set.subjectsApprovedAt).toBeInstanceOf(Date);
      expect(calls[0].opts.new).toBe(true);
    });
  });

  describe('step 2: documents', () => {
    test('refused while a required document is not uploaded', async () => {
      AdmissionDocument.missingRequired = async () => ['photo', 'aadhaar'];
      await expect(app.approveDocuments({ byUserId: admin })).rejects.toMatchObject({
        statusCode: 409, errors: [{ field: 'photo', message: 'Not uploaded' }, { field: 'aadhaar', message: 'Not uploaded' }],
      });
      expect(calls).toHaveLength(0);
    });
    test('refused while a required document is not verified', async () => {
      AdmissionDocument.missingRequired = async () => [];
      AdmissionDocument.notVerified = async () => ['marksheet12'];
      await expect(app.approveDocuments({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409, errors: [{ field: 'marksheet12', message: 'Not verified' }] });
      expect(calls).toHaveLength(0);
    });
    test('approved when everything is uploaded and verified', async () => {
      AdmissionDocument.missingRequired = async () => [];
      AdmissionDocument.notVerified = async () => [];
      await app.approveDocuments({ byUserId: admin });
      expect(calls[0].update.$set).toMatchObject({ documentsApprovedByUserId: admin });
    });
  });

  describe('step 3: form approval fixes the fee and starts the 3-day payment window', () => {
    const fee = (amountPaise) => ({ _id: id(), amountPaise });
    let feeFilter;
    beforeEach(() => {
      feeFilter = null;
      FeeStructure.findFor = async (f) => { feeFilter = f; return fee(1308000); };
    });

    test('needs both earlier approvals', async () => {
      app = make({ documentsApprovedAt: undefined });
      await expect(app.approveForm({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('subjects and the documents') });
      app = make({ subjectsApprovedAt: undefined });
      await expect(app.approveForm({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409 });
      expect(calls).toHaveLength(0);
    });
    test('looks up the fee for this exact class, division and category', async () => {
      app = make({ yearOfStudy: 2, feesCategory: 'OTHER STATE' });
      await app.approveForm({ byUserId: admin, now: NOW });
      expect(feeFilter).toEqual({
        purpose: 'admission', academicYearId: app.academicYearId, programId: app.programId, yearOfStudy: 2, divisionType: 'P.N.G.', feesCategory: 'OTHER STATE',
      });
    });
    test('no fee set is 409 and nothing changes', async () => {
      FeeStructure.findFor = async () => null;
      await expect(app.approveForm({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('No admission fee') });
      expect(calls).toHaveLength(0);
    });
    test('fixes the fee amount and sets the due date 3 days ahead', async () => {
      await app.approveForm({ byUserId: admin, now: NOW });
      const set = calls[0].update.$set;
      expect(set).toMatchObject({ status: 'approved', feeAmountPaise: 1308000, reviewedByUserId: admin, approvedAt: NOW });
      expect(set.feeDueAt).toEqual(new Date(NOW.getTime() + 3 * DAY));
      expect(set.feeStructureId).toBeDefined();
      expect(calls[0].update.$unset).toEqual({ reviewNote: '' });
    });
    test('the update itself re-checks that both approvals are still there', async () => {
      await app.approveForm({ byUserId: admin, now: NOW });
      expect(calls[0].filter).toEqual({
        _id: app._id, status: { $in: ['submitted', 'waitlisted'] }, subjectsApprovedAt: { $ne: null }, documentsApprovedAt: { $ne: null },
      });
    });
    test('a waitlisted application can be approved later', async () => {
      app = make({ status: 'waitlisted' });
      await app.approveForm({ byUserId: admin, now: NOW });
      expect(calls[0].filter.status.$in).toContain('waitlisted');
    });
    test('a free class skips payment and starts the hard copy window', async () => {
      FeeStructure.findFor = async () => fee(0);
      await app.approveForm({ byUserId: admin, now: NOW });
      const set = calls[0].update.$set;
      expect(set.status).toBe('feePaid');
      expect(set.feeDueAt).toBeUndefined();
      expect(set.hardCopyDueAt).toEqual(new Date(NOW.getTime() + 3 * DAY));
    });
    test('a boy cannot be approved into the Grantable division', async () => {
      app = make({ divisionType: 'Grantable', student: { gender: 'Male' } });
      await expect(app.approveForm({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('girls only') });
    });
    test('a girl can', async () => {
      app = make({ divisionType: 'Grantable' });
      await app.approveForm({ byUserId: admin, now: NOW });
      expect(feeFilter.divisionType).toBe('Grantable');
    });
  });

  describe('waitlist, return and reject', () => {
    test('waitlist only from submitted', async () => {
      await app.waitlist({ byUserId: admin, note: 'seats full' });
      expect(calls[0].filter.status).toEqual({ $in: ['submitted'] });
      expect(calls[0].update.$set).toMatchObject({ status: 'waitlisted', reviewNote: 'seats full' });
      expect(calls[0].update.$set.waitlistedAt).toBeInstanceOf(Date);
    });
    test('returning needs a reason and clears the earlier approvals', async () => {
      await expect(app.returnForCorrection({ byUserId: admin })).rejects.toMatchObject({ statusCode: 400 });
      await expect(app.returnForCorrection({ byUserId: admin, note: '   ' })).rejects.toMatchObject({ statusCode: 400 });
      expect(calls).toHaveLength(0);
      await app.returnForCorrection({ byUserId: admin, note: 'Marksheet is blurred' });
      expect(calls[0].update.$set).toMatchObject({ status: 'returned', reviewNote: 'Marksheet is blurred' });
      expect(Object.keys(calls[0].update.$unset).sort()).toEqual(['documentsApprovedAt', 'documentsApprovedByUserId', 'subjectsApprovedAt', 'subjectsApprovedByUserId']);
    });
    test('rejecting needs a reason', async () => {
      await expect(app.reject({ byUserId: admin })).rejects.toMatchObject({ statusCode: 400 });
      await app.reject({ byUserId: admin, note: 'Not eligible' });
      expect(calls[0].update.$set).toMatchObject({ status: 'rejected', reviewNote: 'Not eligible' });
      expect(calls[0].filter.status.$in).toEqual(['submitted', 'waitlisted']);
    });
  });

  describe('payment of the admission fee', () => {
    let approved; let pay;
    beforeEach(() => {
      approved = make({ status: 'approved', feeAmountPaise: 1308000 });
      pay = { _id: id(), purpose: 'admission', applicationId: approved._id, status: 'paid', amountPaise: 1308000, paidAt: NOW };
      Payment.findById = () => q(pay);
    });
    test('records the payment and starts the 3-day hard copy window from the payment time', async () => {
      await approved.markFeePaid({ paymentId: pay._id });
      expect(calls[0].filter).toEqual({ _id: approved._id, status: { $in: ['approved'] } });
      const set = calls[0].update.$set;
      expect(set).toMatchObject({ status: 'feePaid', paymentId: pay._id, feePaidAt: NOW });
      expect(set.hardCopyDueAt).toEqual(new Date(NOW.getTime() + 3 * DAY));
    });
    test('calling it twice changes nothing', async () => {
      for (const status of ['feePaid', 'admitted']) {
        approved.status = status;
        expect(await approved.markFeePaid({ paymentId: pay._id })).toBe(approved);
      }
      expect(calls).toHaveLength(0);
    });
    test.each([
      ['a payment that does not exist', () => { Payment.findById = () => q(null); }, 404],
      ['an exam payment', () => { pay.purpose = 'exam'; }, 409],
      ['a payment of another application', () => { pay.applicationId = id(); }, 409],
      ['a payment that is not paid', () => { pay.status = 'created'; }, 409],
      ['a payment of the wrong amount', () => { pay.amountPaise = 1000; }, 409],
    ])('refuses %s', async (_n, arrange, code) => {
      arrange();
      await expect(approved.markFeePaid({ paymentId: pay._id })).rejects.toMatchObject({ statusCode: code });
      expect(calls).toHaveLength(0);
    });
    test('a payment from before the application was approved cannot move a draft', async () => {
      result.updated = false;
      current = { status: 'draft' };
      await expect(approved.markFeePaid({ paymentId: pay._id })).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('hard copy and cancellation', () => {
    test('receiving the hard copy completes the admission', async () => {
      const paid = make({ status: 'feePaid' });
      await paid.receiveHardCopy({ byUserId: admin });
      expect(calls[0].filter).toEqual({ _id: paid._id, status: { $in: ['feePaid'] } });
      expect(calls[0].update.$set).toMatchObject({ status: 'admitted', hardCopyReceivedByUserId: admin });
      expect(calls[0].update.$set.admittedAt).toBeInstanceOf(Date);
      expect(calls[0].update.$set.hardCopyReceivedAt).toBeInstanceOf(Date);
    });
    test('receiving it twice changes nothing', async () => {
      const done = make({ status: 'admitted' });
      expect(await done.receiveHardCopy({ byUserId: admin })).toBe(done);
      expect(calls).toHaveLength(0);
    });
    test('the hard copy before the fee is paid is refused by the guarded update', async () => {
      result.updated = false;
      current = { status: 'approved' };
      await expect(make({ status: 'approved' }).receiveHardCopy({ byUserId: admin })).rejects.toMatchObject({ statusCode: 409 });
    });
    test('cancelling needs a reason and works from approved or feePaid', async () => {
      await expect(app.cancel({ byUserId: admin })).rejects.toMatchObject({ statusCode: 400 });
      await app.cancel({ byUserId: admin, reason: 'Student withdrew' });
      expect(calls[0].filter.status.$in).toEqual(['approved', 'feePaid']);
      expect(calls[0].update.$set).toMatchObject({ status: 'cancelled', cancelReason: 'Student withdrew' });
    });
    test('an admitted student cannot be cancelled here', async () => {
      result.updated = false;
      current = { status: 'admitted' };
      await expect(app.cancel({ byUserId: admin, reason: 'x' })).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('deadlines', () => {
    test('overdue lists unpaid fees and late hard copies as of a date', async () => {
      const finds = [];
      Application.find = (f) => { finds.push(f); return { select: async () => [{ applicationNumber: 'APP-1' }] }; };
      const out = await Application.overdue({ now: NOW });
      expect(finds).toEqual([
        { status: 'approved', feeDueAt: { $lt: NOW } },
        { status: 'feePaid', hardCopyDueAt: { $lt: NOW } },
      ]);
      expect(out.fee).toHaveLength(1);
      expect(out.hardCopy).toHaveLength(1);
    });
    test('cancelUnpaid cancels only approved applications whose fee is late, never paid ones', async () => {
      let seen;
      Application.updateMany = async (f, u) => { seen = { f, u }; return { modifiedCount: 4 }; };
      expect(await Application.cancelUnpaid({ now: NOW })).toBe(4);
      expect(seen.f).toEqual({ status: 'approved', feeDueAt: { $lt: NOW } });
      expect(seen.u.$set).toMatchObject({ status: 'cancelled', cancelledAt: NOW, cancelReason: 'Fee not paid within the due date' });
    });
  });

  test('the whole path: submitted -> approvals -> fee -> paid -> hard copy are all different guarded steps', async () => {
    FeeStructure.findFor = async () => ({ _id: id(), amountPaise: 500000 });
    AdmissionDocument.missingRequired = async () => [];
    AdmissionDocument.notVerified = async () => [];
    const pay = { _id: id(), purpose: 'admission', applicationId: app._id, status: 'paid', amountPaise: 500000, paidAt: NOW };
    Payment.findById = () => q(pay);
    await app.approveSubjects({ byUserId: admin });
    await app.approveDocuments({ byUserId: admin });
    await app.approveForm({ byUserId: admin, now: NOW });
    app.status = 'approved'; app.feeAmountPaise = 500000;
    await app.markFeePaid({ paymentId: pay._id });
    app.status = 'feePaid';
    await app.receiveHardCopy({ byUserId: admin });
    expect(calls.map((c) => c.update.$set.status || '(step)')).toEqual(['(step)', '(step)', 'approved', 'feePaid', 'admitted']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('application statuses and constants', () => {
  test('only a draft or returned application can be edited', () => {
    expect(C.EDITABLE_APPLICATION_STATUSES).toEqual(['draft', 'returned']);
  });
  test('the admission timings match the college procedure', () => {
    expect(C.ADMISSION_RULES).toEqual({ reviewDays: 4, feeDueDays: 3, hardCopyDueDays: 3 });
  });
  test('the nine statuses', () => {
    expect(C.APPLICATION_STATUS_VALUES.sort()).toEqual(['admitted', 'approved', 'cancelled', 'draft', 'feePaid', 'rejected', 'returned', 'submitted', 'waitlisted']);
  });
});
