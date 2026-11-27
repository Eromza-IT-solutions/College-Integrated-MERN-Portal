import crypto from 'node:crypto';
import env from '../config/env.js';

const PREFIX = 'enc:v1:';
const LEGACY_KEY_ID = 'v1';
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function decodeKey(text, label) {
  const buffer = Buffer.from(text, 'base64');
  if (buffer.length !== 32 || buffer.toString('base64') !== text) {
    throw new Error(`${label} must be 32 bytes encoded as standard base64`);
  }
  return buffer;
}

function keys() {
  const map = new Map(
    Object.entries(env.fieldEncryptionPreviousKeys || {}).map(([id, text]) => [id, decodeKey(text, `Previous key ${id}`)])
  );
  map.set(env.fieldEncryptionKeyId, decodeKey(env.fieldEncryptionKey, 'FIELD_ENCRYPTION_KEY'));
  return map;
}

function keyFor(id) {
  const key = keys().get(id);
  if (!key) throw new Error(`No encryption key is configured for key ID ${id}`);
  return key;
}

function currentKeyId() {
  return env.fieldEncryptionKeyId;
}

function keyFingerprint() {
  return crypto.createHash('sha256').update(keys().get(currentKeyId())).digest('hex').slice(0, 16);
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** The key ID embedded in a ciphertext; pre-key-ID values are treated as v1. */
function ciphertextKeyId(value) {
  if (!isEncrypted(value)) return null;
  const parts = value.slice(PREFIX.length).split(':');
  if (parts[0] === 'k') return parts.length === 5 ? parts[1] : null;
  return parts.length === 3 ? LEGACY_KEY_ID : null;
}

function decodedPart(part, length, label) {
  const buffer = Buffer.from(part, 'base64');
  const badLength = length === null ? buffer.length < 1 : buffer.length !== length;
  if (!BASE64.test(part) || badLength || buffer.toString('base64') !== part) {
    throw new Error(`Encrypted field has an invalid ${label}`);
  }
  return buffer;
}

function encryptField(value) {
  if (value === undefined || value === null || value === '') return value;
  const text = String(value);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFor(currentKeyId()), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${PREFIX}k:${currentKeyId()}:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptField(value) {
  if (!isEncrypted(value)) return value;
  const parts = value.slice(PREFIX.length).split(':');
  let id;
  let ivPart;
  let tagPart;
  let dataPart;
  if (parts[0] === 'k') {
    if (parts.length !== 5) throw new Error('Encrypted field is malformed');
    [, id, ivPart, tagPart, dataPart] = parts;
  } else {
    if (parts.length !== 3) throw new Error('Encrypted field is malformed');
    [id, ivPart, tagPart, dataPart] = [LEGACY_KEY_ID, ...parts];
  }
  const iv = decodedPart(ivPart, 12, 'IV');
  const tag = decodedPart(tagPart, 16, 'auth tag');
  const data = decodedPart(dataPart, null, 'ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFor(id), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function needsRewrap(value) {
  return isEncrypted(value) && ciphertextKeyId(value) !== currentKeyId();
}

function encryptDateField(value) {
  if (value === undefined || value === null || value === '') return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Birth date is not valid');
  return encryptField(date.toISOString());
}

function decryptDateField(value) {
  if (!isEncrypted(value)) return value;
  const plain = decryptField(value);
  const date = new Date(plain);
  return Number.isNaN(date.getTime()) ? plain : date;
}

export {
  PREFIX,
  LEGACY_KEY_ID,
  isEncrypted,
  ciphertextKeyId,
  currentKeyId,
  keyFingerprint,
  needsRewrap,
  encryptField,
  decryptField,
  encryptDateField,
  decryptDateField,
};
