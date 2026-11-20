// CSRF defence, second layer (the first is the SameSite=Lax session cookie).
//
// A browser ALWAYS adds an "Origin" header to a cross-site POST/PUT/PATCH/DELETE. If that header is
// present and is not our own frontend, the request came from another website and is refused.
// Requests with no Origin header (curl, server-to-server, tests) are not browser form attacks, so
// they pass; they still need a valid session cookie and permission like everyone else.
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const clean = (value) => String(value).trim().replace(/\/+$/, '').toLowerCase();

export function originCheck(allowedOrigin = env.clientOrigin) {
  const allowed = clean(allowedOrigin);
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin === undefined) return next();
    if (clean(origin) === allowed) return next();
    return next(new AppError('This request was blocked because it came from an untrusted website.', 403, undefined, 'CSRF_BLOCKED'));
  };
}

export default originCheck;
