# Query performance check

- Generated: 2026-11-22T16:08:48.722Z
- Target: local scratch MongoDB created by `mongodb-memory-server`; no real database was used.
- Seeded 3000 rows into each of applications, payments and auditlogs, then ran `syncIndexes()`.
- Indexed collections checked: applications, payments, auditlogs.

## explain("executionStats") results

### applications staff list: PASS

- Filter: `{"status":"draft"}`
- Sort: `{"createdAt":-1}`
- Expected index: `application_status_created`; used index: `application_status_created`; collection scan: `false`
- Keys examined: 120; documents examined: 20

### applications owner list: PASS

- Filter: `{"applicantUserId":"6b03138faf97279fd1c5e010"}`
- Sort: `{"createdAt":-1}`
- Expected index: `application_owner_created`; used index: `application_owner_created`; collection scan: `false`
- Keys examined: 120; documents examined: 20

### payments filtered list: PASS

- Filter: `{"purpose":"admission","status":"paid"}`
- Sort: `{"createdAt":-1,"_id":-1}`
- Expected index: `payment_purpose_status_created`; used index: `payment_purpose_status_created`; collection scan: `false`
- Keys examined: 120; documents examined: 20

### audit logs list: PASS

- Filter: `{"entityType":"payment"}`
- Sort: `{"createdAt":-1,"_id":-1}`
- Expected index: `audit_entity_created`; used index: `audit_entity_created`; collection scan: `false`
- Keys examined: 120; documents examined: 20

Overall: **PASS**.
