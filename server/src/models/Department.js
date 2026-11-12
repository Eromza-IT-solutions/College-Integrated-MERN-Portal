const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    // The department's HOD (proposed default: one HOD per department, stored here).
    hodUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Deactivate, never delete: other records point to departments.
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
