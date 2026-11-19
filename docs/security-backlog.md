# Security Backlog

## SEC-001: Harden admission document uploads

Status: Open  
Priority: High  
Area: Admissions / document storage  
Source: `server/src/modules/admission/admission.routes.js`, `server/src/utils/fileStore.js`, `server/src/models/AdmissionDocument.js`

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
