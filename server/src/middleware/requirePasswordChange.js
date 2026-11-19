import AppError from '../utils/AppError.js';

export function requirePasswordChange(req, res, next) {
  if (req.user?.mustChangePassword) {
    return next(new AppError(
      'Change your password before using the portal.',
      403,
      undefined,
      'PASSWORD_CHANGE_REQUIRED'
    ));
  }
  return next();
}

export default requirePasswordChange;
