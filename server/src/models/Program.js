import mongoose from 'mongoose';

// A class a student can apply for, for example "F.Y.B.Sc.(Computer Application)".
// The portal's read-only "Section" and "Class" fields come from this record, so they are not copied
// onto each application.
const programSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Program', programSchema);
