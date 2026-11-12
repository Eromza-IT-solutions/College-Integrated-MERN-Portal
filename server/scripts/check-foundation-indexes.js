// Real-database check for Role, Permission and AcademicYear.
// It works in a temporary database, which it deletes at the end, so your dev data is untouched.
// Run:  node scripts/check-foundation-indexes.js
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Role from '../src/models/Role.js';
import Permission from '../src/models/Permission.js';
import AcademicYear from '../src/models/AcademicYear.js';

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); };
const rejectsWithDuplicate = (p) => p.then(() => false, (e) => e && e.code === 11000);

(async () => {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const conn = mongoose.connection.useDb(`eromza_check_${Date.now()}`, { useCache: false });
  try {
    const R = conn.model('Role', Role.schema);
    const P = conn.model('Permission', Permission.schema);
    const Y = conn.model('AcademicYear', AcademicYear.schema);
    await Promise.all([R.init(), P.init(), Y.init()]); // build the indexes

    await R.create({ key: 'teacher', label: 'Teacher' });
    check('duplicate role key is rejected', await rejectsWithDuplicate(R.create({ key: 'teacher', label: 'Teacher 2' })));

    const rule = { roleKey: 'hod', resource: 'teachingPlans', action: 'approve', scope: 'department' };
    await P.create(rule);
    check('duplicate permission rule is rejected', await rejectsWithDuplicate(P.create({ ...rule, scope: 'all' })));
    check('same role + resource, different action is allowed', await P.create({ ...rule, action: 'view' }).then(() => true, () => false));

    const dates = (a, b) => ({ startDate: new Date(a), endDate: new Date(b) });
    await Y.create({ label: '2026-27', ...dates('2026-06-01', '2027-05-31'), status: 'current' });
    check('a second current academic year is rejected',
      await rejectsWithDuplicate(Y.create({ label: '2027-28', ...dates('2027-06-01', '2028-05-31'), status: 'current' })));
    check('several non-current years are allowed',
      await Y.create([{ label: '2027-28', ...dates('2027-06-01', '2028-05-31') }, { label: '2028-29', ...dates('2028-06-01', '2029-05-31') }]).then(() => true, () => false));
    check('duplicate year label is rejected', await rejectsWithDuplicate(Y.create({ label: '2026-27', ...dates('2026-06-01', '2027-05-31') })));
  } finally {
    await conn.dropDatabase().catch((e) => console.log('Could not delete the temporary database:', e.message));
    await mongoose.connection.close();
  }
  process.exitCode = results.every(Boolean) ? 0 : 1;
})().catch((err) => { console.error(err); process.exit(1); });
