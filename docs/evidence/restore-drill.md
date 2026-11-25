# Restore drill

- Generated: 2026-11-22T16:06:35.539Z
- Two temporary local single-node MongoDB replica sets were used. No real database was touched.
- Source was seeded with 1183 documents, had PII encrypted with the scratch key, and had all model indexes synchronised.
- Backup: `mongodump`, restore: `mongorestore --drop`. Backup files stayed under `C:\Users\Dell\AppData\Local\Temp\opencode\restore-drill-backup`.
- Key restore: a 32-byte scratch key was written to a separate local escrow file, removed from the deployment environment, then restored by `check-field-encryption-key.js` to decrypt a row in the restored database. Only the key fingerprint is recorded.
- Snapshot comparison: **PASS**.

## Tool version

```text
mongodump version: 100.14.0
git version: d909d040daa15cc1356071e835e4bac31a96dce3
Go version: go1.24.0
   os: windows
   arch: amd64
   compiler: gc
```

## Collection, count, index and sample comparison

```text
PASS: collection list (27 collections)
PASS: academicyears (2 documents, 3 indexes)
PASS: admissiondocuments (0 documents, 3 indexes)
PASS: applications (220 documents, 10 indexes)
PASS: attendances (0 documents, 6 indexes)
PASS: auditlogs (130 documents, 6 indexes)
PASS: authtokens (0 documents, 4 indexes)
PASS: counters (1 documents, 1 indexes)
PASS: departments (1 documents, 2 indexes)
PASS: enrollments (320 documents, 3 indexes)
PASS: examforms (50 documents, 5 indexes)
PASS: exams (1 documents, 3 indexes)
PASS: feestructures (2 documents, 2 indexes)
PASS: halltickets (0 documents, 6 indexes)
PASS: marks (0 documents, 6 indexes)
PASS: payments (220 documents, 12 indexes)
PASS: permissions (0 documents, 2 indexes)
PASS: programs (1 documents, 5 indexes)
PASS: refunds (220 documents, 3 indexes)
PASS: results (0 documents, 6 indexes)
PASS: roles (0 documents, 2 indexes)
PASS: students (0 documents, 6 indexes)
PASS: subjects (12 documents, 3 indexes)
PASS: teachers (0 documents, 4 indexes)
PASS: teachingplans (0 documents, 5 indexes)
PASS: timetables (0 documents, 5 indexes)
PASS: users (3 documents, 6 indexes)
PASS: websitecontents (0 documents, 7 indexes)
```

## Command output

### keyBackup (exit 0)

```text
Wrote a 32-byte key escrow copy to C:\Users\Dell\AppData\Local\Temp\opencode\restore-drill-backup\field-encryption-key.escrow; the key value is not recorded in evidence.
```

### seed (exit 0)

```text
Scratch database: migration_dryrun
Seeded applications=220 payments=220 examForms=50 enrollments=320 refunds=220 auditLogs=130
Expected findings: 6 duplicate active groups; 12 payment backfills; 8 payment/link mismatches; 120 refund backfills; 60 unresolved refunds; 2 years to seed
```

### encryptPii (exit 0)

```text
Mode: APPLY
Current encryption key ID: v1

applications: 220 total, 220 with plaintext personal data
  aadhaarNumber: 220 plaintext value(s)
  student.mobile: 220 plaintext value(s)
  student.birthDate: 220 plaintext value(s)
  parent.fatherMobile: 0 plaintext value(s)
  parent.motherMobile: 0 plaintext value(s)
  blind indexes: 220 document(s) needing an update
After APPLY: 0 document(s) with plaintext personal data
After APPLY: 0 document(s) needing a blind-index update

examforms: 50 total, 50 with plaintext personal data
  details.mobile: 50 plaintext value(s)
  blind indexes: 0 document(s) needing an update
After APPLY: 0 document(s) with plaintext personal data
After APPLY: 0 document(s) needing a blind-index update
```

### indexes (exit 0)

```text
AcademicYear: 0 index definition(s) synchronised
AdmissionDocument: 0 index definition(s) synchronised
Application: 0 index definition(s) synchronised
Attendance: 0 index definition(s) synchronised
AuditLog: 0 index definition(s) synchronised
AuthToken: 0 index definition(s) synchronised
Counter: 0 index definition(s) synchronised
Department: 0 index definition(s) synchronised
Enrollment: 0 index definition(s) synchronised
Exam: 0 index definition(s) synchronised
ExamForm: 0 index definition(s) synchronised
FeeStructure: 0 index definition(s) synchronised
HallTicket: 0 index definition(s) synchronised
Marks: 0 index definition(s) synchronised
Payment: 0 index definition(s) synchronised
Permission: 0 index definition(s) synchronised
Program: 0 index definition(s) synchronised
Refund: 0 index definition(s) synchronised
Result: 0 index definition(s) synchronised
Role: 0 index definition(s) synchronised
Student: 0 index definition(s) synchronised
Subject: 0 index definition(s) synchronised
Teacher: 0 index definition(s) synchronised
TeachingPlan: 0 index definition(s) synchronised
Timetable: 0 index definition(s) synchronised
User: 0 index definition(s) synchronised
WebsiteContent: 0 index definition(s) synchronised
```

### dump (exit 0)

```text
(no output)
```

### restore (exit 0)

```text
(no output)
```

### keyRestore (exit 0)

```text
KEY_RESTORE keyId=v1 fingerprint=c948faa4d3613332 decrypt=PASS
```

## check-* scripts against the restored database

### check-foundation-indexes.js (exit 0)

```text
PASS: duplicate role key is rejected
PASS: duplicate permission rule is rejected
PASS: same role + resource, different action is allowed
PASS: a second current academic year is rejected
PASS: several non-current years are allowed
PASS: duplicate year label is rejected
```

### check-audit-logs.js (exit 0)

```text
PASS: 5 rows saved, newest first
PASS: filter by action
PASS: filter by record id
PASS: filter by user
PASS: filter by outcome
PASS: page 2 of 2 rows each
PASS: the user name is filled in
PASS: the password hash is never loaded
PASS: a webhook row has no user
PASS: secrets were removed from details
PASS: date range: from tomorrow finds none, to tomorrow finds all
PASS: bad input is rejected before the database
```

### check-auth-audit-teacher.js (exit 0)

```text
PASS: token is stored as a hash, not as the raw value
PASS: a valid token works once
PASS: the same token cannot be used twice
PASS: a token cannot be used for another purpose
PASS: issuing a new token cancels the older one
PASS: an expired token is refused
PASS: the automatic-cleanup (TTL) index exists
PASS: 20 simultaneous uses of one token: exactly one wins
PASS: secrets are removed from details
PASS: an audit row cannot be updated
PASS: an audit row cannot be deleted
PASS: an audit row cannot be changed with save()
PASS: the row is still there and unchanged
PASS: duplicate profile for the same user is rejected
PASS: duplicate employee number is rejected
PASS: department different from the user's department is rejected
PASS: an applicant cannot have a teacher profile
PASS: a valid second profile is accepted
```

### check-counter.js (exit 0)

```text
PASS: 100 requests gave 100 different numbers (1..100)
```

### check-result-models.js (exit 0)

```text
PASS  a sheet opens with one empty line per ticked subject
PASS  opening again returns the same sheet
PASS  only one result per student per exam
PASS  an unfinished result cannot be published
PASS  totals, outcome, SGPA and final grade are saved
PASS  each subject has its letter grade and earns its credits
PASS  a student sees nothing before publishing
PASS  a finished result publishes
PASS  the student sees it after publishing
PASS  CGPA is worked out from published results
PASS  a published result cannot be edited
PASS  unpublishing needs a reason and hides the result again
PASS  the student no longer sees it
PASS  publishing a whole exam publishes the finished results
```

### check-payments-api.js (exit 0)

```text
PASS: order created, amount from the fee structure, saved in the database
PASS: pressing Pay again reuses the order (one payment row)
PASS: wrong signature: 400 and still unpaid
PASS: 4 simultaneous confirmations: all answered 200
PASS: ...and the payment is paid with ONE receipt number
PASS: receipt endpoint
PASS: list: the applicant sees their own payment (id filter works in MongoDB)
PASS: list: another applicant sees nothing
PASS: webhook delivered again later: 200 duplicate
PASS: two refunds at once: one accepted (201), one refused (409), never above the amount paid
PASS: the admission admin cannot approve (403)
PASS: super admin approves; the gateway refund id comes back
PASS: a decided refund cannot be decided again (409)
PASS: audit log has: paymentOrderCreated, paymentVerificationFailed, paymentVerified, paymentWebhookReceived, refundRequested, refundDecided, permissionDenied
PASS: the refund audit row carries the gateway refund id
```

### check-academics-api.js (exit 0)

```text
PASS: no login => 401
PASS: HOD adds a slot (201)
PASS: other department's HOD is refused (403)
PASS: same teacher + same period again => 409
PASS: student sees the class timetable (2 slots)
PASS: attendance taken: 1 present, 1 absent (left out => absent)
PASS: correction => 200, corrected: true
PASS: student summary: 100%
PASS: student cannot mark attendance (403)
PASS: marks: 1 saved, 1 failed (25 > 20)
PASS: submit for approval
PASS: student cannot see unapproved marks
PASS: other department's HOD decides nothing
PASS: own HOD approves
PASS: student now sees the approved mark
PASS: result sheet opened (201)
PASS: half-filled result cannot be published (409)
PASS: student sees nothing before publish
PASS: publish works
PASS: student sees the result after publish
PASS: unpublish needs a reason (400)
PASS: audit log has: timetableSlotCreated, attendanceMarked, attendanceCorrected, marksEntered, marksSubmitted, marksApproved, resultSheetOpened, resultMarksEntered, resultPublished
```
