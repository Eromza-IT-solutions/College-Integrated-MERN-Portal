// Wrap async route handlers so a thrown error reaches the error middleware.
// Usage: router.get('/x', asyncHandler(async (req, res) => { ... }));
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export default asyncHandler;
