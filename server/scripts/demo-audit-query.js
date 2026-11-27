// Shows how the audit-log filters are checked. No database or server needed.
// Run:  node scripts/demo-audit-query.js
import { parseAuditQuery } from '../src/modules/admin/super/auditLogs.query.js';

function tryIt(label, query) {
  console.log(label);
  console.log('  query :', JSON.stringify(query));
  try {
    const { page, limit, filter } = parseAuditQuery(query);
    console.log(`  OK    : page ${page}, ${limit} per page`);
    console.log('  filter:', JSON.stringify(filter));
  } catch (err) {
    console.log(`  REJECTED (${err.statusCode}):`, err.message);
    for (const e of err.errors) console.log(`    - ${e.field}: ${e.message}`);
  }
  console.log();
}

tryIt('1) no filters (defaults)', {});
tryIt('2) page 2, 10 per page, one action', { page: '2', limit: '10', action: 'refundRequested' });
tryIt('3) a date range', { from: '2026-11-01', to: '2026-11-30' });
tryIt('4) limit above 100', { limit: '500' });
tryIt('5) query-operator injection attempt (?action[$ne]=x)', { action: { $ne: 'x' } });
tryIt('6) not a valid id', { actorUserId: '123' });
tryIt('7) unknown outcome and from after to', { outcome: 'maybe', from: '2026-12-01', to: '2026-11-01' });
