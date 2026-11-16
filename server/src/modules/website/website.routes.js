import express from 'express';
import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import WebsiteContent from '../../models/WebsiteContent.js';
import { requirePermission, getActor } from '../../middleware/requirePermission.js';
import { scopeFilter, isInScope } from '../../utils/scope.js';
import { adminView, audit, createContent, getVisible, isType, listForEditor, listVisible, removeContent, resourceFor, updateContent } from './website.service.js';

/**
 * Website content, mounted at /api/v1/website.
 * Public (no login):
 *   GET /public?type=&page=&limit=          what the public site may show now
 *   GET /public/:type/:slug                 one item with its text
 * Signed in:
 *   GET /members/notices                    published notices, including the members-only ones (permission: notices view)
 * Editors (website admin; Head of Department for notices of their own department):
 *   GET    /content?type=&status=           their list
 *   POST   /content                         new draft, body.type says which kind
 *   GET    /content/:id   PATCH /content/:id
 *   POST   /content/:id/publish             { publishAt?, expiresAt? }
 *   POST   /content/:id/unpublish   POST /content/:id/archive
 *   DELETE /content/:id                     only when not published
 * The permission-matrix resource depends on the type: notices -> "notices", everything else -> "publicPages".
 */
function buildRouter() {
  const router = express.Router();
  const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
  const opts = { ownerField: 'authorUserId', departmentField: 'departmentId' };

  // Permission by the kind of content: from the body (new item), the query (list) or the stored item (by id).
  const permit = (action, from) => asyncHandler(async (req, res, next) => {
    if (!getActor(req)) throw new AppError('Please sign in', 401); // before any lookup
    let type;
    if (from === 'body') type = req.body && req.body.type;
    else if (from === 'query') type = req.query.type;
    else {
      const doc = mongoose.isValidObjectId(req.params.id) ? await WebsiteContent.findById(req.params.id) : null;
      if (!doc) throw new AppError('Content not found', 404);
      req.doc = doc;
      type = doc.type;
    }
    if (!isType(type)) throw new AppError('Choose a valid content type', 400);
    return requirePermission(resourceFor(type), action)(req, res, next);
  });
  const inScope = (req, res, next) => {
    if (!isInScope(req, req.doc, opts)) return next(new AppError('Content not found', 404));
    return next();
  };

  // ---- public ----
  router.get('/public', asyncHandler(async (req, res) => ok(res, await listVisible({ type: req.query.type, query: req.query }))));
  router.get('/public/:type/:slug', asyncHandler(async (req, res) => ok(res, await getVisible({ type: req.params.type, slug: req.params.slug }))));

  // ---- signed in ----
  router.get('/members/notices', requirePermission('notices', 'view'), asyncHandler(async (req, res) => {
    ok(res, await listVisible({ type: 'notice', includeMembersOnly: true, query: req.query }));
  }));

  // ---- editors ----
  router.get('/content', permit('update', 'query'), asyncHandler(async (req, res) => {
    ok(res, await listForEditor({ type: req.query.type, status: req.query.status, scopeFilter: scopeFilter(req, opts), query: req.query }));
  }));

  router.post('/content', permit('create', 'body'), asyncHandler(async (req, res) => {
    const doc = await createContent({ actor: getActor(req), scope: req.permission.scope, body: req.body });
    audit(req, 'websiteContentCreated', doc);
    ok(res, adminView(doc), 201);
  }));

  router.get('/content/:id', permit('update', 'doc'), inScope, (req, res) => ok(res, adminView(req.doc)));

  router.patch('/content/:id', permit('update', 'doc'), inScope, asyncHandler(async (req, res) => {
    const doc = await updateContent({ doc: req.doc, actor: getActor(req), body: req.body });
    audit(req, 'websiteContentUpdated', doc, { fields: Object.keys(req.body || {}) });
    ok(res, adminView(doc));
  }));

  const date = (v, name) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new AppError(`${name} is not a valid date`, 400);
    return d;
  };

  router.post('/content/:id/publish', permit('update', 'doc'), inScope, asyncHandler(async (req, res) => {
    const doc = await WebsiteContent.publish(req.doc._id, {
      byUserId: req.user.id, publishAt: date(req.body && req.body.publishAt, 'publishAt') || undefined, expiresAt: date(req.body && req.body.expiresAt, 'expiresAt'),
    });
    audit(req, 'websiteContentPublished', doc);
    ok(res, adminView(doc));
  }));

  router.post('/content/:id/unpublish', permit('update', 'doc'), inScope, asyncHandler(async (req, res) => {
    const doc = await WebsiteContent.unpublish(req.doc._id, { byUserId: req.user.id });
    audit(req, 'websiteContentUnpublished', doc);
    ok(res, adminView(doc));
  }));

  router.post('/content/:id/archive', permit('update', 'doc'), inScope, asyncHandler(async (req, res) => {
    const doc = await WebsiteContent.archive(req.doc._id, { byUserId: req.user.id });
    audit(req, 'websiteContentArchived', doc);
    ok(res, adminView(doc));
  }));

  router.delete('/content/:id', permit('delete', 'doc'), inScope, asyncHandler(async (req, res) => {
    await removeContent({ doc: req.doc });
    audit(req, 'websiteContentDeleted', req.doc);
    ok(res, { deleted: true });
  }));

  return router;
}

export default buildRouter;
