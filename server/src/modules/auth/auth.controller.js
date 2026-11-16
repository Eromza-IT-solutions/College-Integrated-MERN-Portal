// Handles the HTTP side of login: reads the request, calls the service, builds the response.
import { z } from 'zod';
import { promisify } from 'node:util';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import AuditLog from '../../models/AuditLog.js';
import { AUDIT_OUTCOME, USER_STATUS } from '../../utils/constants.js';
import { parseLoginId } from '../../utils/loginId.js';
import { endSession } from '../../config/session.js';
import { getPermissionsForRole } from '../../services/permissionService.js';
import { validatePassword } from '../../utils/passwordPolicy.js';
import { checkCredentials, toSafeUser, recordLoginTime, requestPasswordReset, resetPasswordWithToken, minutesFrom } from './auth.service.js';

// What the browser must send. `identifier` is the existing name used by the login form.
// Limits stop absurdly large inputs (very long passwords make the password check slow).
const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});

// Writes an audit row but never lets a logging problem break (or change) the login answer.
// Only non-sensitive facts go in: the TYPE of identifier (email/mobile/aadhaar), never its value.
function audit(req, { action, outcome, userId = null, details = {} }) {
  const identifierType = parseLoginId(req.body?.identifier)?.type ?? 'unrecognised';
  return AuditLog.record({
    actorUserId: userId,
    action,
    entityType: 'user',
    entityId: userId,
    outcome,
    ip: req.ip,
    details: { identifierType, ...details },
  }).catch((err) => console.error('Could not write audit log:', err.message));
}

export const login = asyncHandler(async (req, res) => {
  // 1. Validate the shape of the request.
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(
      'Enter your email, mobile number or Aadhaar number, and your password.',
      400,
      parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      'VALIDATION_ERROR'
    );
  }
  const { identifier, password } = parsed.data;

  // 2. Find the user and check the password and account status.
  const result = await checkCredentials(identifier, password);

  if (!result.ok) {
    // Too many failed attempts: refuse, even before looking at the password. Real and non-existent accounts get
    // exactly the same answer, so this reveals nothing about which accounts exist.
    if (result.reason === 'accountLocked' || result.reason === 'identifierLocked') {
      await audit(req, {
        action: 'loginBlocked',
        outcome: AUDIT_OUTCOME.DENIED,
        userId: result.user?._id ?? null,
        details: { reason: result.reason, retryAfterSeconds: result.retryAfterSeconds },
      });
      res.set('Retry-After', String(Math.max(1, result.retryAfterSeconds)));
      const minutes = minutesFrom(result.retryAfterSeconds);
      throw new AppError(
        `Too many failed sign-in attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or reset your password.`,
        429,
        undefined,
        'LOGIN_LOCKED'
      );
    }

    // This attempt was the one that triggered the lock: record it as its own security event.
    if (result.justLocked) {
      await audit(req, {
        action: 'accountLocked',
        outcome: AUDIT_OUTCOME.DENIED,
        userId: result.user?._id ?? null,
        details: { subject: result.user ? 'knownAccount' : 'unknownIdentifier', failedAttempts: result.failedAttempts },
      });
    }

    await audit(req, {
      action: 'loginFailed',
      outcome: result.reason === 'accountNotActive' || result.reason === 'noRole' ? AUDIT_OUTCOME.DENIED : AUDIT_OUTCOME.FAILED,
      userId: result.user?._id ?? null,
      details: { reason: result.reason },
    });

    if (result.reason === 'accountNotActive') {
      const pending = result.user.status === USER_STATUS.PENDING;
      throw new AppError(
        pending
          ? 'Your account is not activated yet. Please verify your email or contact the college office.'
          : 'This account is not active. Please contact the college office.',
        403,
        undefined,
        'ACCOUNT_NOT_ACTIVE'
      );
    }
    if (result.reason === 'noRole') {
      throw new AppError('This account is not set up correctly. Please contact the college office.', 403, undefined, 'ACCOUNT_NOT_CONFIGURED');
    }
    // unknown user, wrong password: the SAME answer, so nobody can tell which one it was.
    throw new AppError('Invalid credentials. Please check your details and try again.', 401, undefined, 'INVALID_CREDENTIALS');
  }

  const { user } = result;

  // 3. Start a brand-new session. regenerate() gives a new session id, so an id that an attacker
  //    planted in the browser before login (session fixation) becomes useless.
  await promisify(req.session.regenerate.bind(req.session))();
  req.session.userId = String(user._id); // only the id is stored; the role is always read from the database
  req.session.loginAt = Date.now(); // lets a later password reset cut off logins that started before it
  await promisify(req.session.save.bind(req.session))(); // make sure it is stored before we answer

  await recordLoginTime(user._id);
  await audit(req, { action: 'loginSuccess', outcome: AUDIT_OUTCOME.SUCCESS, userId: user._id, details: { role: user.role } });

  // 4. Answer. Login responses must never be cached by the browser or a proxy.
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: {
      user: toSafeUser(user),
      permissions: await getPermissionsForRole(user.role),
    },
    meta: { requestId: req.id },
  });
});

// GET /auth/me - who am I? Used by the frontend on page load/refresh to find out whether the
// session is still valid. `authenticate` has already checked the session and filled req.user.
export const me = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: { user: req.user, permissions: await getPermissionsForRole(req.user.role) },
    meta: { requestId: req.id },
  });
});

// POST /auth/logout - ends the session. Safe to call twice: logging out when you are already
// logged out is not an error, you simply end up logged out.
export const logout = asyncHandler(async (req, res) => {
  const userId = req.session?.userId ?? null;
  await endSession(req, res);

  if (userId) {
    await AuditLog.record({
      actorUserId: userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      outcome: AUDIT_OUTCOME.SUCCESS,
      ip: req.ip,
    }).catch((err) => console.error('Could not write audit log:', err.message));
  }

  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data: { loggedOut: true }, meta: { requestId: req.id } });
});

// ---------------------------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------------------------
const forgotSchema = z.object({ email: z.string().trim().email().max(254) });
const resetSchema = z.object({ token: z.string().trim().min(10).max(200), password: z.string().min(1).max(128) });

// POST /auth/forgot-password - ALWAYS answers the same way, whether or not the email is registered.
export const forgotPassword = asyncHandler(async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Enter a valid email address.', 400, undefined, 'VALIDATION_ERROR');

  const result = await requestPasswordReset(parsed.data.email);
  // The audit row never contains the email or the link.
  await AuditLog.record({
    actorUserId: result.userId ?? null,
    action: 'passwordResetRequested',
    entityType: 'user',
    entityId: result.userId ?? null,
    outcome: result.found ? AUDIT_OUTCOME.SUCCESS : AUDIT_OUTCOME.FAILED,
    ip: req.ip,
    details: result.found ? {} : { reason: 'noActiveAccount' },
  }).catch((err) => console.error('Could not write audit log:', err.message));

  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: { message: 'If an account exists for that email, a password reset link has been sent. The link expires in 30 minutes.' },
    meta: { requestId: req.id },
  });
});

// POST /auth/reset-password - { token, password }
export const resetPassword = asyncHandler(async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('The reset link or the new password is missing.', 400, undefined, 'VALIDATION_ERROR');
  const { token, password } = parsed.data;

  // Check the new password BEFORE using the token, so a too-weak password does not waste the (one-time) link.
  const problem = validatePassword(password);
  if (problem) throw new AppError(problem, 400, [{ field: 'password', message: problem }], 'WEAK_PASSWORD');

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    await AuditLog.record({
      action: 'passwordResetFailed',
      entityType: 'user',
      outcome: AUDIT_OUTCOME.FAILED,
      ip: req.ip,
      details: { reason: 'invalidOrExpiredToken' }, // the token itself is never logged
    }).catch((err) => console.error('Could not write audit log:', err.message));
    throw new AppError('This reset link is invalid or has expired. Please request a new one.', 400, undefined, 'INVALID_OR_EXPIRED_TOKEN');
  }

  await AuditLog.record({
    actorUserId: result.userId,
    action: 'passwordResetCompleted',
    entityType: 'user',
    entityId: result.userId,
    outcome: AUDIT_OUTCOME.SUCCESS,
    ip: req.ip,
  }).catch((err) => console.error('Could not write audit log:', err.message));

  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: { message: 'Your password has been changed. Please sign in with your new password.' },
    meta: { requestId: req.id },
  });
});
