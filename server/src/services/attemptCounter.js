// A tiny shared counter kept in MongoDB: "how many times has <key> happened in the last <window>?"
//
// Why MongoDB and not a variable in memory? A memory counter lives inside ONE server process. If the app runs on
// two servers (or restarts), each one would count separately and an attacker would get a fresh allowance every
// time. A counter in the database is shared by all servers and survives restarts. Expired counters delete
// themselves (a TTL index), so the collection never grows without limit.
//
// Used by: the rate limiters (middleware/rateLimiters.js) and the "unknown account" attempt counter (auth.service.js).
import mongoose from 'mongoose';

const COLLECTION = 'rate_limits';
const collection = () => mongoose.connection.collection(COLLECTION);

let indexReady = null;
function ensureIndex() {
  // expireAfterSeconds: 0 means "delete the document when its expiresAt time has passed".
  indexReady ??= collection()
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch((err) => { indexReady = null; console.error('Could not create the rate-limit index:', err.message); });
  return indexReady;
}

/**
 * Count one more event for `key`. Returns { count, resetAt } where resetAt is when the counter starts over (ms).
 * The window starts at the FIRST event and is not extended by later ones.
 * It is one atomic database operation, so two requests arriving at the same instant can never both read "4"
 * and both write "5": every request gets its own number.
 */
export async function hit(key, windowMs) {
  await ensureIndex();
  const now = new Date();
  const freshExpiry = new Date(now.getTime() + windowMs);
  // "If a live window exists, add 1 and keep its expiry; otherwise start a new window at 1."
  // (For a brand-new key both fields are missing, the comparison is false, so it starts at 1.)
  const alive = { $gt: ['$expiresAt', now] };
  const update = [{
    $set: {
      hits: { $cond: [alive, { $add: ['$hits', 1] }, 1] },
      expiresAt: { $cond: [alive, '$expiresAt', freshExpiry] },
    },
  }];
  for (let attempt = 0; ; attempt += 1) {
    try {
      const res = await collection().findOneAndUpdate({ _id: key }, update, { upsert: true, returnDocument: 'after' });
      const doc = res?.value ?? res;
      return { count: doc.hits, resetAt: doc.expiresAt.getTime() };
    } catch (err) {
      // Two requests created the same brand-new key at the same moment: one loses; just try again.
      if (err.code !== 11000 || attempt >= 2) throw err;
    }
  }
}

/** Take one event back (used so that successful sign-ins do not count against the IP limit). */
export async function undo(key) {
  await collection().updateOne({ _id: key, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
}

/** Forget a key completely. */
export async function reset(key) {
  await collection().deleteOne({ _id: key });
}

/** Make the counter for `key` last until `untilMs` (used to start a lockout period). */
export async function extendUntil(key, untilMs) {
  await collection().updateOne({ _id: key }, { $set: { expiresAt: new Date(untilMs) } });
}
