// Real-database check for the audit-log search (filters, paging, newest first, names).
// It works in a temporary database, which it deletes at the end, so your dev data is untouched.
// Run:  node scripts/check-audit-logs.js
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';
import { searchAuditLogs } from '../src/modules/admin/super/auditLogs.service.js';

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); };
const rejected = (p) => p.then(() => false, () => true);
const DAY = 24 * 60 * 60 * 1000;

(async () => {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const conn = mongoose.connection.useDb(`eromza_check_${Date.now()}`, { useCache: false });
  try {
    const U = conn.model('User', User.schema);
    const A = conn.model('AuditLog', AuditLog.schema);
    await Promise.all([U.init(), A.init()]);
    const search = (query) => searchAuditLogs(query, A);

    const user = (fullName, email, role) => U.create({ fullName, email, passwordHash: 'x', role });
    const asha = await user('Asha Admission', 'asha@example.com', 'admissionAdmin');
    const sam = await user('Sam Super', 'sam@example.com', 'superAdmin');

    // Saved in this order, so "newest first" is the reverse.
    const refundId = new mongoose.Types.ObjectId();
    const refund = { entityType: 'refund', outcome: 'success', ip: '10.0.0.5' };
    await A.record({
      ...refund, actorUserId: asha._id, action: 'refundRequested', entityId: refundId,
      details: { amountPaise: 50000, apiToken: 'abc' },
    });
    await A.record({
      ...refund, actorUserId: sam._id, action: 'refundDecided', entityId: refundId, details: { approved: true },
    });
    await A.record({
      actorUserId: sam._id, action: 'permissionDenied', entityType: 'admissionRefunds', outcome: 'denied',
    });
    await A.record({ action: 'paymentWebhookReceived', entityType: 'payment', outcome: 'success' }); // no user
    await A.record({
      ...refund, actorUserId: asha._id, action: 'refundRequested', entityId: new mongoose.Types.ObjectId(),
    });

    const all = await search({});
    const order = all.rows.map((r) => r.action).join();
    const expected = 'refundRequested,paymentWebhookReceived,permissionDenied,refundDecided,refundRequested';
    check('5 rows saved, newest first', all.total === 5 && order === expected);
    check('filter by action', (await search({ action: 'refundRequested' })).total === 2);
    check('filter by record id', (await search({ entityId: refundId.toString() })).total === 2);
    check('filter by user', (await search({ actorUserId: asha._id.toString() })).total === 2);

    const denied = await search({ outcome: 'denied' });
    check('filter by outcome', denied.total === 1 && denied.rows[0].action === 'permissionDenied');

    const page2 = await search({ page: '2', limit: '2' });
    const firstOnPage2 = page2.rows[0].action;
    check('page 2 of 2 rows each', page2.rows.length === 2 && page2.total === 5 && firstOnPage2 === 'permissionDenied');

    const decided = (await search({ action: 'refundDecided' })).rows[0];
    check('the user name is filled in', decided.actorUserId.fullName === 'Sam Super');
    check('the password hash is never loaded', !('passwordHash' in decided.actorUserId));

    const webhook = (await search({ action: 'paymentWebhookReceived' })).rows[0];
    check('a webhook row has no user', webhook.actorUserId === null);

    const requested = (await search({ entityId: refundId.toString(), action: 'refundRequested' })).rows[0];
    const { apiToken, amountPaise } = requested.details;
    check('secrets were removed from details', apiToken === '[removed]' && amountPaise === 50000);

    const tomorrow = new Date(Date.now() + DAY).toISOString();
    const none = await search({ from: tomorrow });
    const everything = await search({ to: tomorrow });
    check('date range: from tomorrow finds none, to tomorrow finds all', none.total === 0 && everything.total === 5);

    check('bad input is rejected before the database', await rejected(search({ limit: '500' })));
  } finally {
    await conn.dropDatabase().catch((e) => console.log('Could not delete the temporary database:', e.message));
    await mongoose.connection.close();
  }
  process.exitCode = results.every(Boolean) ? 0 : 1;
})().catch((err) => { console.error(err); process.exit(1); });
