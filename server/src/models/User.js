import mongoose from 'mongoose';
import { parseLoginId, hashAadhaar } from '../utils/loginId.js';
import {
  ROLE_VALUES,
  USER_STATUS,
  USER_STATUS_VALUES,
  DEPARTMENT_ROLES,
} from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional second and third ways to sign in. Both are unique when present.
    mobile: { type: String, trim: true, match: [/^\d{10}$/, 'Mobile number must be 10 digits'] },
    // Keyed hash of the Aadhaar number, used only to find the person who signs in with it. Never returned by queries.
    aadhaarHash: { type: String, select: false },
    aadhaarLast4: { type: String, match: [/^\d{4}$/, 'Last 4 digits only'] }, // to show "XXXX XXXX 1234"
    // Argon2id or bcrypt hash only. Never returned by queries unless asked for explicitly.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ROLE_VALUES },
    // Required for teachers and HODs; empty for applicants and college-wide admins.
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      required: [
        function () {
          return DEPARTMENT_ROLES.includes(this.role);
        },
        'A department is required for teachers and HODs',
      ],
    },
    status: { type: String, required: true, enum: USER_STATUS_VALUES, default: USER_STATUS.PENDING },
    emailVerifiedAt: { type: Date, default: null },
    failedLoginCount: { type: Number, required: true, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

// email is already unique through the field definition above.
userSchema.index({ role: 1, departmentId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { mobile: { $type: 'string' } } });
userSchema.index({ aadhaarHash: 1 }, { unique: true, partialFilterExpression: { aadhaarHash: { $type: 'string' } } });

/** Save an Aadhaar number for sign-in: stores only its hash and the last 4 digits. */
userSchema.methods.setAadhaar = function setAadhaar(number) {
  const digits = String(number).replace(/\D/g, '');
  this.aadhaarHash = hashAadhaar(digits);
  this.aadhaarLast4 = digits.slice(-4);
};

/**
 * Find the user for the sign-in box: the text may be an email, a 10-digit mobile number or a 12-digit Aadhaar number.
 * Returns a query (with the password hash included) or null when the text looks like none of the three.
 * The caller must answer "no such user" and "wrong password" with the SAME message, and limit attempts.
 */
userSchema.statics.findByLoginId = function findByLoginId(input) {
  const id = parseLoginId(input);
  if (!id) return null;
  let filter;
  if (id.type === 'email') filter = { email: id.value };
  else if (id.type === 'mobile') filter = { mobile: id.value };
  else filter = { aadhaarHash: hashAadhaar(id.value) };
  return this.findOne(filter).select('+passwordHash');
};


// Safety net: never send the hash out in JSON responses.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.aadhaarHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
