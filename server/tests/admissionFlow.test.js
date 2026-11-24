import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import Application from '../src/models/Application.js';
import AdmissionDocument from '../src/models/AdmissionDocument.js';
import AcademicYear from '../src/models/AcademicYear.js';
import Program from '../src/models/Program.js';
import Student from '../src/models/Student.js';
import FeeStructure from '../src/models/FeeStructure.js';
import Counter from '../src/models/Counter.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import admissionRoutes from '../src/modules/admission/admission.routes.js';
import { pngBuffer } from './helpers/testImages.js';
import { hashMobile } from '../src/utils/blindIndex.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const id = () => new mongoose.Types.ObjectId();
const copy = (value) => (value ? JSON.parse(JSON.stringify(value)) : null);
const q = (value) => ({
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  session: () => q(value),
  select: () => q(value),
  lean: () => q(value),
});

const at = (row, key) => key.split('.').reduce((value, part) => (value == null ? value : value[part]), row);

const matches = (row, filter) =>
  Object.entries(filter || {}).every(([key, value]) => {
    if (key === '$and') return value.every((part) => matches(row, part));
    if (key === '$or') return value.some((part) => matches(row, part));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) return value.$in.map(String).includes(String(at(row, key)));
      if ('$lt' in value) return new Date(at(row, key)).getTime() < new Date(value.$lt).getTime();
      if ('$ne' in value) return String(at(row, key)) !== String(value.$ne);
      if ('$exists' in value) return (at(row, key) !== undefined) === value.$exists;
    }
    return String(at(row, key)) === String(value);
  });

const cursor = (rows) => {
  const c = {
    s: 0,
    l: undefined,
    sort: () => c,
    populate: () => c,
    select: () => c,
    skip: (n) => {
      c.s = n;
      return c;
    },
    limit: (n) => {
      c.l = n;
      return c;
    },
    lean: () => c,
    then: (resolve, reject) => {
      let result = rows;
      if (c.s) result = result.slice(c.s);
      if (c.l !== undefined) result = result.slice(0, c.l);
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return c;
};

let audits;
let applications;
let documents;
let years;
let programs;
let fee;
let uploadDir;
let sequence;

function hydrateApplication(row) {
  const doc = Application.hydrate(copy(row));
  doc.save = async () => {
    Object.assign(row, doc.toObject());
    return doc;
  };
  return doc;
}

function hydrateDocument(row) {
  const doc = AdmissionDocument.hydrate(copy(row));
  doc.save = async () => {
    Object.assign(row, doc.toObject());
    return doc;
  };
  doc.deleteOne = async () => {
    delete documents[String(row._id)];
  };
  return doc;
}

const YEAR = id();
const PROGRAM = id();
const applicantA = id();
const applicantB = id();
const adminUser = id();

function completeFields() {
  const address = {
    line1: 'A',
    line2: 'B',
    country: 'INDIA',
    pincode: '411001',
    state: 'Maharashtra',
    district: 'Pune',
    taluka: 'Pune City',
    location: 'Pune',
  };
  return {
    admissionType: 'Provisional',
    divisionType: 'P.N.G.',
    feesCategory: 'PAYING',
    aadhaarNumber: '123412341234',
    student: {
      surname: 'Shaikh',
      firstName: 'Aman',
      middleName: 'R',
      nameCombination: 'Surname First Middle',
      fullName: 'Shaikh Aman R',
      gender: 'Male',
      address,
      mobile: '9876543210',
      mobileHash: hashMobile('9876543210'),
      email: 'Aman@Demo.example',
      birthDate: '2007-01-02',
      birthPlace: 'Pune',
      birthPlaceCountry: 'INDIA',
      nationality: 'INDIAN',
      motherTongue: 'Marathi',
      maritalStatus: 'Single',
      bloodGroup: 'O+',
      religion: 'ISLAM',
      caste: 'X',
      casteCategory: 'OPEN',
    },
    parent: {
      fatherFullName: 'F',
      motherFirstName: 'M',
      address,
      fatherMobile: '9876543211',
      isAlumni: false,
    },
    lastExam: {
      lastClass: 'XII',
      instituteName: 'I',
      boardName: 'B',
      eligibility: 'Same Institute/College',
      stateOfResidence: 'Maharashtra',
      qualifiedExam: 'HSC',
      passingMonth: 'Mar',
      passingYear: '2026',
      obtainedMarks: 450,
      outOfMarks: 600,
      percentage: 75,
      result: 'Distinction',
      attempt: '1st',
      seatNo: 'S1',
      hasGap: false,
    },
    subjects: { mainGroup: 'Science', majorGroup: 'Computer', minorGroup: 'Maths' },
  };
}

function addApplication(over = {}) {
  const row = {
    _id: id(),
    applicantUserId: applicantA,
    academicYearId: YEAR,
    programId: PROGRAM,
    yearOfStudy: 1,
    status: 'draft',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...completeFields(),
    ...over,
  };
  applications[String(row._id)] = row;
  return row;
}

function wireFakes() {
  clearPermissionCache();
  audits = [];
  applications = {};
  documents = {};
  sequence = 0;
  years = {
    [String(YEAR)]: {
      _id: YEAR,
      label: '2026-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      status: 'current',
    },
  };
  programs = {
    [String(PROGRAM)]: {
      _id: PROGRAM,
      name: 'B.Sc. Computer Science',
      code: 'BDPSCS',
      departmentId: id(),
      level: 'Undergraduate',
      durationYears: 3,
      isActive: true,
    },
  };
  fee = {
    _id: id(),
    purpose: 'admission',
    academicYearId: YEAR,
    programId: PROGRAM,
    yearOfStudy: 1,
    divisionType: 'P.N.G.',
    feesCategory: 'PAYING',
    amountPaise: 1200000,
  };

  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async (entry) => {
    audits.push(entry);
    return entry;
  };

  AcademicYear.findById = (yearId) => q(years[String(yearId)] || null);
  AcademicYear.find = (filter) => cursor(Object.values(years).filter((year) => matches(year, filter)));

  Program.findById = (programId) => {
    const row = programs[String(programId)];
    return q(row ? Program.hydrate(copy(row)) : null);
  };
  Program.find = (filter) => cursor(Object.values(programs).filter((program) => matches(program, filter)));

  Application.prototype.save = async function save() {
    const row = this.toObject();
    applications[String(row._id)] = row;
    return this;
  };
  Application.findById = (applicationId) =>
    q(applications[String(applicationId)] ? hydrateApplication(applications[String(applicationId)]) : null);
  Application.find = (filter) => cursor(Object.values(applications).filter((row) => matches(row, filter)));
  Application.countDocuments = async (filter) =>
    Object.values(applications).filter((row) => matches(row, filter)).length;
  Application.findOneAndUpdate = async (filter, update) => {
    const row = applications[String(filter._id)];
    if (!row) return null;
    if (filter.status && filter.status.$in && !filter.status.$in.includes(row.status)) return null;
    if (filter.subjectsApprovedAt && filter.subjectsApprovedAt.$ne === null && row.subjectsApprovedAt == null) return null;
    if (filter.documentsApprovedAt && filter.documentsApprovedAt.$ne === null && row.documentsApprovedAt == null) return null;
    if (update.$set) Object.assign(row, update.$set);
    if (update.$unset) Object.keys(update.$unset).forEach((key) => delete row[key]);
    return hydrateApplication(row);
  };
  Application.offeredSubjects = async () => ({ major: [], minor: [] });

  AdmissionDocument.findById = (documentId) =>
    q(documents[String(documentId)] ? hydrateDocument(documents[String(documentId)]) : null);
  AdmissionDocument.find = (filter) =>
    cursor(Object.values(documents).filter((row) => matches(row, filter)));
  AdmissionDocument.findOne = (filter) =>
    q(
      Object.values(documents).find((row) => matches(row, filter))
        ? hydrateDocument(Object.values(documents).find((row) => matches(row, filter)))
        : null
    );
  AdmissionDocument.create = async (data) => {
    const row = {
      _id: id(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    documents[String(row._id)] = row;
    return hydrateDocument(row);
  };
  AdmissionDocument.requiredFor = async () => [{ type: 'photo', why: 'everyone' }];
  AdmissionDocument.missingRequired = async (applicationId) =>
    documentsOf(applicationId).some((doc) => doc.type === 'photo') ? [] : ['photo'];
  AdmissionDocument.notVerified = async (applicationId) =>
    documentsOf(applicationId).some((doc) => doc.type === 'photo' && doc.status === 'verified') ? [] : ['photo'];

  FeeStructure.findFor = async () => fee;
  Counter.next = async () => {
    sequence += 1;
    return sequence;
  };
  Counter.format = () => `APP-2026-27-${String(sequence).padStart(6, '0')}`;

  Student.createFromApplication = async (applicationId) => {
    const row = applications[String(applicationId)];
    return {
      student: { _id: id(), applicationId, enrollmentNumber: 'ENR-2026-27-000001', userId: row.applicantUserId },
      enrolled: 0,
      unmatched: [],
    };
  };
}

function documentsOf(applicationId) {
  return Object.values(documents).filter((doc) => String(doc.applicationId) === String(applicationId));
}

function appWith(user) {
  const app = express();
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use(express.json());
  app.use('/admissions', admissionRoutes);
  app.use(errorHandler);
  return app;
}

const as = (role, userId) =>
  request(appWith({ id: String(userId || id()), role, departmentId: null }));
const lastAudit = (action) => [...audits].reverse().find((entry) => entry.action === action);

let errorSpy;
beforeAll(async () => {
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admission-test-'));
  process.env.UPLOAD_DIR = uploadDir;
});
afterAll(async () => {
  delete process.env.UPLOAD_DIR;
  await fs.rm(uploadDir, { recursive: true, force: true });
});
beforeEach(() => {
  wireFakes();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe('admission API', () => {
  test('an applicant creates a draft and workflow fields in the body are ignored', async () => {
    const res = await as('applicant', applicantA)
      .post('/admissions/applications')
      .send({
        academicYearId: String(YEAR),
        programId: String(PROGRAM),
        yearOfStudy: 1,
        status: 'approved',
        feeAmountPaise: 1,
        student: { fullName: 'Shaikh Aman R', status: 'hacked', unknown: 'drop me' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.student.fullName).toBe('Shaikh Aman R');
    expect(res.body.data.student.status).toBeUndefined();
    expect(res.body.data.student.unknown).toBeUndefined();
    expect(res.body.data.feeAmountPaise).toBeUndefined();
    expect(lastAudit('applicationCreated')).toBeTruthy();
  });

  test('only an applicant can create an application', async () => {
    const res = await as('admissionAdmin', adminUser)
      .post('/admissions/applications')
      .send({ academicYearId: String(YEAR), programId: String(PROGRAM) });

    expect(res.status).toBe(403);
  });

  test('an applicant sees only their own applications', async () => {
    addApplication({ applicantUserId: applicantA, applicationNumber: 'APP-A' });
    addApplication({ applicantUserId: applicantB, applicationNumber: 'APP-B' });

    const res = await as('applicant', applicantA).get('/admissions/applications');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].applicationNumber).toBe('APP-A');
    expect(res.body.meta.total).toBe(1);
  });

  test('staff can find an application by the mobile blind index', async () => {
    addApplication({ applicationNumber: 'APP-MOBILE' });
    addApplication({
      applicationNumber: 'APP-MATCH',
      student: { ...completeFields().student, mobile: '9000000011', mobileHash: hashMobile('9000000011') },
    });

    const res = await as('admissionAdmin', adminUser).get('/admissions/applications?mobile=9000000011');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].applicationNumber).toBe('APP-MATCH');
    expect(JSON.stringify(res.body.data[0])).not.toContain(hashMobile('9000000011'));
  });

  test('another applicant cannot open someone else’s application', async () => {
    const row = addApplication({ applicantUserId: applicantB });

    const res = await as('applicant', applicantA).get(`/admissions/applications/${row._id}`);

    expect(res.status).toBe(404);
  });

  test('nested form fields are whitelisted and merged', async () => {
    const row = addApplication({ applicantUserId: applicantA });
    const major = id();

    const res = await as('applicant', applicantA)
      .patch(`/admissions/applications/${row._id}`)
      .send({
        status: 'approved',
        student: { fullName: 'New Name' },
        subjects: { nep: { major: [String(major)] } },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.student.fullName).toBe('New Name');
    expect(res.body.data.subjects.mainGroup).toBe('Science');
    expect(res.body.data.subjects.nep.major).toEqual([String(major)]);
  });

  test('a submitted application cannot be edited', async () => {
    const row = addApplication({ applicantUserId: applicantA, status: 'submitted' });

    const res = await as('applicant', applicantA)
      .patch(`/admissions/applications/${row._id}`)
      .send({ student: { fullName: 'Changed' } });

    expect(res.status).toBe(409);
  });

  test('submit refuses an incomplete form and names the missing fields', async () => {
    const row = addApplication({ applicantUserId: applicantA, student: undefined, subjects: undefined });

    const res = await as('applicant', applicantA).post(`/admissions/applications/${row._id}/submit`);

    expect(res.status).toBe(400);
    expect(res.body.error.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'student.surname' }),
        expect.objectContaining({ field: 'subjects.mainGroup' }),
      ])
    );
  });

  test('submit assigns an application number and moves the form to submitted', async () => {
    const row = addApplication({ applicantUserId: applicantA });

    const res = await as('applicant', applicantA).post(`/admissions/applications/${row._id}/submit`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('submitted');
    expect(res.body.data.applicationNumber).toBe('APP-2026-27-000001');
    expect(lastAudit('applicationSubmitted')).toBeTruthy();
  });

  test('the admission office approves the form after subjects and documents', async () => {
    const row = addApplication({
      applicantUserId: applicantA,
      status: 'submitted',
      subjectsApprovedAt: new Date(),
      documentsApprovedAt: new Date(),
    });

    const res = await as('admissionAdmin', adminUser).post(
      `/admissions/applications/${row._id}/approve`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.feeAmountPaise).toBe(1200000);
    expect(lastAudit('applicationApproved')).toBeTruthy();
  });

  test('a rejected document needs a reason', async () => {
    const row = addApplication({ applicantUserId: applicantA, status: 'submitted' });
    const document = {
      _id: id(),
      applicationId: row._id,
      type: 'photo',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      storageKey: 'admissions/x/photo.jpg',
      status: 'pending',
    };
    documents[String(document._id)] = document;

    const res = await as('admissionAdmin', adminUser)
      .post(`/admissions/documents/${document._id}/verify`)
      .send({ approve: false });

    expect(res.status).toBe(400);
    expect(res.body.error.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'note' })])
    );
  });

  test('the applicant uploads a verified document and the office verifies it', async () => {
    const row = addApplication({ applicantUserId: applicantA, status: 'draft' });
    const image = pngBuffer(80, 100);

    const uploaded = await as('applicant', applicantA)
      .post(`/admissions/applications/${row._id}/documents`)
      .field('type', 'photo')
      .attach('file', image, {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.type).toBe('photo');
    expect(uploaded.body.data.mimeType).toBe('image/png');
    expect(uploaded.body.data.width).toBe(80);
    expect(uploaded.body.data.height).toBe(100);
    await expect(fs.stat(path.join(uploadDir, uploaded.body.data.storageKey))).resolves.toBeTruthy();

    const download = await as('applicant', applicantA).get(`/admissions/documents/${uploaded.body.data._id}/download`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toBe('image/png');
    expect(download.headers['content-disposition']).toContain('photo.png');
    expect(download.body).toEqual(image);

    const otherApplicant = await as('applicant', applicantB).get(`/admissions/documents/${uploaded.body.data._id}/download`);
    expect(otherApplicant.status).toBe(404);

    row.status = 'submitted';
    const verified = await as('admissionAdmin', adminUser)
      .post(`/admissions/documents/${uploaded.body.data._id}/verify`)
      .send({ approve: true });

    expect(verified.status).toBe(200);
    expect(verified.body.data.status).toBe('verified');

    const approved = await as('admissionAdmin', adminUser).post(
      `/admissions/applications/${row._id}/documents/approve`
    );

    expect(approved.status).toBe(200);
    expect(approved.body.data.documentsApprovedAt).toBeTruthy();
  });

  test('upload validation rejects bad content, size and dimensions', async () => {
    const upload = (type, buffer, filename, contentType) => {
      const row = addApplication({ applicantUserId: applicantA, status: 'draft' });
      return as('applicant', applicantA)
        .post(`/admissions/applications/${row._id}/documents`)
        .field('type', type)
        .attach('file', buffer, { filename, contentType });
    };

    const wrongMime = await upload('photo', pngBuffer(80, 100), 'photo.jpg', 'image/jpeg');
    expect(wrongMime.status).toBe(400);
    expect(wrongMime.body.error.message).toContain('does not match');

    const malformed = await upload('photo', Buffer.from('fake-image'), 'photo.png', 'image/png');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.message).toContain('valid PNG or JPEG');

    const svg = Buffer.from('<svg onload="alert(1)"><script>alert(1)</script></svg>');
    const script = await upload('photo', svg, 'photo.svg', 'image/svg+xml');
    expect(script.status).toBe(400);
    expect(script.body.error.message).toContain('SVG');

    const oversized = await upload('photo', pngBuffer(80, 100, 600 * 1024), 'photo.png', 'image/png');
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.message).toContain('too large');

    const wrongSize = await upload('photo', pngBuffer(10, 10), 'photo.png', 'image/png');
    expect(wrongSize.status).toBe(400);
    expect(wrongSize.body.error.message).toContain('80x100');

    expect(documentsOf(addApplication({ applicantUserId: applicantA, status: 'draft' })._id)).toHaveLength(0);
  });

  test('the office creates a student only after admission', async () => {
    const row = addApplication({ applicantUserId: applicantA, status: 'admitted' });

    const res = await as('admissionAdmin', adminUser).post(
      `/admissions/applications/${row._id}/student`
    );

    expect(res.status).toBe(201);
    expect(res.body.data.student.enrollmentNumber).toBe('ENR-2026-27-000001');
    expect(lastAudit('studentCreatedFromApplication')).toBeTruthy();
  });

  test('an applicant cannot approve a form or create a student', async () => {
    const row = addApplication({ applicantUserId: applicantA, status: 'submitted' });

    const approve = await as('applicant', applicantA).post(
      `/admissions/applications/${row._id}/approve`
    );
    const student = await as('applicant', applicantA).post(
      `/admissions/applications/${row._id}/student`
    );

    expect(approve.status).toBe(403);
    expect(student.status).toBe(403);
  });

  test('overdue applications respect the applicant scope', async () => {
    addApplication({ applicantUserId: applicantA, status: 'approved', feeDueAt: new Date('2020-01-01') });
    addApplication({ applicantUserId: applicantB, status: 'approved', feeDueAt: new Date('2020-01-01') });

    const res = await as('applicant', applicantA).get('/admissions/applications/overdue');

    expect(res.status).toBe(200);
    expect(res.body.data.fee).toHaveLength(1);
    expect(String(res.body.data.fee[0].applicantUserId)).toBe(String(applicantA));
  });
});
