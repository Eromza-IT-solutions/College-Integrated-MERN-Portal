import crypto from 'crypto';

// People may sign in with their email, mobile number or Aadhaar number, plus their password.
// This file only works out which of the three was typed and prepares it for the database lookup.

/**
 * Looks at what was typed in the "email, mobile or Aadhaar" box.
 *   "Aman@Demo.example"  -> { type: 'email', value: 'aman@demo.example' }
 *   "98765 43210"        -> { type: 'mobile', value: '9876543210' }
 *   "+91 98765 43210"    -> { type: 'mobile', value: '9876543210' }
 *   "1234-5678-9012"     -> { type: 'aadhaar', value: '123456789012' }
 * Anything else returns null (so the caller can answer with the same "wrong details" message).
 */
function parseLoginId(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (!text) return null;
  if (text.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? { type: 'email', value: text.toLowerCase() } : null;
  }
  if (!/^\+?[\d\s-]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  if (text.startsWith('+')) {
    const national = digits.startsWith('91') ? digits.slice(2) : digits;
    return /^\d{10}$/.test(national) ? { type: 'mobile', value: national } : null;
  }
  if (digits.length === 10) return { type: 'mobile', value: digits };
  if (digits.length === 12) return { type: 'aadhaar', value: digits };
  return null;
}

/**
 * Aadhaar numbers are never stored for login as they are. We keep a keyed hash (HMAC-SHA256), which lets us
 * find the person who types their number but does not reveal the number if the database leaks.
 * Needs LOGIN_ID_HASH_SECRET in .env (a long random text, kept private; changing it later breaks Aadhaar sign-in).
 */
function hashAadhaar(number) {
  const secret = process.env.LOGIN_ID_HASH_SECRET;
  if (!secret || secret.length < 16) throw new Error('Set LOGIN_ID_HASH_SECRET in .env (at least 16 characters)');
  const digits = String(number || '').replace(/\D/g, '');
  if (!/^\d{12}$/.test(digits)) throw new Error('Aadhaar number must be 12 digits');
  return crypto.createHmac('sha256', secret).update(digits).digest('hex');
}

export { parseLoginId, hashAadhaar };
