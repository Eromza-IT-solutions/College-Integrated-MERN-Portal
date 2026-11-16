// Sends email. One place for everything that leaves the server by email, so the rest of the code never
// touches SMTP details.
//
// Three modes, chosen automatically:
//   smtp      SMTP_HOST and EMAIL_FROM are set  -> real email is sent through that SMTP server
//   console   not configured, NODE_ENV=development -> NOTHING is sent. The message is printed in the server
//                                                     console so a developer can copy the reset link. (DEV ONLY)
//   disabled  not configured, any other NODE_ENV  -> NOTHING is sent. An error is logged. Reset links are
//                                                     never printed, so no secret leaks into production logs.
import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transport = null; // created on first use
let overrideTransport = null; // tests can plug in a fake one

export function emailMode() {
  if (overrideTransport) return 'smtp';
  if (env.smtp.host && env.smtp.from) return 'smtp';
  return env.nodeEnv === 'development' ? 'console' : 'disabled';
}

export function describeEmailMode() {
  const mode = emailMode();
  if (mode === 'smtp') return `SMTP (${env.smtp.host || 'custom transport'})`;
  if (mode === 'console') return 'NOT CONFIGURED - development mode: emails are printed in this console, not sent';
  return 'NOT CONFIGURED - emails are NOT being sent. Set SMTP_HOST and EMAIL_FROM in .env';
}

/** For tests only: replace the real SMTP connection with a fake that records messages. */
export function setEmailTransportForTests(fake) {
  overrideTransport = fake;
}

function getTransport() {
  if (overrideTransport) return overrideTransport;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      // Some internal relays need no login, so only add auth when a user is configured.
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transport;
}

/**
 * Send one email. Resolves to { sent: true } or { sent: false, mode }. It NEVER throws: an email problem must
 * not break the request that asked for it (and must not reveal anything to the visitor).
 */
export async function sendEmail({ to, subject, text, html }) {
  const mode = emailMode();
  try {
    if (mode === 'smtp') {
      await getTransport().sendMail({ from: env.smtp.from, to, subject, text, html });
      return { sent: true, mode };
    }
    if (mode === 'console') {
      console.log(`\n--- EMAIL (not sent; development console mode) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n--- end of email ---\n`);
    } else {
      console.error(`Email NOT sent (SMTP is not configured): "${subject}"`);
    }
    return { sent: false, mode };
  } catch (err) {
    console.error(`Email to the user failed (${mode}): ${err.message}`); // never include the message body here
    return { sent: false, mode, error: true };
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function sendPasswordResetEmail({ to, fullName, link, validMinutes }) {
  const text =
`Hello ${fullName},

We received a request to reset the password of your EROMZA College Portal account.
Open this link to choose a new password (it works once and expires in ${validMinutes} minutes):

${link}

If you did not ask for this, ignore this email. Your password stays the same.`;
  const html =
`<p>Hello ${escapeHtml(fullName)},</p>
<p>We received a request to reset the password of your EROMZA College Portal account.</p>
<p><a href="${escapeHtml(link)}">Choose a new password</a><br>This link works once and expires in ${validMinutes} minutes.</p>
<p>If you did not ask for this, ignore this email. Your password stays the same.</p>`;
  return sendEmail({ to, subject: 'Reset your EROMZA College Portal password', text, html });
}

export function sendPasswordChangedEmail({ to, fullName }) {
  const text =
`Hello ${fullName},

The password of your EROMZA College Portal account was just changed, and you were signed out everywhere.
If this was not you, contact the college office immediately.`;
  const html =
`<p>Hello ${escapeHtml(fullName)},</p>
<p>The password of your EROMZA College Portal account was just changed, and you were signed out everywhere.</p>
<p>If this was not you, contact the college office immediately.</p>`;
  return sendEmail({ to, subject: 'Your EROMZA College Portal password was changed', text, html });
}
