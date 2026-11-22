# Data-integrity migration dry run

- Generated: 2026-11-22T14:46:49.465Z
- Target: local scratch MongoDB created by `mongodb-memory-server`; no real database was used.
- Mode: dry run only. `--apply` and `--drop` were not used.
- Seed command: `node scripts/seed-migration-dryrun-data.js` (exit 0)
- Migration command: `npm run migrate:data-integrity` (exit 0)

## Seed output

```text
Scratch database: migration_dryrun
Seeded applications=220 payments=220 examForms=50 enrollments=326 refunds=220 auditLogs=130
Expected findings: 6 duplicate active groups; 12 payment backfills; 8 payment/link mismatches; 120 refund backfills; 60 unresolved refunds; 2 years to seed
```

## Migration report

```text
> college-portal-server@0.0.0 migrate:data-integrity
> node scripts/migrate-data-integrity.js

Mode: DRY RUN
Dry run is the default. Re-run with --apply to make changes.

Enrollment: 6 duplicate active group(s)
  keep 6b0300581bbb221f9f6fdce4; drop 6b0300581bbb221f9f6fde10 for student=6b0300571bbb221f9f6fdbcc subject=6b0300571bbb221f9f6fdbc0 semester=1
  keep 6b0300581bbb221f9f6fdce5; drop 6b0300581bbb221f9f6fde11 for student=6b0300571bbb221f9f6fdbcd subject=6b0300571bbb221f9f6fdbc1 semester=1
  keep 6b0300581bbb221f9f6fdce6; drop 6b0300581bbb221f9f6fde12 for student=6b0300571bbb221f9f6fdbce subject=6b0300571bbb221f9f6fdbc2 semester=1
  keep 6b0300581bbb221f9f6fdce7; drop 6b0300581bbb221f9f6fde13 for student=6b0300571bbb221f9f6fdbcf subject=6b0300571bbb221f9f6fdbc3 semester=1
  keep 6b0300581bbb221f9f6fdce8; drop 6b0300581bbb221f9f6fde14 for student=6b0300571bbb221f9f6fdbd0 subject=6b0300571bbb221f9f6fdbc4 semester=1
  keep 6b0300581bbb221f9f6fdce9; drop 6b0300581bbb221f9f6fde15 for student=6b0300571bbb221f9f6fdbd1 subject=6b0300571bbb221f9f6fdbc5 semester=1

Enrollment indexes: legacy=absent; active=absent
  create unique partial index uniq_enrollment_active on (studentId, subjectId, semester, status) where status=enrolled

Counters: 2 academic year(s) to seed
  ensure receipt/application/enrollment counters for 2025-26
  ensure receipt/application/enrollment counters for 2026-27

Payment/ExamForm: 12 backfill(s), 8 mismatch(es)
  set Payment 6b0300571bbb221f9f6fdb7a.examFormId=6b0300571bbb221f9f6fdba7
  set Payment 6b0300571bbb221f9f6fdb7b.examFormId=6b0300571bbb221f9f6fdba8
  set Payment 6b0300571bbb221f9f6fdb7c.examFormId=6b0300571bbb221f9f6fdba9
  set Payment 6b0300571bbb221f9f6fdb7d.examFormId=6b0300571bbb221f9f6fdbaa
  set Payment 6b0300571bbb221f9f6fdb7e.examFormId=6b0300571bbb221f9f6fdbab
  set Payment 6b0300571bbb221f9f6fdb7f.examFormId=6b0300571bbb221f9f6fdbac
  set Payment 6b0300571bbb221f9f6fdb80.examFormId=6b0300571bbb221f9f6fdbad
  set Payment 6b0300571bbb221f9f6fdb81.examFormId=6b0300571bbb221f9f6fdbae
  set Payment 6b0300571bbb221f9f6fdb82.examFormId=6b0300571bbb221f9f6fdbaf
  set Payment 6b0300571bbb221f9f6fdb83.examFormId=6b0300571bbb221f9f6fdbb0
  set Payment 6b0300571bbb221f9f6fdb84.examFormId=6b0300571bbb221f9f6fdbb1
  set Payment 6b0300571bbb221f9f6fdb85.examFormId=6b0300571bbb221f9f6fdbb2
  MISMATCH {"paymentId":"6b0300571bbb221f9f6fdb8c","reason":"2 ExamForm records point to this exam payment"}
  MISMATCH {"paymentId":"6b0300571bbb221f9f6fdb8d","reason":"2 ExamForm records point to this exam payment"}
  MISMATCH {"examFormId":"6b0300571bbb221f9f6fdbb3","paymentId":"6b0300571bbb221f9f6fdb86","reason":"ExamForm.paymentId disagrees with Payment.examFormId"}
  MISMATCH {"examFormId":"6b0300571bbb221f9f6fdbb4","paymentId":"6b0300571bbb221f9f6fdb87","reason":"ExamForm.paymentId disagrees with Payment.examFormId"}
  MISMATCH {"examFormId":"6b0300571bbb221f9f6fdbb5","paymentId":"6b0300571bbb221f9f6fdb88","reason":"ExamForm.paymentId disagrees with Payment.examFormId"}
  MISMATCH {"paymentId":"6b0300571bbb221f9f6fdb89","examFormId":"6b0300571bbb221f9f6fdbb9","reason":"Payment.examFormId does not point back to this payment"}
  MISMATCH {"paymentId":"6b0300571bbb221f9f6fdb8a","examFormId":"6b0300571bbb221f9f6fdbba","reason":"Payment.examFormId does not point back to this payment"}
  MISMATCH {"paymentId":"6b0300571bbb221f9f6fdb8b","examFormId":"6b0300571bbb221f9f6fdbbb","reason":"Payment.examFormId does not point back to this payment"}

Refund gateway ids: 120 backfill(s), 60 unresolved
  set Refund 6b0300571bbb221f9f6fdc08.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc09.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc0a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc0b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc0c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc0d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc0e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc0f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc10.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc11.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc12.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc13.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc14.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc15.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc16.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc17.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc18.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc19.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc1a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc1b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc1c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc1d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc1e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc1f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc20.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc21.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc22.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc23.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc24.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc25.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc26.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc27.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc28.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc29.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc2a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc2b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc2c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc2d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc2e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc2f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc30.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc31.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc32.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc33.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc34.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc35.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc36.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc37.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc38.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc39.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc3a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc3b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc3c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc3d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc3e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc3f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc40.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc41.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc42.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc43.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc44.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc45.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc46.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc47.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc48.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc49.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc4a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc4b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc4c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc4d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc4e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc4f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc50.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc51.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc52.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc53.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc54.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc55.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc56.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc57.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc58.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc59.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc5a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc5b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc5c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc5d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc5e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc5f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc60.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc61.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc62.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc63.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc64.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc65.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc66.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc67.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc68.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc69.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc6a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc6b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc6c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc6d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc6e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc6f.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc70.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc71.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc72.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc73.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc74.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc75.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc76.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc77.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc78.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc79.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc7a.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc7b.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc7c.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc7d.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc7e.gatewayRefundId from audit log
  set Refund 6b0300571bbb221f9f6fdc7f.gatewayRefundId from audit log
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc80","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc81","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc82","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc83","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc84","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc85","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc86","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc87","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc88","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc89","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc8a","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc8b","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc8c","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc8d","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc8e","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc8f","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc90","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc91","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc92","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc93","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc94","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc95","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc96","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc97","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc98","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc99","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc9a","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc9b","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc9c","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc9d","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc9e","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdc9f","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca0","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca1","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca2","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca3","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca4","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca5","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca6","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca7","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca8","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdca9","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcaa","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcab","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcac","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcad","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcae","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcaf","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb0","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb1","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb2","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb3","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb4","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb5","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb6","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb7","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb8","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcb9","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcba","reason":"no audit log contains a gateway refund id for this approved refund"}
  UNRESOLVED {"refundId":"6b0300571bbb221f9f6fdcbb","reason":"no audit log contains a gateway refund id for this approved refund"}

Summary: mode=DRY RUN unresolved=68
```
