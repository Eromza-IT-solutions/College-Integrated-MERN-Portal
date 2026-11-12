const mongoose = require('mongoose');
const {
  ROLE_VALUES,
  USER_STATUS,
  USER_STATUS_VALUES,
  DEPARTMENT_ROLES,
} = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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

// Safety net: never send the hash out in JSON responses.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
