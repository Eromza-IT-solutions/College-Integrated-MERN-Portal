# PII encryption migration dry run

- Generated: 2026-11-22T16:09:02.702Z
- Target: local scratch MongoDB created by `mongodb-memory-server`; no real database was used.
- Sequence: seed plaintext -> dry run -> apply refused without backup confirmation -> apply -> repeat apply (crash resume) -> read back -> dry run -> key rotation dry run -> rewrap -> read back -> dry run -> reverse -> dry run.

## seed (exit 0)

```text
Scratch database: migration_dryrun
Seeded applications=220 payments=220 examForms=50 enrollments=326 refunds=220 auditLogs=130
Expected findings: 6 duplicate active groups; 12 payment backfills; 8 payment/link mismatches; 120 refund backfills; 60 unresolved refunds; 2 years to seed
```

## dryRun (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js

Mode: DRY RUN
Current encryption key ID: v1

applications: 220 total, 220 with plaintext personal data
  aadhaarNumber: 220 plaintext value(s)
  student.mobile: 220 plaintext value(s)
  student.birthDate: 220 plaintext value(s)
  parent.fatherMobile: 0 plaintext value(s)
  parent.motherMobile: 0 plaintext value(s)
  blind indexes: 220 document(s) needing an update

examforms: 50 total, 50 with plaintext personal data
  details.mobile: 50 plaintext value(s)
  blind indexes: 0 document(s) needing an update

Dry run is the default. Re-run with --apply to encrypt these values.
```

## applyWithoutBackupConfirmation (exit 1)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js --apply

PII encryption migration failed: Set MIGRATION_BACKUP_CONFIRMED=yes after taking a backup before running with --apply
```

## apply (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js --apply

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

## reapplyAfterCrash (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js --apply

Mode: APPLY
Current encryption key ID: v1

applications: 220 total, 0 with plaintext personal data
  aadhaarNumber: 0 plaintext value(s)
  student.mobile: 0 plaintext value(s)
  student.birthDate: 0 plaintext value(s)
  parent.fatherMobile: 0 plaintext value(s)
  parent.motherMobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update
After APPLY: 0 document(s) with plaintext personal data
After APPLY: 0 document(s) needing a blind-index update

examforms: 50 total, 0 with plaintext personal data
  details.mobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update
After APPLY: 0 document(s) with plaintext personal data
After APPLY: 0 document(s) needing a blind-index update
```

## readBack (exit 0)

```text
MODEL_READ aadhaar=100000000000 mobile=9000000000
```

## verifyAfterApply (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js

Mode: DRY RUN
Current encryption key ID: v1

applications: 220 total, 0 with plaintext personal data
  aadhaarNumber: 0 plaintext value(s)
  student.mobile: 0 plaintext value(s)
  student.birthDate: 0 plaintext value(s)
  parent.fatherMobile: 0 plaintext value(s)
  parent.motherMobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update

examforms: 50 total, 0 with plaintext personal data
  details.mobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update

Dry run is the default. Re-run with --apply to encrypt these values.
```

## rewrapDryRun (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js --rewrap

Mode: DRY RUN
Current encryption key ID: v2

applications: 220 total, 220 with using an older key personal data
  aadhaarNumber: 220 using an older key value(s)
  student.mobile: 220 using an older key value(s)
  student.birthDate: 220 using an older key value(s)
  parent.fatherMobile: 0 using an older key value(s)
  parent.motherMobile: 0 using an older key value(s)
  blind indexes: 0 document(s) needing an update

examforms: 50 total, 50 with using an older key personal data
  details.mobile: 50 using an older key value(s)
  blind indexes: 0 document(s) needing an update

Dry run is the default. Re-run with --apply --rewrap to re-encrypt these values with the current key.
```

## rewrap (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js --apply --rewrap

Mode: REWRAP
Current encryption key ID: v2

applications: 220 total, 220 with using an older key personal data
  aadhaarNumber: 220 using an older key value(s)
  student.mobile: 220 using an older key value(s)
  student.birthDate: 220 using an older key value(s)
  parent.fatherMobile: 0 using an older key value(s)
  parent.motherMobile: 0 using an older key value(s)
  blind indexes: 0 document(s) needing an update
After REWRAP: 0 document(s) with using an older key personal data
After REWRAP: 0 document(s) needing a blind-index update

examforms: 50 total, 50 with using an older key personal data
  details.mobile: 50 using an older key value(s)
  blind indexes: 0 document(s) needing an update
After REWRAP: 0 document(s) with using an older key personal data
After REWRAP: 0 document(s) needing a blind-index update
```

## readBackAfterRewrap (exit 0)

```text
MODEL_READ aadhaar=100000000000 mobile=9000000000
```

## verifyAfterRewrap (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js

Mode: DRY RUN
Current encryption key ID: v2

applications: 220 total, 0 with plaintext personal data
  aadhaarNumber: 0 plaintext value(s)
  student.mobile: 0 plaintext value(s)
  student.birthDate: 0 plaintext value(s)
  parent.fatherMobile: 0 plaintext value(s)
  parent.motherMobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update

examforms: 50 total, 0 with plaintext personal data
  details.mobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update

Dry run is the default. Re-run with --apply to encrypt these values.
```

## reverse (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js --apply --reverse

Mode: REVERSE
Current encryption key ID: v2

applications: 220 total, 220 with encrypted personal data
  aadhaarNumber: 220 encrypted value(s)
  student.mobile: 220 encrypted value(s)
  student.birthDate: 220 encrypted value(s)
  parent.fatherMobile: 0 encrypted value(s)
  parent.motherMobile: 0 encrypted value(s)
  blind indexes: 0 document(s) needing an update
After REVERSE: 0 document(s) with encrypted personal data
After REVERSE: 0 document(s) needing a blind-index update

examforms: 50 total, 50 with encrypted personal data
  details.mobile: 50 encrypted value(s)
  blind indexes: 0 document(s) needing an update
After REVERSE: 0 document(s) with encrypted personal data
After REVERSE: 0 document(s) needing a blind-index update
```

## verifyAfterReverse (exit 0)

```text
> college-portal-server@0.0.0 migrate:pii-encryption
> node scripts/migrate-pii-encryption.js

Mode: DRY RUN
Current encryption key ID: v2

applications: 220 total, 220 with plaintext personal data
  aadhaarNumber: 220 plaintext value(s)
  student.mobile: 220 plaintext value(s)
  student.birthDate: 220 plaintext value(s)
  parent.fatherMobile: 0 plaintext value(s)
  parent.motherMobile: 0 plaintext value(s)
  blind indexes: 0 document(s) needing an update

examforms: 50 total, 50 with plaintext personal data
  details.mobile: 50 plaintext value(s)
  blind indexes: 0 document(s) needing an update

Dry run is the default. Re-run with --apply to encrypt these values.
```
