import fs from 'node:fs/promises';
import mongoose from 'mongoose';

function fail(message) {
  throw new Error(message);
}

const backupFile = process.env.FIELD_ENCRYPTION_BACKUP_FILE;
if (!backupFile) fail('FIELD_ENCRYPTION_BACKUP_FILE is required for the key restore check');
const configuredKey = process.env.FIELD_ENCRYPTION_KEY;
const restoredKey = (await fs.readFile(backupFile, 'utf8')).trim();
const decoded = Buffer.from(restoredKey, 'base64');
if (decoded.length !== 32 || decoded.toString('base64') !== restoredKey) {
  fail('The backed-up key must be 32 bytes encoded as standard base64');
}
if (configuredKey && configuredKey !== restoredKey) {
  fail('The configured key does not match the backed-up key');
}

// Set before importing env.js/fieldCrypto.js: those modules read the key at import time.
process.env.FIELD_ENCRYPTION_KEY = restoredKey;
const env = (await import('../src/config/env.js')).default;
const { decryptField, keyFingerprint } = await import('../src/utils/fieldCrypto.js');

let connection;
try {
  connection = await mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
  const row = await connection.db.collection('applications').findOne({ 'student.mobile': { $regex: '^enc:v1:' } });
  if (!row) fail('No encrypted application mobile number was found in the restored database');
  const mobile = decryptField(row.student.mobile);
  if (!/^\d{10}$/.test(mobile)) fail('The backed-up key did not decrypt a valid mobile number');
  console.log(`KEY_RESTORE keyId=${env.fieldEncryptionKeyId} fingerprint=${keyFingerprint()} decrypt=PASS`);
} finally {
  if (connection) await connection.close();
}
