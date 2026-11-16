import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import WebsiteContent from '../../models/WebsiteContent.js';
import AuditLog from '../../models/AuditLog.js';
import { WEBSITE_CONTENT_TYPE_VALUES, WEBSITE_CONTENT_STATUS, WEBSITE_CONTENT_STATUS_VALUES, WEBSITE_CONTENT_RESOURCE, AUDIT_OUTCOME } from '../../utils/constants.js';

// What an editor may set. Everything else (author, status, dates of publishing, type) is controlled by the server.
const EDITABLE = ['title', 'summary', 'body', 'imageUrl', 'images', 'attachments', 'isPublic', 'isPinned', 'startsAt', 'endsAt', 'venue'];
const LIST_FIELDS = 'type title slug summary imageUrl departmentId isPinned startsAt endsAt venue publishedAt expiresAt';

const resourceFor = (type) => WEBSITE_CONTENT_RESOURCE[type];
const isType = (type) => WEBSITE_CONTENT_TYPE_VALUES.includes(type);

/** What the public sees. */
const publicView = (d, { withBody = false } = {}) => ({
  id: String(d._id), type: d.type, title: d.title, slug: d.slug, summary: d.summary || null, imageUrl: d.imageUrl || null,
  departmentId: d.departmentId ? String(d.departmentId) : null, isPinned: !!d.isPinned, startsAt: d.startsAt || null, endsAt: d.endsAt || null,
  venue: d.venue || null, publishedAt: d.publishedAt || null,
  ...(withBody ? { body: d.body || '', images: d.images || [], attachments: d.attachments || [] } : {}),
});

/** What an editor sees: everything. */
const adminView = (d) => ({
  ...publicView(d, { withBody: true }), status: d.status, isPublic: d.isPublic, expiresAt: d.expiresAt || null,
  authorUserId: String(d.authorUserId), lastEditedByUserId: d.lastEditedByUserId ? String(d.lastEditedByUserId) : null, createdAt: d.createdAt, updatedAt: d.updatedAt,
});

function paging({ page, limit } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}

function pick(body) {
  const out = {};
  for (const k of EDITABLE) if (body && body[k] !== undefined) out[k] = body[k];
  return out;
}

/** The public list, newest first with pinned items on top. Never includes the long body. */
async function listVisible({ type, includeMembersOnly = false, query = {}, now = new Date() }) {
  if (type && !isType(type)) throw new AppError('Unknown content type', 400);
  const filter = WebsiteContent.visibleFilter({ now, type, includeMembersOnly });
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

async function removeContent({ doc }) {
  if (doc.status === WEBSITE_CONTENT_STATUS.PUBLISHED) throw new AppError('Unpublish it before deleting', 409);
  await WebsiteContent.deleteOne({ _id: doc._id });
}

async function listForEditor({ type, status, scopeFilter, query }) {
  if (!isType(type)) throw new AppError('Choose a content type (?type=notice|event|news|gallery|page)', 400);
  if (status && !WEBSITE_CONTENT_STATUS_VALUES.includes(status)) throw new AppError('Unknown status', 400);
  const filter = { ...scopeFilter, type, ...(status ? { status } : {}) };
  const { page, limit, skip } = paging(query);
  const [items, total] = await Promise.all([
    WebsiteContent.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select(`${LIST_FIELDS} status isPublic authorUserId updatedAt`).lean(),
    WebsiteContent.countDocuments(filter),
  ]);
  return { items: items.map((d) => ({ ...publicView(d), status: d.status, isPublic: d.isPublic, authorUserId: String(d.authorUserId), updatedAt: d.updatedAt })), page, limit, total };
}

/** Best effort: a failure to write the log never changes the answer. */
function audit(req, action, doc, details) {
  return Promise.resolve(AuditLog.record({
    actorUserId: req.user.id, action, entityType: 'websiteContent', entityId: doc._id, outcome: AUDIT_OUTCOME.SUCCESS, ip: req.ip,
    details: { type: doc.type, title: doc.title, ...(details || {}) },
  })).catch(() => {});
}

export { resourceFor, isType, publicView, adminView, listVisible, getVisible, createContent, updateContent, removeContent, listForEditor, audit };
