import { TEACHING_RULES } from './constants.js';

// Lecture dates are kept as plain "YYYY-MM-DD" text (a calendar day), so time zones can never shift a lecture to
// another day. "Today" is worked out in Indian time.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(text) {
  if (typeof text !== 'string' || !DATE_RE.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

/** Today's date at the college, as "YYYY-MM-DD". */
function todayAtCollege(now = new Date()) {
  return new Date(now.getTime() + TEACHING_RULES.collegeUtcOffsetMinutes * 60000).toISOString().slice(0, 10);
}

/** Day of the week: 1 = Monday ... 7 = Sunday. */
function weekdayOf(text) {
  const d = new Date(`${text}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Whole days from one date text to another (to - from). */
function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
}

export { isValidDateString, todayAtCollege, weekdayOf, daysBetween };
