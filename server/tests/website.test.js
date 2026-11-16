import { readFileSync } from 'fs';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import WebsiteContent from '../src/models/WebsiteContent.js';
import Permission from '../src/models/Permission.js';
import AuditLog from '../src/models/AuditLog.js';
import { clearPermissionCache } from '../src/services/permissionService.js';
import { slugify } from '../src/utils/slug.js';
import buildRouter from '../src/modules/website/website.routes.js';
const matrix = JSON.parse(readFileSync(new URL('../scripts/data/permission-matrix.json', import.meta.url), 'utf8'));

const id = () => String(new mongoose.Types.ObjectId());
const DEPT_A = id();
const DEPT_B = id();
const ADMIN = { id: id(), role: 'websiteAdmin' };
const HOD_A = { id: id(), role: 'hod', departmentId: DEPT_A };
const HOD_NODEPT = { id: id(), role: 'hod' };
const STUDENT = { id: id(), role: 'student' };
const TEACHER = { id: id(), role: 'teacher' };
const EXAM = { id: id(), role: 'examAdmin' };

describe('slugify', () => {
  test.each([
    ['Admission Notice 2026-27!', 'admission-notice-2026-27'],
    ['  Café  Résumé ', 'cafe-resume'],
    ['!!!', 'item'],
    ['a/b\\c', 'a-b-c'],
  ])('%s -> %s', (input, out) => expect(slugify(input)).toBe(out));
  test('is cut to the maximum length without a trailing dash', () => {
    const s = slugify(`${'word '.repeat(40)}`, 20);
    expect(s.length).toBeLessThanOrEqual(20);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('WebsiteContent validation', () => {
  const doc = (over = {}) => new WebsiteContent({ type: 'notice', title: 'Holiday', body: 'Closed on Monday', authorUserId: id(), ...over });
  test('a draft notice is valid and gets a slug, draft status, public by default', async () => {
    const d = doc();
    await expect(d.validate()).resolves.toBeUndefined();
    expect(d).toMatchObject({ slug: 'holiday', status: 'draft', isPublic: true, isPinned: false });
  });
  test.each([
    ['unknown type', { type: 'blog' }],
    ['no title', { title: '' }],
    ['title too long', { title: 'x'.repeat(201) }],
    ['no author', { authorUserId: undefined }],
    ['unknown status', { status: 'live' }],
    ['javascript link', { imageUrl: 'javascript:alert(1)' }],
    ['data link', { imageUrl: 'data:text/html,hi' }],
    ['protocol-relative link', { imageUrl: '//evil.example/a.png' }],
    ['http link', { imageUrl: 'http://example.com/a.png' }],
    ['unsafe attachment link', { attachments: [{ name: 'f', url: 'javascript:x' }] }],
    ['attachment without name', { attachments: [{ url: 'https://x.example/f.pdf' }] }],
    ['too many attachments', { attachments: Array.from({ length: 11 }, (_, i) => ({ name: `f${i}`, url: 'https://x.example/f.pdf' })) }],
    ['event without start', { type: 'event' }],
    ['start on a notice', { startsAt: new Date() }],
    ['event ending before it starts', { type: 'event', startsAt: new Date('2026-12-02'), endsAt: new Date('2026-12-01') }],
    ['pictures on a notice', { images: [{ url: 'https://x.example/a.jpg' }] }],
    ['published without a publish time', { status: 'published' }],
    ['expiry before publish', { status: 'published', publishedAt: new Date('2026-12-02'), expiresAt: new Date('2026-12-01') }],
  ])('rejects %s', async (_n, over) => { await expect(doc(over).validate()).rejects.toThrow(); });
  test.each([
    ['https link', { imageUrl: 'https://cdn.example/a.png' }],
    ['site path', { imageUrl: '/uploads/a.png' }],
    ['event with times', { type: 'event', startsAt: new Date('2026-12-01'), endsAt: new Date('2026-12-02'), venue: 'Hall' }],
    ['gallery with pictures', { type: 'gallery', body: undefined, images: [{ url: '/uploads/1.jpg', caption: 'Day 1' }] }],
    ['published with a time', { status: 'published', publishedAt: new Date() }],
  ])('accepts %s', async (_n, over) => { await expect(doc(over).validate()).resolves.toBeUndefined(); });
  test('the type of a saved item cannot be changed', async () => {
    const saved = WebsiteContent.hydrate({ _id: id(), type: 'notice', title: 'T', slug: 't', body: 'b', authorUserId: id(), status: 'draft' });
    saved.type = 'news';
    await expect(saved.validate()).rejects.toThrow(/cannot be changed/);
  });
});

describe('before publishing and what is visible', () => {
  const p = (o) => WebsiteContent.problemsBeforePublish(o);
  test('text or an attachment is needed; a gallery needs pictures; an event needs a start', () => {
    expect(p({ type: 'notice' })).toHaveLength(1);
    expect(p({ type: 'notice', body: 'x' })).toHaveLength(0);
    expect(p({ type: 'notice', attachments: [{ name: 'a', url: '/f.pdf' }] })).toHaveLength(0);
    expect(p({ type: 'news' })).toHaveLength(1);
    expect(p({ type: 'gallery', images: [] })).toHaveLength(1);
    expect(p({ type: 'gallery', images: [{ url: '/a.jpg' }] })).toHaveLength(0);
    expect(p({ type: 'event', body: 'x' })).toHaveLength(1);
    expect(p({ type: 'event', body: 'x', startsAt: new Date() })).toHaveLength(0);
  });
  test('visibleFilter asks for published, public, already live and not expired', () => {
    const now = new Date('2026-11-15T10:00:00Z');
    const f = WebsiteContent.visibleFilter({ now, type: 'notice' });
    expect(f).toMatchObject({ status: 'published', isPublic: true, type: 'notice', publishedAt: { $lte: now } });
    expect(f.$or).toEqual([{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]);
    expect(WebsiteContent.visibleFilter({ now, includeMembersOnly: true }).isPublic).toBeUndefined();
  });
});

// ---- a small in-memory stand-in for the database ----
let store; let audits;
const matches = (d, f) => Object.entries(f).every(([k, v]) => {
  if (k === '$or') return v.some((sub) => matches(d, sub));
  const val = d[k];
  if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
    if ('$lte' in v) return val != null && val <= v.$lte;
    if ('$gt' in v) return val != null && val > v.$gt;
    if ('$in' in v) return v.$in.map(String).includes(String(val));
    if ('$exists' in v) return (val !== undefined) === v.$exists;
  }
  if (v === null) return val == null;
  return String(val) === String(v);
});
const hydrate = (o) => {
  const d = WebsiteContent.hydrate(JSON.parse(JSON.stringify(o), (k, v) => (/At$/.test(k) && typeof v === 'string' ? new Date(v) : v)));
  d.save = async function save() { await this.validate(); store[this._id] = this.toObject(); return this; };
  return d;
};
function wire() {
  store = {}; audits = [];
  clearPermissionCache();
  Permission.find = () => ({ lean: async () => matrix });
  AuditLog.record = async (e) => { audits.push(e); };
  const chain = (rows) => {
    let r = rows;
    const q = {
      sort: (s) => { const keys = Object.entries(s); r = [...r].sort((x, y) => { for (const [kk, dd] of keys) { const a = x[kk] ?? 0; const b = y[kk] ?? 0; if (a < b) return -dd; if (a > b) return dd; } return 0; }); return q; },
      skip: (n) => { r = r.slice(n); return q; },
      limit: (n) => { r = r.slice(0, n); return q; },
      select: () => q,
      lean: async () => r.map((x) => JSON.parse(JSON.stringify(x), (k, v) => (/At$/.test(k) && typeof v === 'string' ? new Date(v) : v))),
    };
    return q;
  };
  WebsiteContent.find = (f) => chain(Object.values(store).filter((d) => matches(d, f)));
  WebsiteContent.countDocuments = async (f) => Object.values(store).filter((d) => matches(d, f)).length;
  WebsiteContent.findOne = (f) => ({ lean: async () => Object.values(store).find((d) => matches(d, f)) || null });
  WebsiteContent.findById = (i) => { const run = async () => (store[i] ? hydrate(store[i]) : null); return { session: run, then: (a, b) => run().then(a, b) }; };
  WebsiteContent.create = async ([data]) => {
    const d = new WebsiteContent(data);
    await d.validate();
    if (Object.values(store).some((x) => x.type === d.type && x.slug === d.slug)) throw Object.assign(new Error('E11000 dup key slug'), { code: 11000, keyPattern: { type: 1, slug: 1 } });
    store[d._id] = d.toObject();
    return [hydrate(store[d._id])];
  };
  WebsiteContent.findOneAndUpdate = async (f, u) => {
    const d = Object.values(store).find((x) => matches(x, f));
    if (!d) return null;
    Object.assign(d, u.$set);
    return hydrate(d);
  };
  WebsiteContent.deleteOne = async (f) => { delete store[f._id]; };
}
beforeEach(wire);

const seed = (over = {}) => {
  const d = new WebsiteContent({ type: 'notice', title: 'Holiday', body: 'Closed', authorUserId: ADMIN.id, ...over });
  store[d._id] = d.toObject();
  return String(d._id);
};
const live = (over = {}) => seed({ status: 'published', publishedAt: new Date(Date.now() - 60000), ...over });

function appFor(user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { if (user) req.user = user; next(); });
  app.use('/w', buildRouter());
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message, errors: err.errors })); // eslint-disable-line no-unused-vars
  return app;
}

describe('public routes', () => {
  test('lists only published, public, live, unexpired items; pinned first, then newest; no body in the list', async () => {
    live({ title: 'Older', publishedAt: new Date(Date.now() - 200000) });
    live({ title: 'Newer' });
    live({ title: 'Pinned', isPinned: true, publishedAt: new Date(Date.now() - 900000) });
    seed({ title: 'Draft' });
    live({ title: 'Members only', isPublic: false });
    live({ title: 'Future', publishedAt: new Date(Date.now() + 3600000) });
    live({ title: 'Expired', expiresAt: new Date(Date.now() - 1000) });
    seed({ title: 'Archived', status: 'archived', publishedAt: new Date(Date.now() - 60000) });
    const res = await request(appFor(null)).get('/w/public');
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((i) => i.title)).toEqual(['Pinned', 'Newer', 'Older']);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.items[0].body).toBeUndefined();
  });
  test('filters by type, rejects an unknown type, pages the list', async () => {
    live({ title: 'N1' });
    live({ type: 'news', title: 'Story' });
    expect((await request(appFor(null)).get('/w/public?type=news')).body.data.items.map((i) => i.title)).toEqual(['Story']);
    expect((await request(appFor(null)).get('/w/public?type=blog')).status).toBe(400);
    live({ title: 'N2' });
    const p = await request(appFor(null)).get('/w/public?type=notice&limit=1&page=2');
    expect(p.body.data).toMatchObject({ page: 2, limit: 1, total: 2 });
    expect(p.body.data.items).toHaveLength(1);
  });
  test('one item by type and slug, with its text; drafts and members-only items are 404', async () => {
    live({ title: 'Exam Dates', slug: 'exam-dates', body: 'See the table' });
    seed({ title: 'Secret draft', slug: 'secret-draft' });
    live({ title: 'Staff only', slug: 'staff-only', isPublic: false });
    const ok = await request(appFor(null)).get('/w/public/notice/exam-dates');
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ title: 'Exam Dates', body: 'See the table' });
    expect(ok.body.data.authorUserId).toBeUndefined();
    expect((await request(appFor(null)).get('/w/public/notice/secret-draft')).status).toBe(404);
    expect((await request(appFor(null)).get('/w/public/notice/staff-only')).status).toBe(404);
    expect((await request(appFor(null)).get('/w/public/blog/exam-dates')).status).toBe(404);
    expect((await request(appFor(null)).get('/w/public/news/exam-dates')).status).toBe(404);
  });
  test('signed-in members also see members-only notices; nobody signed in gets 401', async () => {
    live({ title: 'Staff only', isPublic: false });
    live({ title: 'Everyone' });
    const res = await request(appFor(STUDENT)).get('/w/members/notices');
    expect(res.body.data.items.map((i) => i.title).sort()).toEqual(['Everyone', 'Staff only']);
    expect((await request(appFor(null)).get('/w/members/notices')).status).toBe(401);
  });
});

describe('creating content', () => {
  const make = (user, body) => request(appFor(user)).post('/w/content').send(body);
  test('the website admin creates a draft; author, status and slug are set by the server', async () => {
    const res = await make(ADMIN, { type: 'news', title: 'Annual Day', body: 'Join us', status: 'published', authorUserId: id(), publishedAt: '2020-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ type: 'news', slug: 'annual-day', status: 'draft', authorUserId: ADMIN.id, publishedAt: null });
    expect(audits[0]).toMatchObject({ action: 'websiteContentCreated', entityType: 'websiteContent' });
  });
  test('the same title gets a free web address (-2, -3)', async () => {
    await make(ADMIN, { type: 'notice', title: 'Holiday', body: 'a' });
    const second = await make(ADMIN, { type: 'notice', title: 'Holiday', body: 'b' });
    const third = await make(ADMIN, { type: 'notice', title: 'Holiday', body: 'c' });
    expect([second.body.data.slug, third.body.data.slug]).toEqual(['holiday-2', 'holiday-3']);
    expect((await make(ADMIN, { type: 'news', title: 'Holiday', body: 'd' })).body.data.slug).toBe('holiday');
  });
  test('a Head of Department can write a notice for their own department only', async () => {
    const res = await make(HOD_A, { type: 'notice', title: 'Dept meeting', body: 'x', departmentId: DEPT_B });
    expect(res.status).toBe(201);
    expect(res.body.data.departmentId).toBe(DEPT_A);
    expect((await make(HOD_NODEPT, { type: 'notice', title: 'x', body: 'x' })).status).toBe(403);
  });
  test('a Head of Department cannot create news, events, galleries or pages', async () => {
    for (const type of ['news', 'event', 'gallery', 'page']) {
      expect((await make(HOD_A, { type, title: 'x', body: 'x' })).status).toBe(403);
    }
  });
  test('students, teachers and nobody signed in cannot create', async () => {
    expect((await make(STUDENT, { type: 'notice', title: 'x', body: 'x' })).status).toBe(403);
    expect((await make(TEACHER, { type: 'notice', title: 'x', body: 'x' })).status).toBe(403);
    expect((await make(null, { type: 'notice', title: 'x', body: 'x' })).status).toBe(401);
  });
  test('the exam admin can write college notices', async () => {
    expect((await make(EXAM, { type: 'notice', title: 'Time table', body: 'x' })).status).toBe(201);
    expect((await make(EXAM, { type: 'page', title: 'About', body: 'x' })).status).toBe(403);
  });
  test('an unknown or missing type is 400; a bad title is 400', async () => {
    expect((await make(ADMIN, { type: 'blog', title: 'x' })).status).toBe(400);
    expect((await make(ADMIN, { title: 'x' })).status).toBe(400);
    expect((await make(ADMIN, { type: 'notice', title: '', body: 'x' })).status).toBe(500); // ValidationError: the real errorHandler turns this into 400
  });
});

describe('editing, publishing, deleting', () => {
  const as = (user) => request(appFor(user));
  test('edit a draft; only the allowed fields change; the type cannot change', async () => {
    const i = seed();
    const res = await as(ADMIN).patch(`/w/content/${i}`).send({ title: 'New title', body: 'New body', status: 'published', authorUserId: id() });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'New title', body: 'New body', status: 'draft', authorUserId: ADMIN.id });
    expect((await as(ADMIN).patch(`/w/content/${i}`).send({ type: 'news' })).status).toBe(400);
    expect((await as(ADMIN).patch(`/w/content/${i}`).send({})).status).toBe(400);
  });
  test('publish puts it on the public list; unpublish takes it off; both are safe to repeat', async () => {
    const i = seed();
    const pub = await as(ADMIN).post(`/w/content/${i}/publish`).send({});
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe('published');
    const first = pub.body.data.publishedAt;
    expect((await as(null).get('/w/public')).body.data.total).toBe(1);
    const again = await as(ADMIN).post(`/w/content/${i}/publish`).send({});
    expect(again.body.data.publishedAt).toBe(first);
    const un = await as(ADMIN).post(`/w/content/${i}/unpublish`);
    expect(un.body.data.status).toBe('draft');
    expect((await as(ADMIN).post(`/w/content/${i}/unpublish`)).body.data.status).toBe('draft');
    expect((await as(null).get('/w/public')).body.data.total).toBe(0);
  });
  test('publishing incomplete content is refused with the reasons', async () => {
    const i = seed({ type: 'gallery', body: undefined });
    const res = await as(ADMIN).post(`/w/content/${i}/publish`).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least one picture/);
  });
  test('publishAt and expiresAt can be set; an expiry before the publish time or a bad date is 400', async () => {
    const i = seed();
    const future = new Date(Date.now() + 86400000).toISOString();
    const later = new Date(Date.now() + 2 * 86400000).toISOString();
    const res = await as(ADMIN).post(`/w/content/${i}/publish`).send({ publishAt: future, expiresAt: later });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ publishedAt: future, expiresAt: later });
    expect((await as(null).get('/w/public')).body.data.total).toBe(0); // not live yet
    expect((await as(ADMIN).post(`/w/content/${i}/publish`).send({ publishAt: later, expiresAt: future })).status).toBe(400);
    expect((await as(ADMIN).post(`/w/content/${i}/publish`).send({ publishAt: 'soon' })).status).toBe(400);
  });
  test('archive removes it from the website; an archived item cannot be unpublished; it can be published again', async () => {
    const i = live();
    expect((await as(ADMIN).post(`/w/content/${i}/archive`)).body.data.status).toBe('archived');
    expect((await as(null).get('/w/public')).body.data.total).toBe(0);
    expect((await as(ADMIN).post(`/w/content/${i}/unpublish`)).status).toBe(409);
    expect((await as(ADMIN).post(`/w/content/${i}/publish`).send({})).body.data.status).toBe('published');
  });
  test('a published item cannot be deleted; a draft can', async () => {
    const pub = live();
    const draft = seed({ title: 'Draft' });
    expect((await as(ADMIN).delete(`/w/content/${pub}`)).status).toBe(409);
    expect((await as(ADMIN).delete(`/w/content/${draft}`)).status).toBe(200);
    expect(store[draft]).toBeUndefined();
    expect(audits.some((a) => a.action === 'websiteContentDeleted')).toBe(true);
  });
  test('the exam admin and teachers cannot delete; the exam admin cannot change pages', async () => {
    const n = seed();
    const page = seed({ type: 'page', title: 'About' });
    expect((await as(EXAM).delete(`/w/content/${n}`)).status).toBe(403);
    expect((await as(TEACHER).patch(`/w/content/${n}`).send({ title: 'x' })).status).toBe(403);
    expect((await as(EXAM).patch(`/w/content/${page}`).send({ title: 'x' })).status).toBe(403);
    expect((await as(EXAM).patch(`/w/content/${n}`).send({ title: 'Changed' })).status).toBe(200);
  });
  test('a Head of Department reaches only their own department\'s notices (others are 404)', async () => {
    const mine = seed({ departmentId: DEPT_A });
    const theirs = seed({ departmentId: DEPT_B });
    const college = seed();
    expect((await as(HOD_A).patch(`/w/content/${mine}`).send({ title: 'Mine' })).status).toBe(200);
    expect((await as(HOD_A).patch(`/w/content/${theirs}`).send({ title: 'x' })).status).toBe(404);
    expect((await as(HOD_A).patch(`/w/content/${college}`).send({ title: 'x' })).status).toBe(404);
    expect((await as(HOD_A).post(`/w/content/${theirs}/publish`).send({})).status).toBe(404);
    expect((await as(HOD_A).delete(`/w/content/${mine}`)).status).toBe(200);
    expect((await as(HOD_A).delete(`/w/content/${theirs}`)).status).toBe(404);
  });
  test('unknown, malformed and unauthenticated ids', async () => {
    expect((await as(ADMIN).get(`/w/content/${id()}`)).status).toBe(404);
    expect((await as(ADMIN).get('/w/content/not-an-id')).status).toBe(404);
    expect((await as(null).get(`/w/content/${id()}`)).status).toBe(401);
  });
});

describe('editor list', () => {
  const as = (user) => request(appFor(user));
  test('needs a type; filters by status; the admin sees all, a Head of Department only their department', async () => {
    seed({ title: 'A', departmentId: DEPT_A });
    seed({ title: 'B', departmentId: DEPT_B });
    live({ title: 'C' });
    expect((await as(ADMIN).get('/w/content')).status).toBe(400);
    const all = await as(ADMIN).get('/w/content?type=notice');
    expect(all.body.data.total).toBe(3);
    expect(all.body.data.items[0].body).toBeUndefined();
    expect((await as(ADMIN).get('/w/content?type=notice&status=published')).body.data.total).toBe(1);
    expect((await as(ADMIN).get('/w/content?type=notice&status=live')).status).toBe(400);
    const hod = await as(HOD_A).get('/w/content?type=notice');
    expect(hod.body.data.items.map((i) => i.title)).toEqual(['A']);
    expect((await as(HOD_NODEPT).get('/w/content?type=notice')).body.data.total).toBe(0);
    expect((await as(HOD_A).get('/w/content?type=news')).status).toBe(403);
    expect((await as(STUDENT).get('/w/content?type=notice')).status).toBe(403);
  });
});
