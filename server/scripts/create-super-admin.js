// Creates the FIRST Super Admin. This is the only safe way to get one: there is no default
// admin account and no default password anywhere in the code.
//
// Run:  npm run create-super-admin
//   It asks for the full name, email and password (the password is not shown while typing).
//
// For a server where you cannot type interactively, set these variables for this one run only,
// then remove them again:  SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
// Never pass the password as a command-line argument: it would stay in the shell history.
//
// - It refuses to run if a Super Admin already exists (more admins are added from inside the app).
// - Both the success and the refusal are written to the audit log.
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import env from '../src/config/env.js';
import { ROLES, USER_STATUS, AUDIT_OUTCOME } from '../src/utils/constants.js';
import { hashPassword } from '../src/utils/password.js';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEAK_WORDS = ['password', 'passw0rd', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'eromza', 'college'];

export function validateEmail(email) {
  if (!EMAIL_RE.test(email || '')) return 'Enter a valid email address';
  return null;
}

export function validateName(name) {
  if (!name || name.trim().length < 2) return 'Enter the full name (at least 2 characters)';
  return null;
}

// Returns a message if the password is not acceptable, or null if it is fine.
export function validatePassword(password, email = '') {
  if (!password || password.length < 12) return 'Use at least 12 characters';
  if (new Set(password).size < 5) return 'Use a more varied password (too many repeated characters)';
  const lower = password.toLowerCase();
  if (WEAK_WORDS.some((w) => lower.includes(w))) return 'Do not use common words such as "password" or "admin"';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return 'Do not include your email name in the password';
  return null;
}

async function audit(entry) {
  try {
    await AuditLog.record(entry);
  } catch (err) {
    console.error('Warning: could not write the audit log:', err.message);
  }
}

/**
 * Creates the first Super Admin. Returns { created: true, user } or { created: false, reason }.
 * Throws only for unexpected errors.
 */
export async function createSuperAdmin({ fullName, email, password }) {
  if (await User.exists({ role: ROLES.SUPER_ADMIN })) {
    await audit({ action: 'superAdminSetupRefused', entityType: 'user', outcome: AUDIT_OUTCOME.DENIED, details: { reason: 'superAdminExists', via: 'setup-command' } });
    return { created: false, reason: 'A Super Admin already exists. This command only creates the first one; add more admins from inside the app.' };
  }

  const problem = validateName(fullName) || validateEmail(email) || validatePassword(password, email);
  if (problem) return { created: false, reason: problem };

  let user;
  try {
    user = await User.create({
      fullName: fullName.trim(),
      email, // the model lowercases and trims it
      passwordHash: await hashPassword(password),
      role: ROLES.SUPER_ADMIN,
      departmentId: null,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      mustChangePassword: false,
    });
  } catch (err) {
    if (err && err.code === 11000) return { created: false, reason: 'That email address is already used by another account.' };
    throw err;
  }

  await audit({ actorUserId: user._id, action: 'superAdminCreated', entityType: 'user', entityId: user._id, outcome: AUDIT_OUTCOME.SUCCESS, details: { via: 'setup-command' } });
  return { created: true, user };
}

// Reads one line from the terminal. With hidden: true nothing is shown while typing.
export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error('No interactive terminal. Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD for this run instead.'));
      return;
    }
    stdout.write(question);
    let buffer = '';
    const finish = (value) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      resolve(value);
    };
    const onData = (raw) => {
      // Drop arrow keys and other escape sequences, even when they arrive together with other keys.
      const chunk = raw.replace(/\u001b\[[0-9;]*[A-Za-z~]/g, '').replace(/\u001b./g, '');
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') return finish(buffer);
        if (ch === '\u0003') { stdin.setRawMode(false); stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') {
          if (buffer.length) { buffer = buffer.slice(0, -1); if (!hidden) stdout.write('\b \b'); }
        } else if (ch >= ' ') {
          buffer += ch;
          if (!hidden) stdout.write(ch);
        }
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

async function collectInput() {
  const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;
  if (SUPER_ADMIN_NAME && SUPER_ADMIN_EMAIL && SUPER_ADMIN_PASSWORD) {
    return { fullName: SUPER_ADMIN_NAME, email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD };
  }
  const fullName = await ask('Full name: ');
  const email = await ask('Email address: ');
  const password = await ask('Password (12+ characters, not shown): ', { hidden: true });
  const again = await ask('Type the password again: ', { hidden: true });
  if (password !== again) throw new Error('The two passwords do not match. Nothing was created.');
  return { fullName, email, password };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
    try {
      const result = await createSuperAdmin(await collectInput());
      if (!result.created) {
        console.error(`Not created: ${result.reason}`);
        process.exitCode = 1;
      } else {
        console.log(`Super Admin created: ${result.user.email}`);
        console.log('Sign in with the password you just chose. If you used SUPER_ADMIN_* variables, remove them now.');
      }
    } finally {
      await mongoose.connection.close();
    }
  })().catch((err) => { console.error('Setup failed:', err.message); process.exit(1); });
}
