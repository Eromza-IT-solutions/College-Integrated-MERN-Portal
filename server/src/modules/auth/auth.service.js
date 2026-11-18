// The "brain" of login: finds the user and decides whether the credentials are acceptable.
// It knows nothing about HTTP (no req/res), which keeps it easy to test and to reuse.
import User from '../../models/User.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import AuthToken from '../../models/AuthToken.js';
import env from '../../config/env.js';
import { USER_STATUS, ROLE_VALUES, ROLES, AUTH_TOKEN_PURPOSE, AUTH_TOKEN_TTL_MS } from '../../utils/constants.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail, sendEmailVerificationEmail } from '../../services/emailService.js';
import * as attempts from '../../services/attemptCounter.js';
import { fingerprintIdentifier } from '../../utils/identifierFingerprint.js';

// A fake hash used when no user is found. We still run a password check against it, so a
// "no such user" answer takes about as long as a "wrong password" answer. Without this, an
// attacker could measure the response time to discover which emails/mobiles are registered.
let dummyHash;
const getDummyHash = () => (dummyHash ??= hashPassword('this-is-never-a-real-password'));

// How many whole minutes (at least 1) to tell the visitor to wait.
export const minutesFrom = (seconds) => Math.max(1, Math.ceil(seconds / 60));

/**
 * Check what the person typed. Always returns an object, never throws for "wrong details":
 *   { ok: true,  user }
 *   { ok: false, reason: 'unknownUser' | 'wrongPassword' | 'accountNotActive' | 'noRole', user?, justLocked? }
 *   { ok: false, reason: 'accountLocked' | 'identifierLocked', retryAfterSeconds }      (too many failed attempts)
 * `reason` is for the audit log only. The caller must NOT show it to the visitor,
 * except 'accountNotActive' and 'noRole', which are shown only after the password was correct.
 *
 * ACCOUNT LOCKOUT. After `lockoutThreshold` wrong passwords in a row the account is locked for `lockoutMs`
 * (User.failedLoginCount / User.lockedUntil). While locked, even the CORRECT password is refused, otherwise
 * a guesser could just keep going. A correct sign-in or a password reset sets the counter back to 0.
 * Two details make this hard to get around:
 *   1. The attempt is COUNTED BEFORE the password is checked. If someone fires 50 guesses at the same instant,
 *      only the first few get checked; the rest are refused straight away.
 *   2. Identifiers that do not exist get the same counter and the same "locked" answer (kept in services/
 *      attemptCounter.js). Otherwise "locked" would reveal which emails are registered.
 */
export async function checkCredentials(identifier, password) {
  const { lockoutThreshold, lockoutMs } = env.security;
  let query = null;
  try {
    query = User.findByLoginId(identifier); // email, mobile or Aadhaar; null if it looks like none
  } catch (err) {
    // Thrown when LOGIN_ID_HASH_SECRET is missing (needed to look up an Aadhaar number).
    console.error('Login lookup failed. Is LOGIN_ID_HASH_SECRET set in .env?', err.message);
  }
  const user = query ? await query : null;
  const now = Date.now();

  // ---- unknown identifier: same counter, same answers, same timing as a real account ----
  if (!user) {
    const key = `login-unknown:${fingerprintIdentifier(identifier)}`;
    const { count, resetAt } = await attempts.hit(key, lockoutMs);
    if (count > lockoutThreshold) {
      return { ok: false, reason: 'identifierLocked', retryAfterSeconds: Math.ceil((resetAt - now) / 1000) };
    }
    await verifyPassword(password, await getDummyHash()); // spend the same time as a real check
    const justLocked = count >= lockoutThreshold;
    if (justLocked) await attempts.extendUntil(key, now + lockoutMs); // the lock period starts now
    return { ok: false, reason: 'unknownUser', justLocked, failedAttempts: count };
  }

  // ---- a real account ----
  if (user.lockedUntil && user.lockedUntil.getTime() <= now) {
    // The lock has run out: start again from zero.
    await User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null } });
    user.failedLoginCount = 0;
    user.lockedUntil = null;
  }
  if (user.lockedUntil) {
    return { ok: false, reason: 'accountLocked', user, retryAfterSeconds: Math.ceil((user.lockedUntil.getTime() - now) / 1000) };
  }

  // Count this attempt BEFORE checking the password (see point 1 above). $inc is atomic.
  const counted = await User.findOneAndUpdate({ _id: user._id }, { $inc: { failedLoginCount: 1 } }, { new: true }).select('failedLoginCount');
  const attemptNumber = counted.failedLoginCount;
  const lockUntil = new Date(now + lockoutMs);
  const lockNow = () => User.updateOne({ _id: user._id, lockedUntil: null }, { $set: { lockedUntil: lockUntil } });

  if (attemptNumber > lockoutThreshold) {
    await lockNow(); // arrived while others were already using up the allowance
    return { ok: false, reason: 'accountLocked', user, retryAfterSeconds: Math.ceil(lockoutMs / 1000) };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    const justLocked = attemptNumber >= lockoutThreshold;
    if (justLocked) await lockNow();
    return { ok: false, reason: 'wrongPassword', user, justLocked, failedAttempts: attemptNumber };
  }

  // The password is right, so it is now safe to tell this person why they cannot get in.
  if (user.status !== USER_STATUS.ACTIVE || !ROLE_VALUES.includes(user.role)) {
    await User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0 } }); // a correct password is not a guess
    return { ok: false, reason: user.status !== USER_STATUS.ACTIVE ? 'accountNotActive' : 'noRole', user };
  }
  return { ok: true, user };
}

/** The only user fields the browser may receive. Never the password hash, Aadhaar hash or mobile number. */
export function toSafeUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ? String(user.departmentId) : null,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Remember the time of this login and clear the failed-attempt counter and any lock.
 *  Uses updateOne so no other field is touched or re-validated. */
export function recordLoginTime(userId) {
  return User.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
}

// ---------------------------------------------------------------------------------------------
// Applicant registration and email verification
// ---------------------------------------------------------------------------------------------
const isDuplicateKey = (err) => err?.code === 11000;

/**
 * Create a pending applicant account. The account can sign in only after the emailed link is used.
 * Returns { ok: true, user } or { ok: false, field: 'email' | 'mobile' }.
 */
export async function registerApplicant({ fullName, email, mobile, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile ? String(mobile).trim() : undefined;

  const filter = normalizedMobile
    ? { $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }] }
    : { email: normalizedEmail };
  const existing = await User.findOne(filter).select('email mobile').lean();
  if (existing) return { ok: false, field: existing.email === normalizedEmail ? 'email' : 'mobile' };

  let user;
  try {
    user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      passwordHash: await hashPassword(password),
      role: ROLES.APPLICANT,
      status: USER_STATUS.PENDING,
    });
  } catch (err) {
    if (isDuplicateKey(err)) return { ok: false, field: err.keyPattern?.mobile ? 'mobile' : 'email' };
    throw err;
  }

  const rawToken = await AuthToken.issue(user._id, AUTH_TOKEN_PURPOSE.EMAIL_VERIFICATION);
  const link = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  sendEmailVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    link,
    validHours: AUTH_TOKEN_TTL_MS[AUTH_TOKEN_PURPOSE.EMAIL_VERIFICATION] / 3600000,
  }); // intentionally not awaited; sendEmail never throws
  return { ok: true, user };
}

/** Use the link from the verification email. Returns { ok: true, userId, alreadyVerified } or { ok: false }. */
export async function verifyApplicantEmail(rawToken) {
  const token = await AuthToken.consume(rawToken, AUTH_TOKEN_PURPOSE.EMAIL_VERIFICATION);
  if (!token) return { ok: false };

  const user = await User.findById(token.userId);
  if (!user || [USER_STATUS.DEACTIVATED, USER_STATUS.LOCKED].includes(user.status)) return { ok: false };

  const alreadyVerified = !!user.emailVerifiedAt;
  await User.updateOne(
    { _id: user._id },
    { $set: { status: USER_STATUS.ACTIVE, emailVerifiedAt: user.emailVerifiedAt || new Date() } }
  );
  await AuthToken.updateMany(
    { userId: user._id, purpose: AUTH_TOKEN_PURPOSE.EMAIL_VERIFICATION, usedAt: null },
    { $set: { usedAt: new Date() } }
  );
  return { ok: true, userId: user._id, alreadyVerified };
}

/** Send a fresh verification link. The answer is the same whether or not a pending account exists. */
export async function resendApplicantVerification(email) {
  const user = await User.findOne({ email: email.trim().toLowerCase(), status: USER_STATUS.PENDING });
  if (!user) return { found: false };

  const rawToken = await AuthToken.issue(user._id, AUTH_TOKEN_PURPOSE.EMAIL_VERIFICATION);
  const link = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  sendEmailVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    link,
    validHours: AUTH_TOKEN_TTL_MS[AUTH_TOKEN_PURPOSE.EMAIL_VERIFICATION] / 3600000,
  });
  return { found: true, userId: user._id };
}

// ---------------------------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------------------------
/**
 * Step 1 of "forgot password". Returns { found: boolean }, for the audit log only: the visitor always gets
 * the same answer whether or not the email exists.
 * Only ACTIVE accounts get a link. The email is sent in the background (not awaited), so a real account does
 * not take longer to answer than an unknown one: response time must not reveal which emails are registered.
 */
export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.trim().toLowerCase(), status: USER_STATUS.ACTIVE });
  if (!user) return { found: false };

  const rawToken = await AuthToken.issue(user._id, AUTH_TOKEN_PURPOSE.PASSWORD_RESET); // only its hash is stored
  const link = `${env.clientOrigin}/reset-password?token=${rawToken}`;
  sendPasswordResetEmail({
    to: user.email,
    fullName: user.fullName,
    link,
    validMinutes: AUTH_TOKEN_TTL_MS[AUTH_TOKEN_PURPOSE.PASSWORD_RESET] / 60000,
  }); // intentionally not awaited; sendEmail never throws
  return { found: true, userId: user._id };
}

/**
 * Step 2: use the link. Returns { ok: true, userId } or { ok: false } (wrong, expired, already used, or the
 * account is no longer active: all look the same to the visitor).
 * On success: new password saved, every existing login of this user is cut off, and the token is spent.
 */
export async function resetPasswordWithToken(rawToken, newPassword) {
  const token = await AuthToken.consume(rawToken, AUTH_TOKEN_PURPOSE.PASSWORD_RESET); // valid once, atomically
  if (!token) return { ok: false };

  const user = await User.findById(token.userId);
  if (!user || user.status !== USER_STATUS.ACTIVE) return { ok: false };

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(), // makes every older session invalid (see authenticate.js)
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }
  );
  // Any other reset links this user still holds are void now.
  await AuthToken.updateMany({ userId: user._id, purpose: AUTH_TOKEN_PURPOSE.PASSWORD_RESET, usedAt: null }, { $set: { usedAt: new Date() } });

  sendPasswordChangedEmail({ to: user.email, fullName: user.fullName }); // heads-up in case it was not them
  return { ok: true, userId: user._id };
}
/**
 * Change the password of the signed-in user after checking the current one.
 * Returns { ok: true } or { ok: false, reason: 'notFound' | 'wrongPassword' | 'samePassword' }.
 */
export async function changeOwnPassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || user.status !== USER_STATUS.ACTIVE) return { ok: false, reason: 'notFound' };

  if (!(await verifyPassword(currentPassword, user.passwordHash))) return { ok: false, reason: 'wrongPassword' };
  if (await verifyPassword(newPassword, user.passwordHash)) return { ok: false, reason: 'samePassword' };

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }
  );
  sendPasswordChangedEmail({ to: user.email, fullName: user.fullName });
  return { ok: true };
}

