import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import { USER_STATUS, ROLE_VALUES } from '../utils/constants.js';
import { endSession } from '../config/session.js';
import { toSafeUser } from '../modules/auth/auth.service.js';

/**
 * "Who is making this request?"  Put it in front of any route that needs a logged-in user:
 *   router.get('/me', authenticate, me);
 *   router.get('/notices', authenticate, requirePermission('notices', 'view'), listNotices);
 *
 * It looks at the session (found through the cookie), loads the user from the database and
 * checks that the account is still allowed in. Then it sets
 *   req.user = { id, fullName, email, role, departmentId, mustChangePassword }
 * which is exactly what requirePermission() reads. The role always comes from the DATABASE,
 * never from the browser and never from the session, so a role change applies immediately.
 *
 *   no session / unknown user / account no longer active / password changed since login  ->  401, session destroyed
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) throw new AppError('Please sign in.', 401, undefined, 'UNAUTHENTICATED');

  // A corrupted session value must not crash the query.
  const user = mongoose.isValidObjectId(userId) ? await User.findById(userId) : null;

  const stillAllowed = user && user.status === USER_STATUS.ACTIVE && ROLE_VALUES.includes(user.role);
  // A login that started before the password was last changed (reset) is no longer valid.
  const staleLogin = user?.passwordChangedAt && !(req.session.loginAt >= user.passwordChangedAt.getTime());
  if (!stillAllowed || staleLogin) {
    // The account was deleted, deactivated or locked after login: end this session right now.
    await endSession(req, res);
    throw new AppError('Your session has ended. Please sign in again.', 401, undefined, 'UNAUTHENTICATED');
  }

  req.user = toSafeUser(user);
  next(); // hand over to the next middleware or the route handler
});

export default authenticate;
