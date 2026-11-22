import crypto from 'node:crypto';
import env from '../config/env.js';
import { decryptField } from './fieldCrypto.js';

function mobileDigits(value) {
  const plain = decryptField(value);
  const digits = String(plain ?? '').replace(/\D/g, '');
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** Keyed blind index for exact-mobile lookup; never derived from ciphertext. */
function hashMobile(value) {
  const digits = mobileDigits(value);
  if (!digits) return null;
  if (!env.loginIdHashSecret || env.loginIdHashSecret.length < 16) {
    throw new Error('LOGIN_ID_HASH_SECRET must be at least 16 characters to build a mobile blind index');
  }
  return crypto.createHmac('sha256', env.loginIdHashSecret)
    .update(`admission-mobile:v1:${digits}`)
    .digest('hex');
}

export { hashMobile, mobileDigits };
