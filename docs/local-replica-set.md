# Local development: single-node replica set

The API uses MongoDB transactions for payments, refunds and admission state changes. MongoDB rejects transactions on a standalone server with:

```text
Transaction numbers are only allowed on a replica set member or mongos
```

Use a single-node replica set locally, even though there is only one machine. This is the same shape used by the automated tests (`MongoMemoryReplSet`) and the restore drill.

## Start MongoDB

Install MongoDB Community Server and create a data directory:

```powershell
mkdir C:\data\rs0
mongod --replSet rs0 --dbpath C:\data\rs0 --port 27017 --bind_ip 127.0.0.1
```

In another terminal, initialise the set once:

```powershell
mongosh "mongodb://127.0.0.1:27017" --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

Wait until `rs.status().myState` is `1` (PRIMARY).

On macOS/Linux the equivalent is:

```bash
mkdir -p ~/data/rs0
mongod --replSet rs0 --dbpath ~/data/rs0 --port 27017 --bind_ip 127.0.0.1
mongosh "mongodb://127.0.0.1:27017" --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

## Configure the API

In `server/.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/eromza?replicaSet=rs0
NODE_ENV=development
PAYMENT_GATEWAY=fake
FIELD_ENCRYPTION_KEY=<32 random bytes as standard base64>
```

Generate a local encryption key with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never use the test fallback key with real data. See `docs/pii-storage.md`.

## First-time setup

```powershell
cd server
npm install
$env:SYNC_INDEXES_CONFIRMED = 'yes'
npm run sync:indexes
npm run seed
npm run seed:programs
npm run seed:fees
```

Choose only the seed commands needed for the work; `seed:subjects` prunes rows not present in the JSON catalog, so back up first.

Run the API and client:

```powershell
npm run dev
```

```powershell
cd client
npm run dev
```

## Verify the replica set

```powershell
mongosh "mongodb://127.0.0.1:27017/eromza?replicaSet=rs0" --eval "rs.status().myState"
node scripts/check-counter.js
npm run verify:restore-drill
```

`check-counter` verifies concurrent atomic updates. `verify:restore-drill` starts its own temporary replica sets and needs `mongodump`/`mongorestore` (see `docs/runbook.md`).

## Stopping

Stop `mongod` with `Ctrl+C`. The data directory remains; restart it with the same `--replSet rs0 --dbpath` command.
