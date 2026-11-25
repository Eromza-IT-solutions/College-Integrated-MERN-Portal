import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

function fullPathOf(storageKey) {
  const base = root();
  const full = path.resolve(base, ...String(storageKey || '').split('/'));
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

async function saveUploadedFile({ applicationId, type, file, extension }) {
  const name = `${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
  const storageKey = path.posix.join('admissions', String(applicationId), name);
  const full = fullPathOf(storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, file.buffer, { flag: 'wx' });
  return storageKey;
}

async function deleteStoredFile(storageKey) {
  const full = fullPathOf(storageKey);
  if (!full) return;
  await fs.unlink(full).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
  });
}

async function readStoredFile(storageKey) {
  const full = fullPathOf(storageKey);
  if (!full) return null;
  return fs.readFile(full);
}

export { saveUploadedFile, deleteStoredFile, readStoredFile };
