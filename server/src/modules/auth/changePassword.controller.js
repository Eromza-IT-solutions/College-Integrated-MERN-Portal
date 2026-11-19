import { z } from 'zod';
import AppError from '../../utils/AppError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import AuditLog from '../../models/AuditLog.js';
import { AUDIT_OUTCOME } from '../../utils/constants.js';
import { validatePassword } from '../../utils/passwordPolicy.js';
import { changeOwnPassword } from './auth.service.js';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
}).strict();

export const changePassword = asyncHandler(async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(
      'Enter your current password and a new password.',
      400,
      parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      'VALIDATION_ERROR'
    );
  }

  const problem = validatePassword(parsed.data.newPassword, req.user.email);
  if (problem) throw new AppError(problem, 400, [{ field: 'newPassword', message: problem }], 'WEAK_PASSWORD');

  const result = await changeOwnPassword(req.user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    if (result.reason === 'samePassword') {
      throw new AppError('Choose a password different from your current one.', 400, [{ field: 'newPassword', message: 'Choose a different password' }], 'SAME_PASSWORD');
    }
    await AuditLog.record({
      actorUserId: req.user.id,
      action: 'passwordChangeFailed',
      entityType: 'user',
      entityId: req.user.id,
      outcome: AUDIT_OUTCOME.DENIED,
      ip: req.ip,
      details: { reason: result.reason },
    }).catch((err) => console.error('Could not write audit log:', err.message));
    throw new AppError('Your current password is not correct.', 400, [{ field: 'currentPassword', message: 'Current password is not correct' }], 'WRONG_PASSWORD');
  }

  req.session.loginAt = Date.now();
  await new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

  await AuditLog.record({
    actorUserId: req.user.id,
    action: 'passwordChanged',
    entityType: 'user',
    entityId: req.user.id,
    outcome: AUDIT_OUTCOME.SUCCESS,
    ip: req.ip,
  }).catch((err) => console.error('Could not write audit log:', err.message));

  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: { message: 'Your password has been changed.' },
    meta: { requestId: req.id },
  });
});
