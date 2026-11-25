# Data retention policy

Status: one-pager for college approval. Only the `AuthToken` TTL is automated today; the other periods are proposed operational rules and require an approved cleanup job before they are enforced.

## Rules

| Data | Retention | Trigger | Action after expiry | Status |
| --- | --- | --- | --- | --- |
| `AuthToken` (email verification, password reset) | 24 h verification / 30 min reset | `expiresAt` | MongoDB TTL index deletes automatically | Implemented |
| `AuditLog` | 1 year | `createdAt` | Export to the college's secure archive, then delete by administrator with a logged change ticket | Proposed - purge/archive owner and target date are unassigned; this blocks production go-live |
| `User` accounts | 7 years after last login or deactivation | `lastLoginAt` / `status` | Deactivate, anonymise name/mobile/Aadhaar last4, then delete after the audit window | Proposed |
| `Application` (rejected, cancelled, waitlisted, draft) | 1 academic year after final decision or last edit | `updatedAt` | Delete the application and its `AdmissionDocument` files | Proposed |
| `Application` (admitted) and `Student` | 10 years after graduation/withdrawal | `admittedAt` / `Student.status` | Archive student record; delete linked application documents after archive verification | Proposed |
| `Enrollment`, `Marks`, `Result`, `ExamForm`, `HallTicket` | Same as the student record (10 years after leaving) | `Student.status` | Archive with the student record | Proposed |
| `Payment`, `Refund` | 7 years from `createdAt` | `createdAt` | Export financial report, then delete from the live database | Proposed |
| `AdmissionDocument` files | Same as the parent application | Application retention | Delete from file store and remove the metadata row together | Proposed |
| `WebsiteContent` drafts/archived items | 90 days for drafts, 1 year for archived | `status`, `updatedAt` | Delete; published notices expire through `expiresAt` and are archived after 30 days | Proposed |
| Database backups | 30 daily + 12 monthly | Backup timestamp | Delete older backups after a successful restore test | Proposed |

## Rules that apply to everything

- Retention runs from the last meaningful event, not from the record's creation date when a later decision exists.
- Deletion must include copies in backups before the backup retention window closes. A record removed today can still exist in a backup for up to 30 days.
- Deleting or anonymising a record must not break a financial or audit obligation. When periods conflict, the longest period wins.
- `auditlogs` is append-only in the application. Deletion is an administrator operation performed under a change ticket, never through the API.
- `FIELD_ENCRYPTION_KEY` must be retained for as long as encrypted backups exist. Destroying the key early makes those backups unrecoverable.
- Records under a legal hold, dispute, or investigation are not deleted until the hold is lifted.

## Personal data named in the privacy notice

The privacy notice and this policy cover all of the following, not just Aadhaar and date of birth:

- Identity/contact: `User.email`, `User.mobile`, `User.aadhaarLast4`, `Teacher.phone`, `Application.student.email`, `Application.parent.email`, mobile numbers and Aadhaar values stored as described in `docs/pii-storage.md`.
- Location: `Application.student.address.*` and `Application.parent.address.*` (line1, line2, country, pincode, state, district, taluka, location).
- Academic snapshots copied into other records: names, enrollment numbers and contact details on `ExamForm.details`, `HallTicket`, `Result` and related records. `Attendance` stores only `studentId` plus attendance status; it does not copy PII.
- Technical: IP addresses in `AuditLog` and login attempt counters.

Encrypted Aadhaar/mobile/date-of-birth fields are described in `docs/pii-storage.md`; the plaintext exceptions and blind index are named there too.

## Open owners and dates

- `AuditLog` purge/archive job: **owner unassigned, target date unassigned**. This is an explicit go-live blocker; assign a named owner and a date before enabling production writes.
- `FIELD_ENCRYPTION_KEY` second copy: **named custodian unassigned**. Assign before real data is loaded; see `docs/pii-storage.md`.

## Implementation note

MongoDB's TTL index on `AuthToken.expiresAt` is the only automatic deletion currently implemented. The other rows in the table need a scheduled, audited cleanup job with dry-run counts and a verified backup; do not run ad-hoc deletes against production.
