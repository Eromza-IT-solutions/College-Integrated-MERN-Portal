# Production database provisioning

Status: required before go-live. These commands are for the external MongoDB administrator; the application has not been connected to production and no production user has been created by this work.

The application connects with `autoIndex: false` (see `server/src/config/db.js`). Indexes are created only by the deploy step `npm run sync:indexes`, which requires `SYNC_INDEXES_CONFIRMED=yes`. Do not grant the application user `dbAdmin`, `readWriteAnyDatabase`, or any role that includes `dropDatabase`.

## Users and least privilege

Create three users in the application database (`$db` below is the real database name):

| User | Purpose | Data privileges | Index privileges |
| --- | --- | --- | --- |
| `portalApp` | Runtime API | `find` on all collections; `insert`, `update`, `remove` on all collections **except** `auditlogs`; `insert` and `find` on `auditlogs` | None at runtime |
| `portalDeploy` | `npm run sync:indexes` | `find` only, so it can inspect collections but cannot change data | `createIndex`, `dropIndex`, `listIndexes`, `collStats` |
| `portalMigrate` | Migration/apply runs from the runbook | Same data privileges as `portalApp` | `createIndex`, `dropIndex`, `listIndexes` |

`auditlogs` is append-only from the application's point of view: the API may insert and search rows, but cannot update or delete them. The Mongoose model also rejects updates and deletes; the database role is defence in depth.

`dropDatabase` is deliberately excluded from every role. Restore and destructive index rollback stay with the external administrator using the runbook's `mongorestore --drop` step.

## Example provisioning (run by the MongoDB admin)

```javascript
use <appDatabase>

db.createRole({
  role: 'portalAppRole',
  privileges: [
    { resource: { db: '<appDatabase>', collection: '' }, actions: ['find', 'insert', 'update', 'remove'] },
    { resource: { db: '<appDatabase>', collection: 'auditlogs' }, actions: ['find', 'insert'] }
  ],
  roles: []
});

db.createRole({
  role: 'portalIndexRole',
  privileges: [
    { resource: { db: '<appDatabase>', collection: '' }, actions: ['find', 'listIndexes', 'collStats'] },
    { resource: { db: '<appDatabase>', collection: '' }, actions: ['createIndex', 'dropIndex'] }
  ],
  roles: []
});

db.createUser({ user: 'portalApp', pwd: '<secret>', roles: [{ role: 'portalAppRole', db: '<appDatabase>' }] });
db.createUser({ user: 'portalDeploy', pwd: '<secret>', roles: [{ role: 'portalIndexRole', db: '<appDatabase>' }] });
db.createUser({ user: 'portalMigrate', pwd: '<secret>', roles: [
  { role: 'portalAppRole', db: '<appDatabase>' },
  { role: 'portalIndexRole', db: '<appDatabase>' }
] });
```

MongoDB applies the unrestricted `collection: ''` privileges to `auditlogs` as well, so `portalAppRole` cannot simply be a single grant. If the deployment requires strict collection-level separation, grant `find`, `insert`, `update` and `remove` per application collection and only `find`/`insert` on `auditlogs` instead of using the wildcard resource.

## Verification the admin should run

```javascript
use <appDatabase>
db.runCommand({ usersInfo: 'portalApp', showPrivileges: true })
```

Confirm that `dropDatabase` is absent and that no action other than `find`/`insert` is present for `auditlogs`. Repeat for `portalDeploy` and `portalMigrate`.

After provisioning, the deploy step is:

```powershell
cd server
$env:MONGODB_URI = '<portalDeploy connection string>'
$env:SYNC_INDEXES_CONFIRMED = 'yes'
npm run sync:indexes
```

## Remaining blocker

This document specifies the required roles, but a MongoDB administrator must create them and confirm the privilege check above. Until that is done, production deployment is blocked.
