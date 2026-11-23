// DEV ONLY - lets you test Timetable / Attendance / Marks with the Science demo teacher.
// The sample timetable (F.Y.B.Com, room SAMPLE-101) belongs to teacher.com@demo.example.
// This moves those sample lectures to teacher.sci@demo.example.
//
//   node scripts/dev-assign-slots-to-sci-teacher.js                 -> give the sample lectures to the Science teacher
//   node scripts/dev-assign-slots-to-sci-teacher.js --approve-marks -> also approve all "submitted" marks (use when you have no HOD login)
//   node scripts/dev-assign-slots-to-sci-teacher.js --back          -> give them back to the Commerce teacher
//   node scripts/dev-assign-slots-to-sci-teacher.js --reset         -> delete old sample lectures (then run: npm run seed:timetable, and run this script again)
// Every run (except --reset) also enrols the Demo Student in the sample lectures' subjects, so the attendance list is not empty.
// Safe to run again. Refused in production.
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import '../src/models/index.js';
import User from '../src/models/User.js';
import Timetable from '../src/models/Timetable.js';
import Marks from '../src/models/Marks.js';
import Student from '../src/models/Student.js';
import Enrollment from '../src/models/Enrollment.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to run when NODE_ENV=production');
const args = process.argv.slice(2);

await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
try {
  if (args.includes('--reset')) {
    const del = await Timetable.collection.deleteMany({ room: 'SAMPLE-101' });
    console.log(`Deleted ${del.deletedCount} old sample lecture(s). Now run: npm run seed:timetable   then   node scripts/dev-assign-slots-to-sci-teacher.js`);
    process.exit(0);
  }
  const sci = await User.findOne({ email: 'teacher.sci@demo.example' });
  const com = await User.findOne({ email: 'teacher.com@demo.example' });
  if (!sci || !com) throw new Error('Demo teachers not found. Run: npm run seed');

  const to = args.includes('--back') ? com : sci;
  const res = await Timetable.collection.updateMany({ room: 'SAMPLE-101' }, { $set: { teacherUserId: to._id } });
  if (!res.matchedCount) throw new Error('No sample timetable found. Run: npm run seed:timetable');
  console.log(`${res.matchedCount} sample lecture(s) now belong to ${to.email}`);

  // Enrol the demo student in every sample lecture's subject (same semester and academic year as the lecture)
  const stuUser = await User.findOne({ email: 'student@demo.example' });
  const student = stuUser && await Student.findOne({ userId: stuUser._id });
  if (student) {
    const slots = await Timetable.find({ room: 'SAMPLE-101' }).lean();
    for (const sl of slots) {
      await Enrollment.updateOne(
        { studentId: student._id, subjectId: sl.subjectId, semester: sl.semester },
        { $setOnInsert: { academicYearId: sl.academicYearId, status: 'enrolled' } },
        { upsert: true },
      );
    }
    console.log(`Demo student enrolled in ${slots.length} lecture subject(s).`);
  } else {
    console.log('No demo student record found (run: npm run seed:demo-student), so the attendance list will stay empty.');
  }

  if (args.includes('--approve-marks')) {
    const m = await Marks.collection.updateMany({ status: 'submitted' }, { $set: { status: 'approved' } });
    console.log(`Approved ${m.matchedCount} submitted marks row(s).`);
  }
} finally {
  await mongoose.connection.close();
}
