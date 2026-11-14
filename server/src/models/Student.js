import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { STUDENT_STATUS, STUDENT_STATUS_VALUES, ROLES, APPLICATION_STATUS, ENROLLMENT_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;

// An admitted student. Created when the Admission Admin approves an application.
// Personal details stay in the application (applicationId); this record holds what the college keeps going forward.
const studentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    admissionYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    enrollmentNumber: { type: String, required: true, trim: true, unique: true },
    currentSemester: { type: Number, required: true, default: 1, min: 1, max: 12 },
    // The class division (like A or B) used by the timetable and attendance. Everyone starts in division A.
    division: { type: String, trim: true, uppercase: true, default: 'A', maxlength: 3 },
    // The group choices made at admission (kept as text, like the form).
    groups: { mainGroup: String, majorGroup: String, minorGroup: String },
    status: { type: String, enum: STUDENT_STATUS_VALUES, default: STUDENT_STATUS.ACTIVE, index: true },
    admittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/**
 * Turn an approved application into a student:
 *  - the applicant's account becomes a student account and gets the mobile number and Aadhaar for sign-in,
 *  - a student record with an enrollment number is created,
 *  - semester-1 subjects that match the admission choices are enrolled; names that match no Subject are returned in `unmatched`.
 * Pass { session } to run inside a transaction.
 */
studentSchema.statics.createFromApplication = async function createFromApplication(applicationId, { session } = {}) {
  const db = this.db;
  const Application = db.model('Application');
  const User = db.model('User');
  const Subject = db.model('Subject');
  const Enrollment = db.model('Enrollment');
  const Counter = db.model('Counter');
  const AcademicYear = db.model('AcademicYear');
  const s = session || null;

  const application = await Application.findById(applicationId).select('+aadhaarNumber').session(s);
  if (!application) throw new AppError('Application not found', 404);
  if (application.status !== APPLICATION_STATUS.APPROVED) throw new AppError('Only an approved application can become a student', 409);
  if (await this.findOne({ applicationId }).session(s)) throw new AppError('This application already has a student record', 409);

  const user = await User.findById(application.applicantUserId).session(s);
  if (!user) throw new AppError('The applicant account was not found', 404);
  const year = await AcademicYear.findById(application.academicYearId).session(s);
  if (!year) throw new AppError('Academic year not found', 404);

  const seq = await Counter.next(`enrollment:${year.label}`, { session });
  const enrollmentNumber = Counter.format({ prefix: 'ENR', yearLabel: year.label, seq });

  user.role = ROLES.STUDENT;
  if (application.student && application.student.mobile) user.mobile = application.student.mobile;
  if (application.aadhaarNumber) user.setAadhaar(application.aadhaarNumber);
  await user.save({ session });

  const sub = application.subjects || {};
  const [student] = await this.create(
    [{
      userId: user._id,
      applicationId: application._id,
      programId: application.programId,
      admissionYearId: application.academicYearId,
      enrollmentNumber,
      currentSemester: 1,
      groups: { mainGroup: sub.mainGroup, majorGroup: sub.majorGroup, minorGroup: sub.minorGroup },
    }],
    { session }
  );

  // Match the subjects chosen on the admission form (typed as text) with the Subject list of semester 1.
  const wanted = [];
  const nep = (sub.nep && (sub.nep.toObject ? sub.nep.toObject() : sub.nep)) || {};
  for (const [category, names] of Object.entries(nep)) for (const name of names || []) wanted.push({ category, name: String(name).trim() });
  const available = await Subject.find({ programId: application.programId, semester: 1, isActive: true }).session(s);
  const norm = (t) => String(t).trim().toLowerCase();
  const matched = [];
  const unmatched = [];
  for (const w of wanted) {
    const found = available.find((x) => x.category === w.category && (norm(x.name) === norm(w.name) || norm(x.code) === norm(w.name)));
    if (found && !matched.some((m) => String(m._id) === String(found._id))) matched.push(found);
    else if (!found) unmatched.push(w);
  }
  if (matched.length) {
    await Enrollment.insertMany(
      matched.map((x) => ({ studentId: student._id, subjectId: x._id, semester: 1, academicYearId: application.academicYearId, status: ENROLLMENT_STATUS.ENROLLED })),
      { session }
    );
  }
  return { student, enrolled: matched.length, unmatched };
};

export default mongoose.model('Student', studentSchema);
