// Login sessions. A "session" is the server remembering who you are between requests.
// The browser holds only a random id in a cookie; the real data lives in MongoDB.
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import env from './env.js';

const isProduction = env.nodeEnv === 'production';

// Cookie rules. Exported so tests and logout use exactly the same values.
export const cookieOptions = Object.freeze({
  httpOnly: true, // JavaScript in the page cannot read the cookie, so an XSS bug cannot steal it
  secure: isProduction, // production: sent only over HTTPS
  sameSite: 'lax', // not sent on requests started by other websites (basic CSRF protection)
  maxAge: env.sessionMaxAgeMs,
});

// Where sessions are saved. In tests we use memory so no database is needed.
function buildStore() {
  if (env.nodeEnv === 'test') return undefined; // express-session's built-in memory store
  return MongoStore.create({
    // Reuse the connection that server.js opens, instead of making a second one.
    clientPromise: mongoose.connection.asPromise().then((conn) => conn.getClient()),
    collectionName: 'sessions',
    ttl: Math.ceil(env.sessionMaxAgeMs / 1000), // MongoDB deletes expired sessions automatically
    touchAfter: 60, // do not rewrite the session more than once a minute when only "touched"
  });
}

/** Creates the session middleware. `overrides` lets tests change a setting. */
export function createSessionMiddleware(overrides = {}) {
  return session({
    name: env.sessionName,
    secret: env.sessionSecret || 'test-only-secret-not-for-real-use',
    store: buildStore(),
    resave: false, // do not save a session that did not change
    saveUninitialized: false, // do not give a cookie to visitors who never logged in
    rolling: true, // every request restarts the idle timer, so active users are not logged out
    proxy: isProduction ? true : undefined, // trust the host's HTTPS proxy so "secure" cookies work
    cookie: { ...cookieOptions },
    ...overrides,
  });
}

/**
 * Ends the login for good: deletes the session from the store AND tells the browser to drop the cookie.
 * After this, the old cookie value is worthless even if someone copied it earlier.
 */
export function endSession(req, res) {
  // The cookie must be cleared with the same settings it was created with, but without maxAge.
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
  return new Promise((resolve, reject) => {
    const clear = () => res.clearCookie(env.sessionName, clearOptions);
    if (!req.session) { clear(); resolve(); return; }
    req.session.destroy((err) => {
      clear();
      if (err) reject(err);
      else resolve();
    });
  });
}
