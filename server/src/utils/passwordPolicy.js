// The rules a NEW password must follow. Used when creating the first Super Admin and when resetting a password,
// so every place that sets a password applies exactly the same rules.
const WEAK_WORDS = ['password', 'passw0rd', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'eromza', 'college'];

// Returns a message if the password is not acceptable, or null if it is fine.
export function validatePassword(password, email = '') {
  if (typeof password !== 'string' || password.length < 12) return 'Use at least 12 characters';
  if (password.length > 128) return 'Use at most 128 characters';
  if (new Set(password).size < 5) return 'Use a more varied password (too many repeated characters)';
  const lower = password.toLowerCase();
  if (WEAK_WORDS.some((w) => lower.includes(w))) return 'Do not use common words such as "password" or "admin"';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return 'Do not include your email name in the password';
  return null;
}
