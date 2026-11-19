// Loads every model once, so each one is registered with Mongoose.
// Some models look up others by name while running (for example a payment needs the Counter to number its receipt).
// That works only if those models were loaded, so the server loads them all at start-up (see app.js) and scripts can do
// import '../src/models/index.js'. When you add a model file, add it here too; tests/models-index.test.js fails if one is missing.
import './AcademicYear.js';
import './AdmissionDocument.js';
import './Application.js';
import './Attendance.js';
import './AuditLog.js';
import './AuthToken.js';
import './Counter.js';
import './Department.js';
import './Enrollment.js';
import './Exam.js';
import './ExamForm.js';
import './FeeStructure.js';
import './Marks.js';
import './Payment.js';
import './Permission.js';
import './Program.js';
import './Refund.js';
import './Result.js';
import './Role.js';
import './Student.js';
import './Subject.js';
import './Teacher.js';
import './TeachingPlan.js';
import './Timetable.js';
import './User.js';
import './WebsiteContent.js';
