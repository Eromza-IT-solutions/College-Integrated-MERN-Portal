import env from '../config/env.js';

// One place that turns every error into the same JSON shape:
// { success: false, error: { code, message, errors? }, meta: { requestId } }
export function errorHandler(err, req, res, _next) {
  let status = err.statusCode ?? err.status ?? 500;
  let code = err.code ?? 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';
  let errors = err.errors;

  // Mongoose validation failed (required field, bad enum, ...)
  if (err.name === 'ValidationError' && err.errors && !err.isOperational) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Bad ObjectId or wrong type in a query
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_VALUE';
    message = `Invalid value for ${err.path}`;
  }

  // Duplicate key (unique index), for example the same email twice
  if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    message = `${field} already exists`;
  }

  // Unexpected errors: log them, but do not leak details to the client in production.
  if (status >= 500) {
    console.error(err);
    if (env.nodeEnv === 'production') message = 'Internal server error';
  }

  const error = { code, message };
  if (errors) error.errors = errors;

  res.status(status).json({
    success: false,
    error,
    meta: { requestId: req.id },
  });
}
