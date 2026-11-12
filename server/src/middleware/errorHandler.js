export function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500
  const message = status >= 500 ? 'Internal server error' : err.message

  if (status >= 500) {
    console.error(err)
  }

  res.status(status).json({
    success: false,
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message,
    },
    meta: { requestId: req.id },
  })
}
