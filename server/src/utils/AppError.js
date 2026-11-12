// An error we raise on purpose, with an HTTP status the client can understand.
// Example: throw new AppError('Department not found', 404);
export class AppError extends Error {
  constructor(message, statusCode = 500, errors, code) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.errors = errors; // optional list of field errors
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
