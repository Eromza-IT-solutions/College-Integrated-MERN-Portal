import mongoose from 'mongoose';
import { DEPARTMENT_ROLES, TEACHER_STATUS, TEACHER_STATUS_VALUES } from '../utils/constants.js';

// Staff profile of a teacher or HOD. Login details stay in users; this holds the staff details.
const teacherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeNumber: { type: String, required: true, unique: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    designation: { type: String, required: true, trim: true },
    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^[0-9+\-\s]{7,15}$/, 'Phone number looks invalid'],
    },
    joiningDate: { type: Date, default: null },
    status: { type: String, required: true, enum: TEACHER_STATUS_VALUES, default: TEACHER_STATUS.ACTIVE },
  },
  { timestamps: true }
);

teacherSchema.index({ departmentId: 1 });

// The profile must belong to a teacher or HOD user, in the same department as the profile.
teacherSchema.pre('validate', async function checkUser() {
  if (!this.isNew && !this.isModified('userId') && !this.isModified('departmentId')) return;

  const User = this.constructor.db.model('User');
  const user = await User.findById(this.userId).select('role departmentId').lean();

  if (!user) {
    this.invalidate('userId', 'User not found');
  } else if (!DEPARTMENT_ROLES.includes(user.role)) {
    this.invalidate('userId', 'The user must have the teacher or hod role');
  } else if (!user.departmentId || String(user.departmentId) !== String(this.departmentId)) {
    this.invalidate('departmentId', "Department must match the user's department");
  }
});

export default mongoose.model('Teacher', teacherSchema);
