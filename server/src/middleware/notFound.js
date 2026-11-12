import AppError from '../utils/AppError.js';

// Runs when no route matched the request.
export function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, undefined, 'NOT_FOUND'));
}
