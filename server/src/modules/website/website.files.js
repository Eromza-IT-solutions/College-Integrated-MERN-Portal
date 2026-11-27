import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AppError from '../../utils/AppError.js';

/**
 * Pictures and documents for the public website (gallery photos, downloadable PDFs, notice attachments).
 *
 * - Stored under <UPLOAD_DIR>/website/ with a random name; the original name is only kept as a label.
 * - Only the kinds listed below are accepted, and the first bytes of the file must match the kind
 *   (a renamed .exe is refused even if it is called photo.jpg).
 * - Served back at /api/v1/website/files/<name>. Anything that is not a picture or a PDF is sent as a download,
 *   so a browser never runs an uploaded file as a page.
 */

const PREFIX = '/api/v1/website/files/';

const ZIP = (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
const OLE = (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));

// extension -> { mime, kind, check(firstBytes) }
const KINDS = {
  '.jpg': { mime: 'image/jpeg', kind: 'image', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.jpeg': { mime: 'image/jpeg', kind: 'image', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.png': { mime: 'image/png', kind: 'image', check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  '.webp': { mime: 'image/webp', kind: 'image', check: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  '.pdf': { mime: 'application/pdf', kind: 'document', check: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  '.doc': { mime: 'application/msword', kind: 'document', check: OLE },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'document', check: ZIP },
  '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'document', check: ZIP },
  '.ppt': { mime: 'application/vnd.ms-powerpoint', kind: 'document', check: OLE },
  '.pptx': { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'document', check: ZIP },
  '.txt': { mime: 'text/plain; charset=utf-8', kind: 'document', check: (b) => !b.includes(0x00) },
};

// Stored names look like 3f9a...(24 hex).ext; nothing else is ever read from disk.
const NAME = /^[a-f0-9]{24}\.(jpg|jpeg|png|webp|pdf|doc|docx|xlsx|ppt|pptx|txt)$/;

const root = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'), 'website');

const websiteFileUrl = (name) => `${PREFIX}${name}`;

/** The stored name if this link points to one of our uploaded website files, otherwise null. */
function fileNameFromUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(PREFIX)) return null;
  const name = url.slice(PREFIX.length);
  return NAME.test(name) ? name : null;
}

function pathOf(name) {
  if (!NAME.test(String(name || ''))) return null;
  return path.join(root(), name);
}

/** Check and store one uploaded file (from multer's memory storage). */
async function saveWebsiteFile(file) {
  if (!file || !file.buffer || !file.buffer.length) throw new AppError('Choose a file to upload', 400, [{ field: 'file', message: 'Choose a file to upload' }], 'VALIDATION_ERROR');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const kind = KINDS[ext];
  if (!kind) {
    throw new AppError('This kind of file is not allowed. Use JPG, PNG, WEBP, PDF, DOC, DOCX, XLSX, PPT, PPTX or TXT.', 400, [{ field: 'file', message: 'File type not allowed' }], 'VALIDATION_ERROR');
  }
  if (!kind.check(file.buffer.subarray(0, 4096))) {
    throw new AppError('The file does not match its type. Please upload a real file.', 400, [{ field: 'file', message: 'File content does not match its type' }], 'VALIDATION_ERROR');
  }
  const name = `${crypto.randomBytes(12).toString('hex')}${ext}`;
  await fs.mkdir(root(), { recursive: true });
  await fs.writeFile(pathOf(name), file.buffer, { flag: 'wx' });
  // The original name is only a label: drop control characters and characters that could break HTML or headers.
  const label = [...path.basename(String(file.originalname || name))]
    .filter((c) => c.charCodeAt(0) >= 32 && !'<>"\\'.includes(c))
    .join('')
    .slice(0, 200) || name;
  return { url: websiteFileUrl(name), name: label, mimeType: kind.mime.split(';')[0], sizeBytes: file.buffer.length, kind: kind.kind };
}

/** For serving: the bytes and how to send them, or null when there is no such file. */
async function readWebsiteFile(name) {
  const full = pathOf(name);
  if (!full) return null;
  const data = await fs.readFile(full).catch((err) => {
    if (err.code === 'ENOENT') return null;
    throw err;
  });
  if (!data) return null;
  const kind = KINDS[path.extname(name).toLowerCase()];
  const inline = kind.kind === 'image' || kind.mime === 'application/pdf';
  return { data, mime: kind.mime, inline };
}

async function deleteWebsiteFile(name) {
  const full = pathOf(name);
  if (!full) return;
  await fs.unlink(full).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
  });
}

export { saveWebsiteFile, readWebsiteFile, deleteWebsiteFile, fileNameFromUrl, websiteFileUrl };
