import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { slugify } from '../utils/slug.js';
import {
  WEBSITE_CONTENT_TYPE as T, WEBSITE_CONTENT_TYPE_VALUES, WEBSITE_CONTENT_STATUS as S, WEBSITE_CONTENT_STATUS_VALUES, WEBSITE_LIMITS as L,
  WEBSITE_PROFILE_TYPES,
} from '../utils/constants.js';

const { Schema } = mongoose;

// A link we accept: https, or a path on our own site. Never javascript:, data: or protocol-relative (//host) links.
const SAFE_URL = /^(https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/;
const url = { type: String, trim: true, validate: { validator: (v) => !v || SAFE_URL.test(v), message: 'Links must start with https:// or /' } };

const attachmentSchema = new Schema({ name: { type: String, required: true, trim: true, maxlength: 200 }, url: { ...url, required: true }, mimeType: { type: String, trim: true }, sizeBytes: { type: Number, min: 0 } }, { _id: false });
const imageSchema = new Schema({ url: { ...url, required: true }, caption: { type: String, trim: true, maxlength: 300 } }, { _id: false });

/**
 * Everything the website admin edits: notices, events, news, photo galleries and plain pages.
 * One model with a "type", because they share the same life: draft -> published -> archived.
 * Files and pictures live in file storage; only their links are kept here.
 * Visible on the public site only when: published, isPublic, publishedAt has come, and not expired. See visibleFilter().
 */
const websiteContentSchema = new Schema(
  {
    type: { type: String, required: true, enum: WEBSITE_CONTENT_TYPE_VALUES, index: true }, // cannot be changed after creation
    title: { type: String, required: true, trim: true, maxlength: L.titleMax },
    slug: { type: String, trim: true, lowercase: true, maxlength: L.slugMax + 8 }, // the readable part of the web address, made from the title
    summary: { type: String, trim: true, maxlength: L.summaryMax },
    body: { type: String, trim: true, maxlength: L.bodyMax },
    imageUrl: url, // one main picture
    images: { type: [imageSchema], validate: { validator: (a) => a.length <= L.imagesMax, message: `A gallery can have at most ${L.imagesMax} pictures` } },
    attachments: { type: [attachmentSchema], validate: { validator: (a) => a.length <= L.attachmentsMax, message: `At most ${L.attachmentsMax} attachments` } },

    // A free label the admin pages group and filter by (for example "Admission" for a notice, "Campus" for a photo).
    category: { type: String, trim: true, maxlength: L.categoryMax },
    // Small named details for structured items (a faculty member's designation, a course's duration, a notice's audience).
    // Plain text only; the number of keys and the length of each value are capped.
    meta: {
      type: Map,
      of: { type: String, trim: true, maxlength: L.metaValueMax },
      default: undefined,
      validate: {
        validator: (m) => !m || (m.size <= L.metaKeysMax && [...m.keys()].every((k) => /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(k))),
        message: `Details can have at most ${L.metaKeysMax} simple names (letters and digits)`,
      },
    },

    // Empty = for the whole college. A department notice (written by a Head of Department) carries that department.
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    isPublic: { type: Boolean, default: true }, // false = only for people who are signed in
    isPinned: { type: Boolean, default: false }, // pinned items are listed first

    // events only
    startsAt: Date,
    endsAt: Date,
    venue: { type: String, trim: true, maxlength: 200 },

    status: { type: String, enum: WEBSITE_CONTENT_STATUS_VALUES, default: S.DRAFT, index: true },
    publishedAt: Date,
    expiresAt: Date, // after this time it is no longer shown (for example a notice about a past deadline)
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastEditedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

websiteContentSchema.index({ type: 1, slug: 1 }, { unique: true });
websiteContentSchema.index({ status: 1, isPublic: 1, type: 1, isPinned: -1, publishedAt: -1 });

websiteContentSchema.pre('validate', function checks() {
  if (!this.slug && this.title) this.slug = slugify(this.title, L.slugMax);
  if (!this.isNew && this.isModified('type')) this.invalidate('type', 'The type of content cannot be changed');
  if (this.type === T.EVENT && !this.startsAt) this.invalidate('startsAt', 'An event needs a start time');
  if (this.type !== T.EVENT && (this.startsAt || this.endsAt || this.venue)) this.invalidate('startsAt', 'Only an event has a start time, end time or venue');
  if (this.startsAt && this.endsAt && this.endsAt < this.startsAt) this.invalidate('endsAt', 'An event cannot end before it starts');
  if (this.type !== T.GALLERY && this.images && this.images.length) this.invalidate('images', 'Only a gallery has a list of pictures');
  if (this.expiresAt && this.publishedAt && this.expiresAt <= this.publishedAt) this.invalidate('expiresAt', 'The expiry must be after the publish time');
  if (this.status === S.PUBLISHED && !this.publishedAt) this.invalidate('publishedAt', 'Published content needs a publish time');
});

/** What must be there before something can go live. Returns a list of problems (empty = ready). */
websiteContentSchema.statics.problemsBeforePublish = function problemsBeforePublish(doc) {
  const problems = [];
  if (doc.type === T.GALLERY) {
    if (!doc.images || doc.images.length === 0) problems.push('A gallery needs at least one picture');
  } else if (doc.type === T.DOCUMENT) {
    if (!doc.attachments || doc.attachments.length === 0) problems.push('A document needs a file');
  } else if (WEBSITE_PROFILE_TYPES.includes(doc.type)) {
    // structured profile: the title and its details are enough
  } else if (!doc.body && !(doc.attachments && doc.attachments.length)) {
    problems.push(doc.type === T.NOTICE ? 'A notice needs text or an attachment' : 'It needs some text');
  }
  if (doc.type === T.EVENT && !doc.startsAt) problems.push('An event needs a start time');
  return problems;
};

/** The database filter for what the public website may show right now. */
websiteContentSchema.statics.visibleFilter = function visibleFilter({ now = new Date(), type, includeMembersOnly = false } = {}) {
  const filter = {
    status: S.PUBLISHED,
    publishedAt: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  };
  if (!includeMembersOnly) filter.isPublic = true;
  if (type) filter.type = type;
  return filter;
};

/** Make a new item. If the title's web address is taken, "-2", "-3" ... is added. */
websiteContentSchema.statics.createWithSlug = async function createWithSlug(data, { session } = {}) {
  const base = slugify(data.slug || data.title, L.slugMax);
  for (let n = 1; n <= 20; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    try {
      const [doc] = await this.create([{ ...data, slug }], { session });
      return doc;
    } catch (err) {
      if (err.code !== 11000 || !String((err.message || '') + JSON.stringify(err.keyPattern || {})).includes('slug')) throw err;
    }
  }
  throw new AppError('Could not find a free web address for this title', 409);
};

// Each move is one guarded update, so two people clicking at once cannot both win.
async function move(Model, id, from, set, label, { session } = {}) {
  const updated = await Model.findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: set }, { new: true, session });
  if (updated) return updated;
  const current = await Model.findById(id).session(session || null);
  if (!current) throw new AppError('Content not found', 404);
  if (current.status === set.status) return current; // already there: safe to repeat
  throw new AppError(`A ${current.status} item cannot be ${label}`, 409);
}

/** Put it on the website. Needs the content to be complete. Re-publishing keeps the first publish time unless a new one is given. */
websiteContentSchema.statics.publish = async function publish(id, { byUserId, publishAt, expiresAt, session } = {}) {
  const current = await this.findById(id).session(session || null);
  if (!current) throw new AppError('Content not found', 404);
  if (current.status === S.PUBLISHED && !publishAt) return current;
  const problems = this.problemsBeforePublish(current);
  if (problems.length) throw new AppError(problems.join('. '), 400, problems.map((message) => ({ message })));
  const when = publishAt || current.publishedAt || new Date();
  const until = expiresAt !== undefined ? expiresAt : current.expiresAt;
  if (until && until <= when) throw new AppError('The expiry must be after the publish time', 400);
  return move(this, id, [S.DRAFT, S.ARCHIVED, S.PUBLISHED], { status: S.PUBLISHED, publishedAt: when, ...(expiresAt !== undefined ? { expiresAt } : {}), lastEditedByUserId: byUserId }, 'published', { session });
};

/** Take it off the website but keep it as a draft to edit. */
websiteContentSchema.statics.unpublish = function unpublish(id, { byUserId, session } = {}) {
  return move(this, id, [S.PUBLISHED], { status: S.DRAFT, lastEditedByUserId: byUserId }, 'unpublished', { session });
};

/** Retire it: off the website, kept for the record. */
websiteContentSchema.statics.archive = function archive(id, { byUserId, session } = {}) {
  return move(this, id, [S.DRAFT, S.PUBLISHED], { status: S.ARCHIVED, lastEditedByUserId: byUserId }, 'archived', { session });
};

export default mongoose.model('WebsiteContent', websiteContentSchema);
