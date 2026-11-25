# Security Backlog

## PII at rest: decided and implemented

Full Aadhaar, mobile and date-of-birth values on admission applications (and the exam-form mobile snapshot) are now encrypted at rest with AES-256-GCM using `FIELD_ENCRYPTION_KEY`. `User` continues to store only a keyed Aadhaar hash plus last 4 digits. See `docs/pii-storage.md` for the decision, migration steps, evidence and the documented `User.mobile` exception.

Verified: fresh 12-byte IV per encryption, 16-byte auth tag checked on read, wrong-key/tamper throws, key ID stored with each ciphertext, previous-key rotation and `--rewrap` path, blind-index mobile search (no encrypted-field queries), CSV/duplicate-check unaffected, broader audit stripping, resumable apply, and key restore as part of the restore drill.

Open go-live blockers: assign the named `FIELD_ENCRYPTION_KEY` custodian and the AuditLog purge/archive owner/date. Both are recorded in `docs/data-retention.md`.

## SEC-001: Harden admission document uploads

Status: Fixed, pending deployment

Priority: High

Area: Admissions / document storage

Source: `server/src/modules/admission/admission.routes.js`, `server/src/modules/admission/admission.service.js`, `server/src/utils/imageValidation.js`, `server/src/utils/fileStore.js`, `server/src/models/AdmissionDocument.js`

### Problem

Admission document uploads do not yet validate file MIME type, file size limits, or image dimensions. The model stores `mimeType`, `width`, and `height`, but the upload path does not enforce an allowlist or reject malformed image files. This allows mislabeled or oversized files to be stored and later served as documents.

### Required work

- Enforce an allowlist of document MIME types per `DOCUMENT_TYPES` in `server/src/utils/constants.js`.
- Validate actual file content, not only the client-supplied `mimetype`.
- Reject empty files and files above a documented size limit.
- Validate image dimensions from file content and store verified `width`/`height` values.
- Reject executable content, SVG with scripts, and archive formats for document uploads.
- Add negative tests for wrong MIME type, malformed image bytes, oversized files, and script-bearing SVG.
- Update `docs/openapi.yaml` with upload constraints and `docs/runbook.md` with the enforced limits.

### Acceptance criteria

- A file whose extension and content disagree is rejected with a 400 response.
- A file above the configured size limit is rejected with a 400 response.
- Only allowlisted image/PDF types can be stored.
- Verified dimensions are persisted on `AdmissionDocument`.
- The runbook no longer lists this as an undocumented known gap.

### Resolution

`validateUploadedFile()` inspects the bytes before anything is written to disk. It parses PNG `IHDR` and JPEG `SOF` markers to obtain trusted dimensions, requires the client extension and MIME type to agree with the detected type, enforces the 500 KB limit, and rejects SVG, archive, executable, PDF, empty and malformed files. The service persists the verified MIME type, size, width and height instead of client-supplied values. Negative tests cover mismatch, malformed bytes, oversize, script-bearing SVG and wrong photo dimensions; see `server/tests/imageValidation.test.js` and `server/tests/admissionFlow.test.js`.
