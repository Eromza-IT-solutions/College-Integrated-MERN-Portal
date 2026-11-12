// Real-database check for AuthToken, AuditLog and Teacher.
// It works in a temporary database, which it deletes at the end, so your dev data is untouched.
// Run:  node scripts/check-auth-audit-teacher.js
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import AuthToken from '../src/models/AuthToken.js';
import AuditLog from '../src/models/AuditLog.js';
import Teacher from '../src/models/Teacher.js';

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); };
const rejected = (p) => p.then(() => false, () => true);
const duplicate = (p) => p.then(() => false, (e) => e && e.code === 11000);

(async () => {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const conn = mongoose.connection.useDb(`eromza_check_${Date.now()}`, { useCache: false });
  try {
    const U = conn.model('User', User.schema);
    const D = conn.model('Department', Department.schema);
    const T = conn.model('AuthToken', AuthToken.schema);
    const A = conn.model('AuditLog', AuditLog.schema);
    const Te = conn.model('Teacher', Teacher.schema);
    await Promise.all([U.init(), D.init(), T.init(), A.init(), Te.init()]);

    const dept = await D.create({ code: 'COM', name: 'Commerce' });
    const dept2 = await D.create({ code: 'SCI', name: 'Science' });
    const teacherUser = await U.create({ fullName: 'T One', email: 't1@example.com', passwordHash: 'x', role: 'teacher', departmentId: dept._id });
    const applicant = await U.create({ fullName: 'App', email: 'a@example.com', passwordHash: 'x', role: 'applicant' });

    // ----- AuthToken
    const raw = await T.issue(teacherUser._id, 'emailVerification');
    check('token is stored as a hash, not as the raw value', !(await T.findOne({ tokenHash: raw })) && !!(await T.findOne({ tokenHash: T.hash(raw) })));
    check('a valid token works once', !!(await T.consume(raw, 'emailVerification')));
    check('the same token cannot be used twice', (await T.consume(raw, 'emailVerification')) === null);
    const raw2 = await T.issue(teacherUser._id, 'passwordReset');
    check('a token cannot be used for another purpose', (await T.consume(raw2, 'emailVerification')) === null);
    const first = await T.issue(teacherUser._id, 'passwordReset');
    const second = await T.issue(teacherUser._id, 'passwordReset');
    check('issuing a new token cancels the older one', (await T.consume(first, 'passwordReset')) === null && !!(await T.consume(second, 'passwordReset')));
    const old = await T.issue(applicant._id, 'emailVerification');
    await T.updateOne({ tokenHash: T.hash(old) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    check('an expired token is refused', (await T.consume(old, 'emailVerification')) === null);
    const ttl = (await T.collection.indexes()).find((i) => i.key && i.key.expiresAt === 1);
    check('the automatic-cleanup (TTL) index exists', !!ttl && ttl.expireAfterSeconds === 0);
    const raw3 = await T.issue(applicant._id, 'passwordReset');
    const racers = await Promise.all(Array.from({ length: 20 }, () => T.consume(raw3, 'passwordReset')));
    check('20 simultaneous uses of one token: exactly one wins', racers.filter(Boolean).length === 1);

    // ----- AuditLog
    const row = await A.record({ actorUserId: teacherUser._id, action: 'login', outcome: 'success', ip: '127.0.0.1', details: { password: 'secret1', nested: { sessionToken: 'abc' }, ok: 1 } });
    check('secrets are removed from details', row.details.password === '[removed]' && row.details.nested.sessionToken === '[removed]' && row.details.ok === 1);
    check('an audit row cannot be updated', await rejected(A.updateOne({ _id: row._id }, { $set: { action: 'x' } })));
    check('an audit row cannot be deleted', await rejected(A.deleteOne({ _id: row._id })));
    check('an audit row cannot be changed with save()', await rejected((async () => { const r = await A.findById(row._id); r.action = 'x'; await r.save(); })()));
    check('the row is still there and unchanged', (await A.findById(row._id)).action === 'login');

    // ----- Teacher
    const profile = { userId: teacherUser._id, employeeNumber: 'E-001', departmentId: dept._id, designation: 'Lecturer' };
    await Te.create(profile);
    check('duplicate profile for the same user is rejected', await duplicate(Te.create({ ...profile, employeeNumber: 'E-002' })));
    const u2 = await U.create({ fullName: 'T Two', email: 't2@example.com', passwordHash: 'x', role: 'hod', departmentId: dept._id });
    check('duplicate employee number is rejected', await duplicate(Te.create({ ...profile, userId: u2._id })));
    check('department different from the user\'s department is rejected', await rejected(Te.create({ ...profile, userId: u2._id, employeeNumber: 'E-003', departmentId: dept2._id })));
    check('an applicant cannot have a teacher profile', await rejected(Te.create({ ...profile, userId: applicant._id, employeeNumber: 'E-004' })));
    check('a valid second profile is accepted', await Te.create({ ...profile, userId: u2._id, employeeNumber: 'E-005' }).then(() => true, () => false));
  } finally {
    await conn.dropDatabase().catch((e) => console.log('Could not delete the temporary database:', e.message));
    await mongoose.connection.close();
  }
  process.exitCode = results.every(Boolean) ? 0 : 1;
})().catch((err) => { console.error(err); process.exit(1); });
