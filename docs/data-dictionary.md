# Data dictionary

This document describes the stored fields of every Mongoose model. Relationships, state machines and cross-collection invariants are in `docs/db-model-map.md`; encryption decisions are in `docs/pii-storage.md`. Field names use the exact MongoDB paths. Nested paths are shown with dots.

Types are MongoDB/Mongoose types: `ObjectId`, `String`, `Number`, `Boolean`, `Date`, `Array`, `Mixed`, `Embedded`. All models include `createdAt`/`updatedAt` unless noted.

## Identity and access

### `User`

| Field | Type | Notes |
| --- | --- | --- |
| `fullName` | String | Required. |
| `email` | String | Required, unique, lower-case login identity. |
| `mobile` | String | Plaintext unique login lookup (documented exception). |
| `aadhaarHash` | String | Keyed hash, `select: false`; never stores the full number. |
| `aadhaarLast4` | String | Last four digits for display as `XXXX XXXX 1234`. |
| `passwordHash` | String | Required, `select: false`. |
| `role` | String | One of the fixed roles listed in `docs/db-model-map.md`. |
| `departmentId` | ObjectId -> Department | Null for applicants and cross-department roles. |
| `status` | String | `pending`, `active`, `locked`, `inactive` (see `USER_STATUS`). |
| `emailVerifiedAt` | Date | Null until the verification link is used. |
| `failedLoginCount` | Number | Counter for lockout. |
| `lockedUntil` | Date | Null when not locked. |
| `lastLoginAt` | Date | Used for retention and audit. |
| `mustChangePassword` | Boolean | Forces a password change after reset/admin issue. |
| `passwordChangedAt` | Date | Session invalidation marker. |

### `Role`

| Field | Type | Notes |
| --- | --- | --- |
| `key` | String | Required, unique, fixed role key. |
| `label` | String | Required display name. |
| `description` | String | Optional. |

### `Permission`

| Field | Type | Notes |
| --- | --- | --- |
| `roleKey` | String | Required, references `Role.key`. |
| `resource` | String | Required logical resource, e.g. `admissionPayments`. |
| `action` | String | Required: `view`, `create`, `update`, `approve`, `delete`, `export`. |
| `scope` | String | Required: `own`, `department`, `all`. |

Unique on `(roleKey, resource, action)`.

### `AuthToken`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId -> User | Required. |
| `purpose` | String | Required: `emailVerification`, `passwordReset`. |
| `tokenHash` | String | SHA-256 of the raw token, unique; the raw token is never stored. |
| `expiresAt` | Date | Required; TTL index deletes the row (24 h / 30 min). |
| `usedAt` | Date | Set when consumed or superseded. |

### `AuditLog`

| Field | Type | Notes |
| --- | --- | --- |
| `actorUserId` | ObjectId -> User | Null for anonymous events. |
| `action` | String | Required event name, e.g. `roleChanged`. |
| `entityType` | String | Kind of record touched. |
| `entityId` | ObjectId | Record touched, when applicable. |
| `outcome` | String | Required: `success`, `denied`, `failure`. |
| `ip` | String | Request IP, when available. |
| `details` | Mixed | Small structured context; password, token, secret, aadhaar, mobile, birth/dob, phone, address and email keys are removed at any depth. |

Append-only: no `updatedAt`; updates and deletes are rejected by the model and by the production database role.

### `Counter`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | String | Sequence key, e.g. `application:2026-27`. |
| `seq` | Number | Last issued value; incremented atomically. |

## Academics

### `Department`

| Field | Type | Notes |
| --- | --- | --- |
| `code` | String | Required, unique. |
| `name` | String | Required. |
| `hodUserId` | ObjectId -> User | Department head. |
| `isActive` | Boolean | Default `true`. |

### `AcademicYear`

| Field | Type | Notes |
| --- | --- | --- |
| `label` | String | Required, unique, e.g. `2026-27`. |
| `startDate`, `endDate` | Date | Required year bounds. |
| `status` | String | `upcoming`, `current`, `closed`. |
| `isCurrent` | Boolean | Compatibility flag; at most one current year. |

### `Program`

| Field | Type | Notes |
| --- | --- | --- |
| `name`, `code` | String | Required, unique. |
| `departmentId` | ObjectId -> Department | Required. |
| `faculty` | String | Optional faculty label. |
| `level` | String | Required program level. |
| `durationYears` | Number | Null until the college confirms diploma/certificate durations. |
| `isActive` | Boolean | Default `true`. |

### `Subject`

| Field | Type | Notes |
| --- | --- | --- |
| `code`, `name` | String | Required. |
| `programId` | ObjectId -> Program | Required. |
| `semester` | Number | Required. |
| `category` | String | Required subject category. |
| `credits` | Number | Default `2`. |
| `maxInternal`, `maxExternal` | Number | Defaults `40` / `60`. |
| `countsForCgpa` | Boolean | Default `true`. |
| `isActive` | Boolean | Default `true`. |

Unique on `(programId, semester, code)`.

### `Teacher`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId -> User | Required, unique. |
| `employeeNumber` | String | Required, unique. |
| `departmentId` | ObjectId -> Department | Required. |
| `designation` | String | Required. |
| `phone` | String | Optional. |
| `joiningDate` | Date | Optional. |
| `status` | String | `active` or `inactive`. |

### `Student`

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId -> User | Required, unique. |
| `applicationId` | ObjectId -> Application | Required, unique source admission. |
| `programId` | ObjectId -> Program | Required. |
| `admissionYearId` | ObjectId -> AcademicYear | Required. |
| `enrollmentNumber` | String | Required, unique, generated by `Counter`. |
| `yearOfStudy`, `currentSemester` | Number | Defaults `1` / `1`. |
| `division` | String | Default `A`. |
| `groups.mainGroup`, `groups.majorGroup`, `groups.minorGroup` | String | NEP subject-group snapshot. |
| `status` | String | `active`, `graduated`, `withdrawn`. |
| `admittedAt` | Date | Default now. |

### `Enrollment`

| Field | Type | Notes |
| --- | --- | --- |
| `studentId` | ObjectId -> Student | Required. |
| `subjectId` | ObjectId -> Subject | Required. |
| `semester`, `academicYearId` | Number / ObjectId -> AcademicYear | Required. |
| `status` | String | `enrolled`, `dropped`; dropped rows are retained as history. |

Partial unique index `uniq_enrollment_active` on `(studentId, subjectId, semester)` for `status: enrolled`.

### `Timetable`

| Field | Type | Notes |
| --- | --- | --- |
| `academicYearId`, `programId`, `departmentId`, `subjectId` | ObjectId | Required references. |
| `semester`, `dayOfWeek`, `period` | Number | Required slot position. |
| `teacherUserId` | ObjectId -> User | Required. |
| `division` | String | Default `A`. |
| `startTime`, `endTime`, `room` | String | Slot presentation. |
| `isActive` | Boolean | Default `true`. |

### `TeachingPlan`

| Field | Type | Notes |
| --- | --- | --- |
| `teacherUserId`, `subjectId`, `programId`, `departmentId`, `academicYearId` | ObjectId | Required references. |
| `semester` | Number | Required. |
| `topics` | Array | Planned topics with `planned`/`inProgress`/`done` status. |
| `status` | String | `draft`, `submitted`, `approved`, `returned`. |
| `reviewedByUserId` | ObjectId -> User | HOD reviewer. |
| `reviewedAt`, `reviewNote` | Date / String | Decision record. |

### `Attendance`

| Field | Type | Notes |
| --- | --- | --- |
| `slotId` | ObjectId -> Timetable | Required. |
| `lectureDate` | String | Required `YYYY-MM-DD`. |
| `academicYearId`, `programId`, `departmentId`, `subjectId` | ObjectId | Required references. |
| `semester`, `period` | Number | Required. |
| `teacherUserId`, `markedByUserId` | ObjectId -> User | Required. |
| `records` | Array | Per-student `present`/`absent`/`leave` entries. |

### `Marks`

| Field | Type | Notes |
| --- | --- | --- |
| `studentId`, `subjectId`, `programId`, `departmentId`, `academicYearId` | ObjectId | Required references. |
| `semester` | Number | Required. |
| `component` | String | Required internal component name. |
| `obtained`, `outOf` | Number | Required; `obtained <= outOf`. |
| `enteredByUserId` | ObjectId -> User | Required. |
| `status` | String | `draft`, `submitted`, `approved`, `returned`. |
| `reviewedByUserId`, `reviewedAt`, `reviewNote` | ObjectId / Date / String | Approval record. |

## Admissions

### `FeeStructure`

| Field | Type | Notes |
| --- | --- | --- |
| `purpose` | String | Required: `admission`, `exam`. |
| `academicYearId`, `programId` | ObjectId | Required references. |
| `yearOfStudy` | Number | Default `1`. |
| `divisionType` | String | Default `P.N.G.`. |
| `feesCategory` | String | Required category from the fee sheet. |
| `heads` | Array | Fee-head breakdown. |
| `amountPaise` | Number | Total amount in paise. |
| `classLabel`, `feeGroup`, `label` | String | Display/grouping labels. |
| `isActive` | Boolean | Default `true`. |

### `Application`

| Field | Type | Notes |
| --- | --- | --- |
| `applicantUserId`, `academicYearId`, `programId` | ObjectId | Required references. |
| `yearOfStudy` | Number | Default `1`. |
| `admissionType`, `divisionType`, `feesCategory` | String | Admission and fee classification. |
| `abcId` | String | ABC identifier. |
| `aadhaarNumber` | String | AES-256-GCM ciphertext, `select: false`. |
| `student.*` | Embedded | Name, address, encrypted `mobile`/`birthDate`, keyed `mobileHash` blind index (`select: false`, exact-mobile search only), gender, nationality, caste/category, religion and other declaration fields. Email and address remain plaintext personal data; see `docs/data-retention.md`. |
| `parent.*` | Embedded | Father/mother names and addresses; encrypted `fatherMobile`/`motherMobile`. |
| `lastExam.*` | Embedded | Qualifying examination details, marks, result, attempt and certificates. |
| `passport.*` | Embedded | Passport/visa/residence fields for international applicants. |
| `subjects.mainGroup`, `majorGroup`, `minorGroup`, `subjects.nep` | String / Embedded | Chosen subject groups. |
| `status` | String | `draft`, `submitted`, `returned`, `waitlisted`, `approved`, `feePaid`, `admitted`, `rejected`, `cancelled`. |
| `applicationNumber` | String | Human-readable number from `Counter`. |
| `submittedAt` | Date | Submission timestamp. |
| `reviewedByUserId`, `reviewedAt`, `reviewNote` | ObjectId / Date / String | Form review. |
| `subjectsApprovedAt`, `subjectsApprovedByUserId` | Date / ObjectId | Subject approval stage. |
| `documentsApprovedAt`, `documentsApprovedByUserId` | Date / ObjectId | Document approval stage. |
| `approvedAt`, `waitlistedAt` | Date | Decision timestamps. |
| `feeStructureId`, `feeAmountPaise`, `feeDueAt`, `feePaidAt` | ObjectId / Number / Date | Fee fixed at approval and payment timestamps. |
| `paymentId` | ObjectId -> Payment | Linked admission payment. |
| `hardCopyDueAt`, `hardCopyReceivedAt`, `hardCopyReceivedByUserId` | Date / ObjectId | Hard-copy stage. |
| `admittedAt`, `cancelledAt`, `cancelReason` | Date / String | Final outcome. |

### `AdmissionDocument`

| Field | Type | Notes |
| --- | --- | --- |
| `applicationId` | ObjectId -> Application | Required. |
| `type` | String | Required `DOCUMENT_TYPES` value. |
| `fileName`, `storageKey` | String | Original name and stored object key. |
| `mimeType` | String | Verified content type. |
| `sizeBytes` | Number | Verified byte length. |
| `width`, `height` | Number | Verified image dimensions, when applicable. |
| `status` | String | `pending`, `verified`, `rejected`. |
| `reviewedByUserId`, `reviewedAt`, `reviewNote` | ObjectId / Date / String | Verification record. |

## Examinations and results

### `Exam`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | String | Required. |
| `academicYearId`, `programId` | ObjectId | Required. |
| `semester` | Number | Required. |
| `formOpensAt`, `formClosesAt` | Date | Required form window. |
| `status` | String | `draft`, `open`, `closed`. |
| `schedule` | Array | Subject/date/time/room entries; unique subject, end after start. |

### `ExamForm`

| Field | Type | Notes |
| --- | --- | --- |
| `examId`, `studentId` | ObjectId | Required; unique pair. |
| `details.enrollmentNumber`, `details.fullName` | String | Snapshot at submission. |
| `details.mobile` | String | AES-256-GCM ciphertext snapshot. |
| `details.email`, `details.semester`, `details.feesCategory`, `details.divisionType` | String / Number | Snapshot fields. |
| `subjects` | Array | Selected `{ subjectId }` entries. |
| `status` | String | `draft`, `pendingPayment`, `submitted`, `approved`, `rejected`. |
| `feeStructureId`, `feeAmountPaise`, `paymentId` | ObjectId / Number / ObjectId | Exam fee and payment link. |
| `submittedAt`, `decidedByUserId`, `decidedAt`, `decisionNote` | Date / ObjectId / String | Workflow record. |

### `HallTicket`

| Field | Type | Notes |
| --- | --- | --- |
| `examId`, `examFormId`, `studentId`, `programId`, `academicYearId` | ObjectId | Required references. |
| `examName`, `programName`, `enrollmentNumber`, `fullName`, `semester` | String / Number | Immutable issuance snapshot. |
| `seatNumber`, `room` | String | Seat number unique per exam. |
| `status` | String | `pending`, `issued`, `blocked`. |
| `schedule` | Array | Snapshot of the exam schedule. |
| `issuedAt`, `issuedByUserId`, `blockedReason` | Date / ObjectId / String | Issuance/blocking record. |

### `Result`

| Field | Type | Notes |
| --- | --- | --- |
| `examId`, `studentId`, `examFormId` | ObjectId | Required; one result per exam/student. |
| `enrollmentNumber`, `fullName`, `semester` | String / Number | Snapshot. |
| `lines` | Array | Per-subject marks, grade, credits and status. |
| `totalObtained`, `totalMax`, `percentage` | Number | Aggregate marks. |
| `failedSubjects` | Number | Count used by the SGPA rule. |
| `outcome`, `finalGrade` | String | `pass`/`fail` and letter grade. |
| `sgpa`, `creditsTotal`, `creditsEarned` | Number | CBCS result values. |
| `isComplete`, `isPublished`, `publishedAt`, `publishedByUserId` | Boolean / Date / ObjectId | Publication state. |
| `unpublishReason` | String | Required when unpublishing. |

## Payments

### `Payment`

| Field | Type | Notes |
| --- | --- | --- |
| `purpose` | String | Required: `admission`, `exam`. |
| `payerUserId`, `academicYearId`, `feeStructureId` | ObjectId | Required references. |
| `applicationId`, `examFormId` | ObjectId | Exactly one target based on `purpose`. |
| `amountPaise`, `reservedRefundPaise` | Number | Amount and refund headroom. |
| `status` | String | `created`, `paid`, `failed`. |
| `isTestMode` | Boolean | Fake gateway marker. |
| `currency`, `gateway` | String | `INR`; `fake` or `razorpay`. |
| `gatewayOrderId`, `gatewayPaymentId` | String | Gateway identifiers. |
| `orderCreatedAt`, `signatureVerifiedAt`, `paidAt` | Date | Payment lifecycle. |
| `gatewayMethod`, `confirmedVia` | String | Payment method and confirmation path. |
| `failedAttempts`, `gatewayErrorCode`, `failureReason` | Number / String | Failure diagnostics. |
| `gatewayEventIds` | Array | Deduplicated webhook event IDs. |
| `receiptNumber` | String | Required once paid, generated by `Counter`. |

`refunded` is deliberately not a `Payment.status`. A payment stays `paid`; each refund is a `Refund` row, `reservedRefundPaise` tracks approved/requested headroom, and reports expose `refundedPaise`/`netPaise`. The client no longer assigns a `refunded` payment-status variant.

### `Refund`

| Field | Type | Notes |
| --- | --- | --- |
| `paymentId` | ObjectId -> Payment | Required. |
| `purpose` | String | `admission`, `exam`. |
| `amountPaise`, `reason` | Number / String | Required. |
| `status` | String | `requested`, `approved`, `rejected`. |
| `requestedByUserId`, `decidedByUserId` | ObjectId | Requester and approver must differ. |
| `decidedAt`, `decisionNote` | Date / String | Decision record. |
| `gatewayRefundId` | String | Gateway payout ID; approval without it is not paid. |
| `processingAt`, `processedAt` | Date | Retry/processing state. |

## Website content

### `WebsiteContent`

| Field | Type | Notes |
| --- | --- | --- |
| `type` | String | Required notice/event/news/gallery/page type. |
| `title`, `slug`, `summary`, `body` | String | Content; slug is optional for some types. |
| `imageUrl`, `images`, `attachments` | String / Array | Media references. |
| `departmentId` | ObjectId -> Department | Null for college-wide content. |
| `isPublic`, `isPinned` | Boolean | Visibility and placement. |
| `startsAt`, `endsAt`, `venue` | Date / String | Event fields. |
| `status` | String | `draft`, `published`, `archived`. |
| `publishedAt`, `expiresAt` | Date | Publication window. |
| `authorUserId`, `lastEditedByUserId` | ObjectId -> User | Authorship. |

## Derived and stored snapshots

The following values are snapshots and are intentionally not recalculated when the source record changes:

- `HallTicket.examName`, `programName`, `enrollmentNumber`, `fullName`, `semester`, `schedule`.
- `ExamForm.details.*` at submission.
- `Result.lines`, `Result.fullName`, `Result.enrollmentNumber` at result entry.
- `Application.feeAmountPaise` at form approval.
- Encrypted PII on `Application` and `ExamForm.details.mobile`, which must remain readable after the user record changes.
