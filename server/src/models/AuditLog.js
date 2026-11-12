import mongoose from 'mongoose';
import { AUDIT_OUTCOME_VALUES } from '../utils/constants.js';

// Who did what, and how it went. Rows are only ever added: never changed, never deleted by the app.
const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // empty for anonymous events
    action: { type: String, required: true, trim: true }, // like login, roleChanged, planApproved
    entityType: { type: String, trim: true, default: null }, // the kind of record touched
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null }, // the record touched
    outcome: { type: String, required: true, enum: AUDIT_OUTCOME_VALUES },
    ip: { type: String, trim: true, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // small; never passwords, tokens or full personal data
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Append-only: block every change or delete that goes through the app.
// (Someone with direct database access can still change data; protect that with Atlas permissions.)
const blocked = () => {
  throw new Error('auditLogs are append-only: they cannot be changed or deleted');
};
auditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace',
   'deleteOne', 'deleteMany', 'findOneAndDelete'],
  { document: false, query: true },
  blocked
);
auditLogSchema.pre('deleteOne', { document: true, query: false }, blocked);
auditLogSchema.pre('save', function onlyNew() {
  if (!this.isNew) blocked();
});

// Keys that must never be written to the log, at any depth.
const SECRET_KEYS = /pass(word)?|token|secret|authorization|cookie|otp/i;
function stripSecrets(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => stripSecrets(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SECRET_KEYS.test(k) ? '[removed]' : stripSecrets(v, depth + 1);
  }
  return out;
}

/**
 * Write one audit row.
 *   await AuditLog.record({ actorUserId, action: 'roleChanged', entityType: 'user',
 *                           entityId, outcome: 'success', ip, details: { from: 'teacher', to: 'hod' } });
 * Secret-looking keys in `details` are replaced with "[removed]". It throws if the write fails,
 * so the caller decides whether the action may continue.
 */
auditLogSchema.statics.record = function record({ details, ...fields }, { session } = {}) {
  return this.create([{ ...fields, details: stripSecrets(details || {}) }], { session }).then((docs) => docs[0]);
};

export default mongoose.model('AuditLog', auditLogSchema);
