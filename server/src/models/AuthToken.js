import crypto from 'crypto';
import mongoose from 'mongoose';
import { AUTH_TOKEN_PURPOSE_VALUES, AUTH_TOKEN_TTL_MS } from '../utils/constants.js';

// Links sent by email: verify an email address, or reset a password.
// Only a HASH of the token is stored. The real token exists only in the email link.
const authTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, required: true, enum: AUTH_TOKEN_PURPOSE_VALUES },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

authTokenSchema.index({ userId: 1, purpose: 1 });
// MongoDB deletes the document shortly after expiresAt (the cleanup runs about once a minute).
// consume() also checks the time itself, so an expired link never works in the meantime.
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

authTokenSchema.statics.hash = function hash(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
};

/**
 * Create a link token. Returns the RAW token: put it in the email link, and never store or log it.
 * Any earlier unused token of the same kind for this user stops working, so only the newest link is valid.
 */
authTokenSchema.statics.issue = async function issue(userId, purpose, { session } = {}) {
  const ttl = AUTH_TOKEN_TTL_MS[purpose];
  if (!ttl) throw new Error(`Unknown token purpose: ${purpose}`);

  const now = new Date();
  await this.updateMany({ userId, purpose, usedAt: null }, { $set: { usedAt: now } }, { session });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await this.create(
    [{ userId, purpose, tokenHash: this.hash(rawToken), expiresAt: new Date(now.getTime() + ttl) }],
    { session }
  );
  return rawToken;
};

/**
 * Use a token. Returns the token document if it was valid, or null if it is wrong, expired or already used.
 * The check and the "mark as used" happen in one step, so a link can never be used twice,
 * even if it is clicked twice at the same moment.
 */
authTokenSchema.statics.consume = async function consume(rawToken, purpose, { session } = {}) {
  if (!rawToken) return null;
  const now = new Date();
  return this.findOneAndUpdate(
    { tokenHash: this.hash(rawToken), purpose, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { new: true, session }
  );
};

export default mongoose.model('AuthToken', authTokenSchema);
