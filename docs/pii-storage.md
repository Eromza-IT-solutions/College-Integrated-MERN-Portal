# PII storage decision

Decision date: 2026-11-22. Applies before any real applicant or student data is loaded.

Staff need the full Aadhaar number, mobile number and date of birth to verify admission documents, so a one-way hash alone is not enough. These values are therefore encrypted at rest with AES-256-GCM using a key stored outside MongoDB. Mongoose field getters return the original value to authorised application code; database dumps and direct `mongosh` reads contain only ciphertext.

## Where values are stored

| Collection | Field | Storage | Reason |
| --- | --- | --- | --- |
| `applications` | `aadhaarNumber` | AES-256-GCM ciphertext, `select: false` | Full value needed by admission staff; never returned by list APIs. |
| `applications` | `student.mobile` | AES-256-GCM ciphertext | Full value needed by admission staff and copied to the login identity on admission. |
| `applications` | `student.mobileHash` | Keyed HMAC blind index, `select: false` | Exact-mobile staff search without decrypting rows. |
| `applications` | `student.birthDate` | AES-256-GCM ciphertext (ISO string in the encrypted payload) | Full date needed for document verification. |
| `applications` | `parent.fatherMobile`, `parent.motherMobile` | AES-256-GCM ciphertext | Same rule as the student mobile number. |
| `examforms` | `details.mobile` | AES-256-GCM ciphertext | Snapshot copied from the application; must follow the same rule. |
| `users` | `aadhaarHash`, `aadhaarLast4` | Keyed hash + last 4 only | Used for Aadhaar sign-in and display as `XXXX XXXX 1234`. The full value is never stored here. |
| `users` | `mobile` | Plaintext (documented exception) | It is a unique login identifier used by `findByLoginId` and a unique partial index; encrypting it with a random IV would break sign-in and duplicate detection. See residual risk below. |

Encrypted values start with `enc:v1:k:<keyId>:` and contain a fresh random 12-byte IV, a 16-byte GCM auth tag and the ciphertext. Pre-key-ID values (`enc:v1:<iv>:<tag>:<data>`) are still readable and are treated as key ID `v1`. The auth tag is verified on every read: a wrong key or a tampered value throws instead of returning a partial string or an empty value. `npm test` covers this in `server/tests/piiEncryption.test.js`.

## Key management

`FIELD_ENCRYPTION_KEY` is required outside tests and must be exactly 32 random bytes encoded as standard base64:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Mandatory before real data:

1. Store the key in the deployment secrets manager (not `server/.env`, MongoDB, the repository, or a database backup). The deployment platform must inject it as `FIELD_ENCRYPTION_KEY`.
2. Keep a second copy in a separate access-controlled secret/escrow location. **Owner: named custodian to be assigned before production.** This is a go-live blocker: the custodian's name, contact and recovery procedure must be recorded in the college's secret register. A database backup without this key is useless.
3. Record `FIELD_ENCRYPTION_KEY_ID` (default `v1`). The ID is stored with every new ciphertext.
4. Keep `FIELD_ENCRYPTION_PREVIOUS_KEYS` as a JSON map of retired IDs to their base64 keys for as long as any row still uses those IDs. Values are never printed by validation errors or audit logs.

### Rotation

Rotation is in-place and does not require a plaintext intermediate:

1. Take and verify a database backup, and set `MIGRATION_BACKUP_CONFIRMED=yes`.
2. Deploy the new key as `FIELD_ENCRYPTION_KEY`, give it a new `FIELD_ENCRYPTION_KEY_ID` (for example `v2`), and put the old key under its old ID in `FIELD_ENCRYPTION_PREVIOUS_KEYS`. Reads keep working because the ciphertext carries its key ID.
3. Dry-run, then apply the rewrap:

   ```powershell
   npm run migrate:pii-encryption -- --rewrap
   npm run migrate:pii-encryption -- --apply --rewrap
   npm run migrate:pii-encryption -- --rewrap
   ```

   The last command must report zero values using an older key. Only then remove the old key from `FIELD_ENCRYPTION_PREVIOUS_KEYS`.

`--reverse --apply` still exists for a full rollback to plaintext, but it is no longer the normal rotation path. In tests and local scratch runs, a deterministic test-only key is derived when the variable is unset. Never use that fallback with real data.

## Running the migration

Take a verified backup first. Dry-run is the default and changes nothing:

```powershell
cd server
npm run migrate:pii-encryption
```

Apply, then confirm the follow-up dry run reports zero plaintext values:

```powershell
$env:MIGRATION_BACKUP_CONFIRMED = 'yes'
npm run migrate:pii-encryption -- --apply
npm run migrate:pii-encryption
```

Rollback to plaintext (for example during key rotation):

```powershell
$env:MIGRATION_BACKUP_CONFIRMED = 'yes'
npm run migrate:pii-encryption -- --apply --reverse
```

`npm run verify:pii-dryrun` reproduces the whole sequence on a temporary local MongoDB (seed -> dry run -> apply -> model read-back -> dry run -> reverse -> dry run) and writes `docs/evidence/pii-encryption-dryrun.md`. It never uses a real database.

## Queries, exports and logs

No list, search or filter reads an encrypted field. `GET /admissions/applications` filters on status, year, program and, optionally, `mobile`. Mobile search uses `student.mobileHash`, an HMAC-SHA256 blind index keyed with `LOGIN_ID_HASH_SECRET` and domain-separated as `admission-mobile:v1`. It is populated by the model `pre('save')` hook and by the encryption migration. The hash is `select: false`, is removed from the detail response, and is never used to display a phone number.

The CSV export contains only application number, status, names, program, year, fee and due-date columns; it never includes Aadhaar, mobile, birth date or addresses. The duplicate-applicant check in `registerApplicant` uses `users.email` and `users.mobile` (see the documented exception below), not encrypted application fields. No code decrypts a row just to find it.

`AuditLog.record()` strips keys matching password/token/secret/aadhaar/mobile/birth/dob/phone/address/email at any depth. Decrypted values are not passed to audit details, error messages or `console.error`; login audits record only the identifier *type*. Mongoose validation errors are sanitised by the central error handler.

## Migration safety

`--apply` refuses to run unless `MIGRATION_BACKUP_CONFIRMED=yes`. The migration scans raw collections and skips values that are already in the target state (`enc:v1:` for encryption, plaintext for `--reverse`, current key ID for `--rewrap`), so a crash halfway leaves no ambiguous half-state: re-running completes the remaining rows. Blind indexes are refreshed on every apply mode, and the post-apply scan fails the command if any plaintext, old-key ciphertext or stale blind index remains.

## Residual decision: `User.mobile`

**Decision (2026-11-22): retain the documented exception.** `User.mobile` stays plaintext because it is a unique sign-in identifier and the duplicate-applicant check needs a deterministic lookup. Compensating controls: login rate limiting, no mobile values in audit details, minimised API exposure, and restricted database-level access to the `users` collection. This is accepted risk, not an oversight; revisit only if sign-in is migrated to a keyed `mobileHash` with a verified backfill.

Separate personal data that remains readable by design: `Teacher.phone`, `Application.student.email`, `Application.parent.email`, student/parent addresses, and snapshots such as `ExamForm.details.email` and `HallTicket` enrollment/name fields. Attendance records link by `studentId` and do not copy PII. These fields are named in `docs/data-retention.md` and must appear in the college's privacy notice.

## Evidence

- `docs/evidence/pii-encryption-dryrun.md` - scratch database dry run, repeated apply, key rotation/rewrap, read-back and reverse.
- `docs/evidence/restore-drill.md` - scratch restore plus key-escrow restore check.
- `server/tests/piiEncryption.test.js` - key IDs, rotation, random IV, auth-tag verification, wrong-key failure, blind index, audit stripping and migration helpers.
- `server/tests/envConfig.test.js` - key presence, format and previous-key validation at startup.
