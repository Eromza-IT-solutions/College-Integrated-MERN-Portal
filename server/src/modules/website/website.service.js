import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import WebsiteContent from '../../models/WebsiteContent.js';
import AuditLog from '../../models/AuditLog.js';
import { WEBSITE_CONTENT_TYPE_VALUES, WEBSITE_CONTENT_STATUS, WEBSITE_CONTENT_STATUS_VALUES, WEBSITE_CONTENT_RESOURCE, WEBSITE_LIMITS as L, AUDIT_OUTCOME } from '../../utils/constants.js';
import { fileNameFromUrl, websiteFileUrl, deleteWebsiteFile } from './website.files.js';

// What an editor may set. Everything else (author, status, dates of publishing, type) is controlled by the server.
const EDITABLE = ['title', 'summary', 'body', 'imageUrl', 'images', 'attachments', 'isPublic', 'isPinned', 'startsAt', 'endsAt', 'venue', 'category', 'meta'];
const LIST_FIELDS = 'type title slug summary imageUrl departmentId isPinned startsAt endsAt venue publishedAt expiresAt category meta images attachments';

const resourceFor = (type) => WEBSITE_CONTENT_RESOURCE[type];
const isType = (type) => WEBSITE_CONTENT_TYPE_VALUES.includes(type);

// A Map on a document, a plain object from .lean(): always hand out a plain object.
const metaOf = (m) => (m instanceof Map ? Object.fromEntries(m) : { ...(m || {}) });

/** What the public sees. */
const publicView = (d, { withBody = false } = {}) => ({
  id: String(d._id), type: d.type, title: d.title, slug: d.slug, summary: d.summary || null, imageUrl: d.imageUrl || null,
  departmentId: d.departmentId ? String(d.departmentId) : null, isPinned: !!d.isPinned, startsAt: d.startsAt || null, endsAt: d.endsAt || null,
  venue: d.venue || null, publishedAt: d.publishedAt || null, category: d.category || null, meta: metaOf(d.meta),
  images: d.images || [], attachments: d.attachments || [],
  ...(withBody ? { body: d.body || '' } : {}),
});

/** What an editor sees: everything. */
const adminView = (d) => ({
  ...publicView(d, { withBody: true }), status: d.status, isPublic: d.isPublic, expiresAt: d.expiresAt || null,
  authorUserId: String(d.authorUserId), lastEditedByUserId: d.lastEditedByUserId ? String(d.lastEditedByUserId) : null, createdAt: d.createdAt, updatedAt: d.updatedAt,
});

function paging({ page, limit } = {}, max = 50) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(max, Math.max(1, parseInt(limit, 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}

// Text typed into a search box, made safe to use inside a regular expression.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Optional ?q= (title, summary, category) and ?category= filters, shared by the public and the editor lists. */
function searchFilter(query = {}) {
  const filter = {};
  if (typeof query.category === 'string' && query.category.trim()) filter.category = query.category.trim().slice(0, L.categoryMax);
  if (typeof query.q === 'string' && query.q.trim()) {
    const rx = new RegExp(escapeRegex(query.q.trim().slice(0, 100)), 'i');
    filter.$and = [{ $or: [{ title: rx }, { summary: rx }, { category: rx }] }];
  }
  return filter;
}

function pick(body) {
  const out = {};
  for (const k of EDITABLE) if (body && body[k] !== undefined) out[k] = body[k];
  if (out.meta !== undefined) out.meta = cleanMeta(out.meta);
  return out;
}

/** Details must be a flat object of short texts; numbers and true/false are stored as text. */
function cleanMeta(meta) {
  if (meta === null) return undefined;
  if (typeof meta !== 'object' || Array.isArray(meta)) throw new AppError('Details must be a list of named values', 400);
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined || v === '') continue;
    if (!['string', 'number', 'boolean'].includes(typeof v)) throw new AppError(`Detail "${k}" must be plain text`, 400);
    out[k] = String(v);
  }
  return out;
}

/** The public list, newest first with pinned items on top. Never includes the long body. */
async function listVisible({ type, includeMembersOnly = false, query = {}, now = new Date() }) {
  if (type && !isType(type)) throw new AppError('Unknown content type', 400);
  const filter = { ...WebsiteContent.visibleFilter({ now, type, includeMembersOnly }), ...searchFilter(query) };
  if (filter.$and && filter.$or) { filter.$and.push({ $or: filter.$or }); delete filter.$or; }
  const { page, limit, skip } = paging(query);
  const [items, total] = await Promise.all([
    WebsiteContent.find(filter).sort({ isPinned: -1, publishedAt: -1 }).skip(skip).limit(limit).select(LIST_FIELDS).lean(),
    WebsiteContent.countDocuments(filter),
  ]);
  return { items: items.map((d) => publicView(d)), page, limit, total };
}

async function getVisible({ type, slug, includeMembersOnly = false, now = new Date() }) {
  if (!isType(type)) throw new AppError('Content not found', 404);
  const doc = await WebsiteContent.findOne({ ...WebsiteContent.visibleFilter({ now, type, includeMembersOnly }), slug: String(slug).toLowerCase() }).lean();
  if (!doc) throw new AppError('Content not found', 404);
  return publicView(doc, { withBody: true });
}

/**
 * New content, always a draft. With department scope (a Head of Department) the notice is tied to their own department;
 * with "all" scope the editor may choose a department or leave it for the whole college.
 */
async function createContent({ actor, scope, body }) {
  const data = { ...pick(body), type: body.type, status: WEBSITE_CONTENT_STATUS.DRAFT, authorUserId: actor.id, lastEditedByUserId: actor.id };
  if (scope === 'department') {
    if (!actor.departmentId) throw new AppError('You are not linked to a department', 403);
    data.departmentId = actor.departmentId;
  } else if (body.departmentId) {
    if (!mongoose.isValidObjectId(body.departmentId)) throw new AppError('Invalid department', 400);
    data.departmentId = body.departmentId;
  }
  return WebsiteContent.createWithSlug(data);
}

async function updateContent({ doc, actor, body }) {
  if (body && body.type !== undefined && body.type !== doc.type) throw new AppError('The type of content cannot be changed', 400);
  const changes = pick(body);
  if (Object.keys(changes).length === 0) throw new AppError('Nothing to change', 400);
  Object.assign(doc, changes, { lastEditedByUserId: actor.id });
  await doc.save();
  return doc;
}

/** Uploaded files this item points to (main picture, gallery pictures, attachments). */
function uploadedFilesOf(doc) {
  const urls = [doc.imageUrl, ...(doc.images || []).map((i) => i.url), ...(doc.attachments || []).map((a) => a.url)];
  return urls.map(fileNameFromUrl).filter(Boolean);
}

async function removeContent({ doc }) {
  if (doc.status === WEBSITE_CONTENT_STATUS.PUBLISHED) throw new AppError('Unpublish it before deleting', 409);
  await WebsiteContent.deleteOne({ _id: doc._id });
  // Remove uploaded files nothing else uses any more. Best effort: a leftover file is harmless.
  for (const name of uploadedFilesOf(doc)) {
    const url = websiteFileUrl(name);
    const stillUsed = await WebsiteContent.exists({ $or: [{ imageUrl: url }, { 'images.url': url }, { 'attachments.url': url }] });
    if (!stillUsed) await deleteWebsiteFile(name).catch(() => {});
  }
}

async function listForEditor({ type, status, scopeFilter, query }) {
  if (!isType(type)) throw new AppError(`Choose a content type (?type=${WEBSITE_CONTENT_TYPE_VALUES.join('|')})`, 400);
  if (status && !WEBSITE_CONTENT_STATUS_VALUES.includes(status)) throw new AppError('Unknown status', 400);
  const filter = { ...scopeFilter, type, ...(status ? { status } : {}), ...searchFilter(query) };
  if (filter.$and && filter.$or) { filter.$and.push({ $or: filter.$or }); delete filter.$or; }
  const { page, limit, skip } = paging(query, 100);
  const [items, total] = await Promise.all([
    WebsiteContent.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select(`${LIST_FIELDS} status isPublic authorUserId createdAt updatedAt`).lean(),
    WebsiteContent.countDocuments(filter),
  ]);
  return {
    items: items.map((d) => ({
      ...publicView(d), status: d.status, isPublic: d.isPublic, expiresAt: d.expiresAt || null,
      authorUserId: String(d.authorUserId), createdAt: d.createdAt, updatedAt: d.updatedAt,
    })),
    page, limit, total,
  };
}

/**
 * Counts for the website dashboard: per type, how many are draft / published / archived, and how many of the
 * published ones are live now (publish time reached, not expired) versus scheduled for later.
 */
async function contentStats({ scopeFilter = {}, now = new Date() } = {}) {
  const rows = await WebsiteContent.aggregate([
    { $match: { ...scopeFilter } },
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 },
        scheduled: { $sum: { $cond: [{ $and: [{ $eq: ['$status', WEBSITE_CONTENT_STATUS.PUBLISHED] }, { $gt: ['$publishedAt', now] }] }, 1, 0] } },
      },
    },
  ]);
  const byType = {};
  for (const t of WEBSITE_CONTENT_TYPE_VALUES) byType[t] = { total: 0, draft: 0, published: 0, archived: 0, scheduled: 0, live: 0 };
  for (const r of rows) {
    const t = byType[r._id.type];
    if (!t) continue;
    t.total += r.count;
    t[r._id.status] = (t[r._id.status] || 0) + r.count;
    t.scheduled += r.scheduled;
  }
  for (const t of Object.values(byType)) t.live = t.published - t.scheduled;
  return { byType, total: Object.values(byType).reduce((n, t) => n + t.total, 0) };
}

/** Best effort: a failure to write the log never changes the answer. */
function audit(req, action, doc, details) {
  return Promise.resolve(AuditLog.record({
    actorUserId: req.user.id, action, entityType: 'websiteContent', entityId: doc._id, outcome: AUDIT_OUTCOME.SUCCESS, ip: req.ip,
    details: { type: doc.type, title: doc.title, ...(details || {}) },
  })).catch(() => {});
}

export { resourceFor, isType, publicView, adminView, listVisible, getVisible, createContent, updateContent, removeContent, listForEditor, contentStats, audit };
