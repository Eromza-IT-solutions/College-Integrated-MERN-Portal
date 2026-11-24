import path from 'node:path';
import AppError from './AppError.js';
import { DOCUMENT_RULES } from './constants.js';

const EXTENSIONS = Object.freeze({ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] });
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const FORBIDDEN_SIGNATURES = Object.freeze([
  { bytes: Buffer.from('PK\x03\x04'), name: 'archive' },
  { bytes: Buffer.from('PK\x05\x06'), name: 'archive' },
  { bytes: Buffer.from('PK\x07\x08'), name: 'archive' },
  { bytes: Buffer.from('Rar!\x1a\x07'), name: 'archive' },
  { bytes: Buffer.from('377abcaf271c', 'hex'), name: 'archive' },
  { bytes: Buffer.from('MZ'), name: 'executable' },
  { bytes: Buffer.from('\x7fELF'), name: 'executable' },
  { bytes: Buffer.from('#!'), name: 'script' },
  { bytes: Buffer.from('%PDF-'), name: 'PDF' },
]);

function reject(message) {
  throw new AppError(message, 400, [{ field: 'file', message }], 'VALIDATION_ERROR');
}

function forbiddenName(buffer) {
  const head = buffer.subarray(0, 512).toString('latin1');
  if (/<\s*(?:\?xml[^>]*\?)?\s*svg\b/i.test(head)) return 'SVG';
  return FORBIDDEN_SIGNATURES.find((item) => buffer.subarray(0, item.bytes.length).equals(item.bytes))?.name || null;
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) reject('File must be a valid PNG or JPEG image');

  let offset = 8;
  let size = null;
  let sawEnd = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (length > buffer.length - offset - 12) reject('File must be a valid PNG or JPEG image');
    if (type === 'IHDR') {
      if (length !== 13 || size) reject('File must be a valid PNG or JPEG image');
      const width = buffer.readUInt32BE(offset + 8);
      const height = buffer.readUInt32BE(offset + 12);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
        reject('File must be a valid PNG or JPEG image');
      }
      size = { width, height };
    }
    if (type === 'IEND') {
      sawEnd = true;
      if (offset + 12 !== buffer.length) reject('File must be a valid PNG or JPEG image');
      break;
    }
    offset += 12 + length;
  }
  if (!size || !sawEnd) reject('File must be a valid PNG or JPEG image');
  return { mimeType: 'image/png', ...size };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    reject('File must be a valid PNG or JPEG image');
  }
  let offset = 2;
  let size = null;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9) {
      if (offset !== buffer.length) reject('File must be a valid PNG or JPEG image');
      break;
    }
    if (offset + 2 > buffer.length) reject('File must be a valid PNG or JPEG image');
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) reject('File must be a valid PNG or JPEG image');
    const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sof) {
      if (length < 8 || size) reject('File must be a valid PNG or JPEG image');
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width < 1 || height < 1 || width > 10000 || height > 10000) reject('File must be a valid PNG or JPEG image');
      size = { width, height };
    }
    offset += length;
    if (marker === 0xda) {
      if (buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) {
        reject('File must be a valid PNG or JPEG image');
      }
      break;
    }
  }
  if (!size) reject('File must be a valid PNG or JPEG image');
  return { mimeType: 'image/jpeg', ...size };
}

/** Read the real image type and dimensions from the bytes, never from the client. */
function inspectImageBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) reject('File is empty');
  const forbidden = forbiddenName(buffer);
  if (forbidden) reject(`${forbidden} files are not allowed`);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return pngDimensions(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return jpegDimensions(buffer);
  reject('File must be a valid PNG or JPEG image');
}

/** Validate one multer memory-storage file and return trusted metadata for persistence. */
function validateUploadedFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) reject('File is empty');
  if (!Number.isInteger(file.size) || file.size !== file.buffer.length) reject('File size does not match its contents');
  if (file.size > DOCUMENT_RULES.maxBytes) reject('File is too large');

  const inspected = inspectImageBytes(file.buffer);
  if (!DOCUMENT_RULES.mimeTypes.includes(inspected.mimeType)) reject('Unsupported file type');
  if (file.mimetype && file.mimetype !== inspected.mimeType) reject('The file type does not match its contents');

  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  if (!EXTENSIONS[inspected.mimeType].includes(extension)) reject('The file extension does not match its contents');

  return { ...inspected, sizeBytes: file.size, extension };
}

export { inspectImageBytes, validateUploadedFile };
