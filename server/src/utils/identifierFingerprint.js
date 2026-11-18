// Turns "what the person typed in the sign-in box" into a short, private fingerprint, so the database can COUNT
// attempts per person without ever STORING their email, mobile or Aadhaar number.
//
// Two ideas make it safe:
//
// 1. CANONICAL FORM. "9876543210", "98765 43210" and "+91 98765-43210" are the same mobile number. We reduce all
//    of them to one standard spelling first, using the same parseLoginId() the sign-in lookup uses. Result: every
//    spelling is counted together, exactly as it is for a real account (whose lock belongs to the account).
//    If the counting depended on spelling, an attacker could change the spelling and see whether the answer
//    changes, which would reveal whether a number is registered.
//
// 2. KEYED HASH (HMAC-SHA256). A plain SHA-256 can be reversed by guessing: anyone can hash every 10-digit
//    mobile number (only 10 billion) and compare. HMAC mixes in a SECRET key (RATE_LIMIT_HASH_SECRET) that is not in
//    the database, so a stolen copy of the database alone cannot be matched against guesses.
//
// The identifier TYPE (email / mobile / aadhaar / other) is part of what is hashed, so a value of one kind can
// never produce the same fingerprint as a value of another kind.
import crypto from 'node:crypto';
import env from '../config/env.js';
import { parseLoginId } from './loginId.js';

/**
 * The one standard spelling of what was typed: { type, value }.
 *   "Aman@Demo.example"   -> { type: 'email',   value: 'aman@demo.example' }
 *   "+91 98765-43210"     -> { type: 'mobile',  value: '9876543210' }
 *   "1234 5678 9012"      -> { type: 'aadhaar', value: '123456789012' }
 *   anything else         -> { type: 'other',   value: <trimmed, lower-case text> }
 * "other" can never belong to a real account (it is none of the three accepted kinds), so its exact spelling
 * does not matter for privacy.
 */
export function canonicalIdentifier(input) {
  const text = typeof input === 'string' ? input : String(input ?? '');
  const parsed = parseLoginId(text);
  if (parsed) return parsed;
  return { type: 'other', value: text.trim().toLowerCase() };
}

/**
 * A 32-character hexadecimal fingerprint (128 bits) of the canonical identifier.
 * Same person + same secret = same fingerprint, however the identifier was typed.
 * Without the secret, the fingerprint cannot be turned back into the identifier or matched against guesses.
 */
export function fingerprintIdentifier(input) {
  const { type, value } = canonicalIdentifier(input);
  return crypto.createHmac('sha256', env.rateLimitHashSecret).update(`${type}:${value}`).digest('hex').slice(0, 32);
}
