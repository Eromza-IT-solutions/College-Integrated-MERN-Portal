# Operations Runbook

## Services

| Component | Directory | Dev command | Default URL |
| --- | --- | --- | --- |
| API server | `server` | `npm run dev` | `http://localhost:5000/api/v1` |
| Web client | `client` | `npm run dev` | Vite dev server URL |
| CI | repository | `.github/workflows/ci.yml` | GitHub Actions |

## Required configuration

Create `server/.env` from `server/.env.example`.

Minimum required outside tests:

- `MONGODB_URI`
- `SESSION_SECRET` (at least 32 characters in production)
- `CLIENT_ORIGIN`
- `SESSION_NAME` (defaults to `icms.sid`)
- `PAYMENT_GATEWAY` (`fake` or `razorpay`)
- `PAYMENT_KEY_ID`, `PAYMENT_KEY_SECRET`, `PAYMENT_WEBHOOK_SECRET` when using Razorpay

Payment variables are canonically named `PAYMENT_*`. Do not add `RAZORPAY_*` aliases.

Scheduled jobs are disabled by default in tests. For deployments, configure:

- `JOBS_ENABLED`
- `JOBS_RUN_ON_START`
- `ADMISSION_DEADLINE_INTERVAL_MS`
- `PAYMENT_RECONCILIATION_INTERVAL_MS`
- `PAYMENT_RECONCILIATION_MIN_AGE_MS`
- `JOB_BATCH_SIZE`

## First-time setup

```powershell
cd server
npm ci
npm run seed:permissions
npm run seed
```

Real college data seeding order:

```powershell
npm run seed:programs
npm run seed:fees
npm run seed:subjects
```

`seed:subjects` loads the 1,636-subject college catalog from `college-subjects.json`. `seed:sample-subjects` creates only the demo `SMP-*` subjects used by the sample exam, timetable, and demo student flows. They are not duplicates and should not be used together in production: `seed:subjects` prunes stale `SMP-*` rows.

Create a Super Admin:

```powershell
npm run create-super-admin
```

Optional demo-only data, in dependency order:

```powershell
npm run seed:sample-subjects
npm run seed:exam
npm run seed:timetable
npm run seed:demo-student
npm run seed:demo-applicant
npm run seed:website-content
npm run seed:audit-logs
```

`seed:exam`, `seed:timetable`, `seed:demo-student`, and `seed:demo-applicant` depend on the `SMP-*` subjects. Run `seed:subjects` only for real college data, and back up the database first because it prunes rows not present in the JSON catalog.

## Verification

Run before every release:

```powershell
cd client
npm run lint
npm test
npm run build
```

```powershell
cd server
npm run lint
npm run openapi:check
npm test
```

CI runs these checks on pull requests and pushes to `main` and `develop`: client lint/test/build, server lint, OpenAPI validation, and server tests.

## Repository protection

Branch protection is a GitHub repository setting, not a repository file. Configure it on `main` and `develop`:

- Require a pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require these status checks: client lint/test/build, server lint, `openapi:check`, and server test.
- Require branches to be up to date before merging.
- Block force pushes and branch deletion.
- Restrict direct pushes to maintainers.

This cannot be verified from a local checkout; confirm it in GitHub repository settings before release.

## Deployment target

Status: not selected. This is a release blocker, not an implemented component.

A deployment decision is required for the API host, MongoDB provider, client host, domain/TLS, public webhook URL, and environment-secret store. Until those are chosen, the runbook can describe local and CI behavior only. Do not configure production payment credentials or scheduled jobs against an unapproved target.

## Data inventory

- `docs/db-model-map.md` lists every model, relationship, and invariant.
- `docs/openapi.yaml` lists the HTTP contract, including `/exams/reference`, hall tickets, payments, and reports.
- `server/scripts/data/college-programs.json` has 60 programs, enforced by `server/tests/college-alignment.test.js`.
- `server/scripts/data/college-subjects.json` has 1,636 subjects across 32 programs.
- `server/scripts/data/college-fees-2026-27.json` has 28 confirmed fee groups.

Known data gaps requiring college decisions:

- 28 programs have no subjects.
- 22 programs have no admission fee mapping.
- Diploma/certificate durations, departments, failed-subject SGPA rule, and cash/challan acceptance are unresolved.

## Operational workflows

### Admissions

1. Applicant registers, verifies email, and submits the application.
2. Admission staff approves subjects and documents.
3. Fee order is created through `POST /payments/orders` with `purpose: admission`.
4. Payment verification or reconciliation marks the payment paid.
5. Hard copy is received and application is approved.
6. `POST /admissions/applications/:id/student` creates the Student and semester-1 enrollments.

Overdue applications are listed by `GET /admissions/applications/overdue`.

### Payments

- `POST /payments/webhook` is public and must remain above `/:id` in the router.
- Webhook signatures are verified over the raw request body.
- Gateway webhook events are deduplicated with `Payment.gatewayEventIds`.
- Receipts: `GET /payments/:id/receipt` for JSON or `GET /payments/:id/receipt?format=pdf` for PDF.
- Manual reconciliation: `npm run job:payment-reconciliation`.
- Refund approval by the requester is blocked by model/route rules.

### Examinations and hall tickets

1. Exam admin creates an exam session with form open/close window.
2. Exam admin enters `Exam.schedule`; every offered subject needs a date, start time, end time, and room.
3. Students submit exam forms and pay the exam fee.
4. Exam admin approves or rejects forms.
5. Exam admin generates hall tickets with `POST /exams/:id/hall-tickets/generate`.
   - Use `{ "overwrite": true }` to regenerate existing tickets.
   - Incomplete schedules return `409 EXAM_SCHEDULE_INCOMPLETE`.
   - Missing schedule data returns `409 EXAM_SCHEDULE_MISSING`.
6. Hall ticket seat/room/status can be patched.
7. Students download PDFs from `GET /exam-forms/hall-tickets/:id/pdf`.

Issued tickets snapshot the schedule. Later `Exam.schedule` edits do not alter issued tickets.

### Results

1. Result entry opens from an approved exam form.
2. Internal marks come from approved `Marks`.
3. `Result` computes CBCS lines, grade points, SGPA, and outcome automatically.
4. Publish a single result or all complete results for an exam.
5. Students only see published results through `GET /results`.

### Scheduled jobs

- `server/src/jobs/scheduler.js` starts after DB connection in `server/src/server.js`.
- Admission deadlines and stale payment reconciliation run according to environment intervals.
- Scheduler shuts down cleanly on `SIGINT` and `SIGTERM`.
- One-off commands:
  - `npm run job:admission-deadlines`
  - `npm run job:payment-reconciliation`

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `401` on API calls | Session expired; log in again and confirm `icms.sid` is sent with credentials |
| `403` on admin action | Permission matrix row missing or caller scope is `own`/`department` |
| Cross-department record returns `404` | Expected behavior: hidden resources are not disclosed |
| `/exams/reference` missing subjects | Caller needs `exams:view`; examAdmin has no `programs:view` or `subjects:view` |
| Hall ticket generation returns `409` | Enter a complete `Exam.schedule` covering every approved form subject |
| Payment stays `created` | Check gateway keys, webhook URL, `gatewayEventIds`, and reconciliation job |
| Receipt PDF fails | Payment must be `paid`; use `?format=pdf` on `/payments/:id/receipt` |
| Vite test/key warnings | Ensure list keys are unique; chart labels use full month names |
| Student list hides mobile/Aadhaar | Expected: list responses expose only last-four values |

## Security reminders

- Never log secrets, session cookies, Aadhaar numbers, or gateway signatures.
- `aadhaarNumber` and `passwordHash` use `select: false`.
- Student list responses must not include full mobile/Aadhaar.
- Student self-update allowlist is `mobile`.
- Enrollment add/drop/promote requires `scope: all`.
- Deleting a student means deactivate the student and linked user, never hard delete.
- MIME, size, and image-dimension validation for admission documents is tracked as `SEC-001` in `docs/security-backlog.md`.

## Release checklist

- [ ] All CI checks pass, including `npm run openapi:check`.
- [ ] Branch protection is enabled on `main` and `develop`.
- [ ] Deployment target and domain/TLS decisions are approved.
- [ ] Required env variables are set in the target environment.
- [ ] `npm run seed:permissions` has been run after permission-matrix changes.
- [ ] `docs/openapi.yaml` matches deployed routes.
- [ ] `docs/db-model-map.md` matches deployed models.
- [ ] Payment gateway is set to the intended mode.
- [ ] Webhook URL is public and signature secret matches.
- [ ] Scheduled jobs are enabled with intended intervals.
- [ ] Backup taken before any seed that mutates live data.
- [ ] `SEC-001` is triaged and either fixed or explicitly accepted before admitting real uploads.
- [ ] Rollback plan identified.
