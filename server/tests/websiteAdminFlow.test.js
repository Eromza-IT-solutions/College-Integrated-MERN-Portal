// End-to-end checks for the College Website Admin panel against a real (in-memory) MongoDB:
// real login sessions, the real /api/v1 router, permission matrix, validation, persistence, uploads and audit logs.
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync } from 'fs';
import { createSessionMiddleware } from '../src/config/session.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import routes from '../src/routes/index.js';
import User from '../src/models/User.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import WebsiteContent from '../src/models/WebsiteContent.js';
import { hashPassword } from '../src/utils/password.js';
import { clearPermissionCache } from '../src/services/permissionService.js';

const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));
const PASSWORD = 'Correct-Horse-Battery-9';
const store = new session.MemoryStore();
store.setMaxListeners(0);

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const PDF = Buffer.from('%PDF-1.4\n%test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

function testApp() {
  const a = express();
  a.use(requestId);
  a.use(express.json());
  a.use(createSessionMiddleware({ store }));
  a.use('/api/v1', routes);
  a.use(errorHandler);
  return a;
}

let mongod;
let uploadDir;
const users = {};

beforeAll(async () => {
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-uploads-'));
  process.env.UPLOAD_DIR = uploadDir;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Permission.insertMany(matrix);
  clearPermissionCache();
  const hash = await hashPassword(PASSWORD);
  const make = async (key, role) => {
    users[key] = await User.create({ passwordHash: hash, status: 'active', fullName: `${key} person`, email: `${key}@demo.example`, role });
  };
  await make('web', 'websiteAdmin');
  await make('web2', 'websiteAdmin');
  await make('admission', 'admissionAdmin');
  await make('exam', 'examAdmin');
  await make('student', 'student');
  await make('super', 'superAdmin');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  await fs.rm(uploadDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await WebsiteContent.deleteMany({});
});

async function signIn(key) {
  const agent = request.agent(testApp());
  const res = await agent.post('/api/v1/auth/login').send({ identifier: `${key}@demo.example`, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

describe('website pages: create, edit, publish, unpublish, delete', () => {
  test('full life of a page is stored in MongoDB, shown publicly only when published, and audited', async () => {
    const web = await signIn('web');

    const created = await web.post('/api/v1/website/content').send({
      type: 'page', title: 'About College', category: 'Main Pages', summary: 'History', body: 'Founded long ago.',
    });
    expect(created.status).toBe(201);
    const pageId = created.body.data.id;
    expect(created.body.data).toMatchObject({ status: 'draft', category: 'Main Pages', slug: 'about-college' });
    expect(await WebsiteContent.countDocuments({ _id: pageId, status: 'draft' })).toBe(1);

    // not public while a draft
    expect((await request(testApp()).get('/api/v1/website/public?type=page')).body.data.total).toBe(0);

    const edited = await web.patch(`/api/v1/website/content/${pageId}`).send({ title: 'About Our College', category: 'Academic' });
    expect(edited.status).toBe(200);
    expect((await WebsiteContent.findById(pageId)).category).toBe('Academic');

    expect((await web.post(`/api/v1/website/content/${pageId}/publish`).send({})).body.data.status).toBe('published');
    const pub = await request(testApp()).get('/api/v1/website/public?type=page');
    expect(pub.body.data.items.map((i) => i.title)).toEqual(['About Our College']);
    expect(pub.body.data.items[0].category).toBe('Academic');

    // a published item cannot be deleted until it is taken off the website
    expect((await web.delete(`/api/v1/website/content/${pageId}`)).status).toBe(409);
    expect((await web.post(`/api/v1/website/content/${pageId}/unpublish`)).body.data.status).toBe('draft');
    expect((await web.delete(`/api/v1/website/content/${pageId}`)).status).toBe(200);
    expect(await WebsiteContent.countDocuments({ _id: pageId })).toBe(0);

    const actions = (await AuditLog.find({ actorUserId: users.web._id, entityId: pageId }).lean()).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining([
      'websiteContentCreated', 'websiteContentUpdated', 'websiteContentPublished', 'websiteContentUnpublished', 'websiteContentDeleted',
    ]));
  });

  test('publishing incomplete content is refused with the reason; invalid input is 400', async () => {
    const web = await signIn('web');
    const empty = await web.post('/api/v1/website/content').send({ type: 'page', title: 'Empty' });
    const res = await web.post(`/api/v1/website/content/${empty.body.data.id}/publish`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/needs some text/);
    expect((await web.post('/api/v1/website/content').send({ type: 'page' })).status).toBe(400); // no title
    expect((await web.post('/api/v1/website/content').send({ type: 'blog', title: 'x' })).status).toBe(400);
    expect((await web.post('/api/v1/website/content').send({ type: 'page', title: 'x', imageUrl: 'javascript:alert(1)' })).status).toBe(400);
  });
});

describe('notices: category, priority/audience details, pinning, scheduling and expiry', () => {
  test('a scheduled notice is counted as scheduled and is not public until its time', async () => {
    const web = await signIn('web');
    const now = await web.post('/api/v1/website/content').send({
      type: 'notice', title: 'Admissions Open', body: 'Apply now', category: 'Admission', isPinned: true,
      meta: { priority: 'High', audience: 'All Students' },
    });
    expect(now.body.data.meta).toEqual({ priority: 'High', audience: 'All Students' });
    const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
    await web.post(`/api/v1/website/content/${now.body.data.id}/publish`).send({ expiresAt });

    const later = await web.post('/api/v1/website/content').send({ type: 'notice', title: 'Exam Timetable', body: 'Soon', category: 'Examination' });
    const publishAt = new Date(Date.now() + 3 * 864e5).toISOString();
    expect((await web.post(`/api/v1/website/content/${later.body.data.id}/publish`).send({ publishAt })).status).toBe(200);

    await web.post('/api/v1/website/content').send({ type: 'notice', title: 'Library Renewal', body: 'Renew', category: 'Academic' });

    const pub = await request(testApp()).get('/api/v1/website/public?type=notice');
    expect(pub.body.data.items.map((i) => i.title)).toEqual(['Admissions Open']);
    expect(pub.body.data.items[0]).toMatchObject({ isPinned: true, category: 'Admission' });

    const stats = await web.get('/api/v1/website/content/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.data.byType.notice).toMatchObject({ total: 3, draft: 1, published: 2, scheduled: 1, live: 1 });

    // editor search and category filter
    expect((await web.get('/api/v1/website/content?type=notice&q=exam')).body.data.items.map((i) => i.title)).toEqual(['Exam Timetable']);
    expect((await web.get('/api/v1/website/content?type=notice&category=Academic')).body.data.total).toBe(1);
    expect((await web.get('/api/v1/website/content?type=notice&q=.*')).body.data.total).toBe(0); // typed text, not a pattern
  });

  test('details must be flat plain text with simple names', async () => {
    const web = await signIn('web');
    expect((await web.post('/api/v1/website/content').send({ type: 'notice', title: 'A', meta: { nested: { a: 1 } } })).status).toBe(400);
    expect((await web.post('/api/v1/website/content').send({ type: 'notice', title: 'B', meta: ['x'] })).status).toBe(400);
    expect((await web.post('/api/v1/website/content').send({ type: 'notice', title: 'C', meta: { 'bad key': 'x' } })).status).toBe(400);
    expect((await web.post('/api/v1/website/content').send({ type: 'notice', title: 'D', meta: { $where: 'x' } })).status).toBe(400);
    const ok = await web.post('/api/v1/website/content').send({ type: 'notice', title: 'E', meta: { seats: 60, open: true } });
    expect(ok.body.data.meta).toEqual({ seats: '60', open: 'true' });
  });
});

describe('departments, courses and faculty profiles', () => {
  test('profiles publish with their details only; the public site lists the published ones', async () => {
    const web = await signIn('web');
    const dept = await web.post('/api/v1/website/content').send({ type: 'department', title: 'Computer Science', summary: 'Computing', meta: { code: 'CS' } });
    const course = await web.post('/api/v1/website/content').send({
      type: 'course', title: 'BCA', category: 'Computer Science', meta: { code: 'BCA', level: 'Undergraduate', duration: '3 Years', departmentRef: dept.body.data.id },
    });
    const fac = await web.post('/api/v1/website/content').send({
      type: 'faculty', title: 'Dr. Rahul Sharma', category: 'Computer Science', meta: { employeeId: 'FAC001', designation: 'Professor', email: 'r@college.example' },
    });
    for (const r of [dept, course, fac]) {
      expect(r.status).toBe(201);
      expect((await web.post(`/api/v1/website/content/${r.body.data.id}/publish`).send({})).status).toBe(200);
    }
    // "Inactive" faculty = taken off the website
    await web.post(`/api/v1/website/content/${fac.body.data.id}/unpublish`);

    const pubCourses = await request(testApp()).get('/api/v1/website/public?type=course');
    expect(pubCourses.body.data.items[0].meta).toMatchObject({ code: 'BCA', departmentRef: dept.body.data.id });
    expect((await request(testApp()).get('/api/v1/website/public?type=faculty')).body.data.total).toBe(0);

    const stats = (await web.get('/api/v1/website/content/stats')).body.data.byType;
    expect(stats.department.published).toBe(1);
    expect(stats.course.published).toBe(1);
    expect(stats.faculty).toMatchObject({ total: 1, draft: 1 });

    // the academic department records are read-only for the website admin
    expect((await web.get('/api/v1/admin/departments')).status).toBe(200);
    expect((await web.post('/api/v1/admin/departments').send({ name: 'X', code: 'X' })).status).toBe(403);
  });
});

describe('gallery and document uploads', () => {
  test('a picture is stored, served back, published as a gallery item and removed with it', async () => {
    const web = await signIn('web');
    const up = await web.post('/api/v1/website/uploads').attach('file', PNG, 'campus.png');
    expect(up.status).toBe(201);
    expect(up.body.data).toMatchObject({ name: 'campus.png', mimeType: 'image/png', kind: 'image', sizeBytes: PNG.length });
    expect(up.body.data.url).toMatch(/^\/api\/v1\/website\/files\/[a-f0-9]{24}\.png$/);

    const served = await request(testApp()).get(up.body.data.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['x-content-type-options']).toBe('nosniff');

    const item = await web.post('/api/v1/website/content').send({ type: 'gallery', title: 'campus.png', category: 'Campus', images: [{ url: up.body.data.url }] });
    expect((await web.post(`/api/v1/website/content/${item.body.data.id}/publish`).send({})).status).toBe(200);
    expect((await request(testApp()).get('/api/v1/website/public?type=gallery')).body.data.items[0].images[0].url).toBe(up.body.data.url);

    await web.post(`/api/v1/website/content/${item.body.data.id}/unpublish`);
    expect((await web.delete(`/api/v1/website/content/${item.body.data.id}`)).status).toBe(200);
    expect((await request(testApp()).get(up.body.data.url)).status).toBe(404); // file removed from disk
  });

  test('a PDF becomes a downloadable document; non-PDF documents are sent as downloads', async () => {
    const web = await signIn('web');
    const up = await web.post('/api/v1/website/uploads').attach('file', PDF, 'prospectus.pdf');
    expect(up.status).toBe(201);
    const doc = await web.post('/api/v1/website/content').send({
      type: 'document', title: 'Prospectus', category: 'Documents', attachments: [{ name: up.body.data.name, url: up.body.data.url, mimeType: up.body.data.mimeType, sizeBytes: up.body.data.sizeBytes }],
    });
    expect((await web.post(`/api/v1/website/content/${doc.body.data.id}/publish`).send({})).status).toBe(200);

    const txt = await web.post('/api/v1/website/uploads').attach('file', Buffer.from('hello'), 'readme.txt');
    const served = await request(testApp()).get(txt.body.data.url);
    expect(served.headers['content-disposition']).toMatch(/^attachment/);
  });

  test('wrong, disguised or oversized files are refused; names cannot reach other folders', async () => {
    const web = await signIn('web');
    expect((await web.post('/api/v1/website/uploads').attach('file', Buffer.from('MZ\x90\x00'), 'tool.exe')).status).toBe(400);
    const fake = await web.post('/api/v1/website/uploads').attach('file', Buffer.from('<script>alert(1)</script>'), 'photo.png');
    expect(fake.status).toBe(400);
    expect(fake.body.error.message).toMatch(/does not match/);
    expect((await web.post('/api/v1/website/uploads').attach('file', Buffer.alloc(10 * 1024 * 1024 + 10, 0xff), 'big.jpg')).status).toBe(400);
    expect((await web.post('/api/v1/website/uploads')).status).toBe(400);
    expect((await request(testApp()).get('/api/v1/website/files/..%2F..%2Fpackage.json')).status).toBe(404);
    expect((await request(testApp()).get('/api/v1/website/files/abc.png')).status).toBe(404);
  });
});

describe('who may manage website content', () => {
  test('only the website admin and super admin manage pages, uploads and stats', async () => {
    const anon = request(testApp());
    expect((await anon.get('/api/v1/website/content/stats')).status).toBe(401);
    expect((await anon.post('/api/v1/website/uploads').attach('file', PNG, 'a.png')).status).toBe(401);

    for (const key of ['admission', 'exam', 'student']) {
      const agent = await signIn(key);
      expect((await agent.post('/api/v1/website/content').send({ type: 'page', title: 'Nope', body: 'x' })).status).toBe(403);
      expect((await agent.get('/api/v1/website/content/stats')).status).toBe(403);
      expect((await agent.post('/api/v1/website/uploads').attach('file', PNG, 'a.png')).status).toBe(403);
    }
    // the matrix lets the admission and exam admins write college notices, but not pages
    const exam = await signIn('exam');
    expect((await exam.post('/api/v1/website/content').send({ type: 'notice', title: 'Exam notice', body: 'x' })).status).toBe(201);

    const sup = await signIn('super');
    expect((await sup.post('/api/v1/website/content').send({ type: 'page', title: 'By super', body: 'x' })).status).toBe(201);
    expect((await sup.get('/api/v1/website/content/stats')).status).toBe(200);
  });

  test('a website admin disabled by the super admin loses access at once and cannot sign in; re-enabling restores it', async () => {
    const web2 = await signIn('web2');
    expect((await web2.get('/api/v1/website/content?type=page')).status).toBe(200);

    const sup = await signIn('super');
    expect((await sup.patch(`/api/v1/admin/users/${users.web2._id}`).send({ status: 'deactivated' })).status).toBe(200);

    expect((await web2.get('/api/v1/website/content?type=page')).status).toBe(401); // existing session no longer works
    const login = await request(testApp()).post('/api/v1/auth/login').send({ identifier: 'web2@demo.example', password: PASSWORD });
    expect(login.status).not.toBe(200);
    expect(await User.countDocuments({ _id: users.web2._id, status: 'deactivated' })).toBe(1); // kept, not deleted

    expect((await sup.patch(`/api/v1/admin/users/${users.web2._id}`).send({ status: 'active' })).status).toBe(200);
    const again = await signIn('web2');
    expect((await again.get('/api/v1/website/content?type=page')).status).toBe(200);
  });
});
