import { inspectImageBytes, validateUploadedFile } from '../src/utils/imageValidation.js';
import { jpegBuffer, pngBuffer } from './helpers/testImages.js';

const file = (buffer, { mimetype = 'image/png', originalname = 'doc.png', size = buffer.length } = {}) => ({
  buffer, mimetype, originalname, size,
});

describe('upload content validation', () => {
  test('reads dimensions from real PNG bytes', () => {
    expect(inspectImageBytes(pngBuffer(80, 100))).toEqual({ mimeType: 'image/png', width: 80, height: 100 });
    expect(validateUploadedFile(file(pngBuffer(80, 100)))).toEqual({
      mimeType: 'image/png', width: 80, height: 100, sizeBytes: pngBuffer(80, 100).length, extension: '.png',
    });
  });

  test('reads dimensions from real JPEG bytes', () => {
    const jpeg = jpegBuffer(640, 480);
    expect(inspectImageBytes(jpeg)).toEqual({ mimeType: 'image/jpeg', width: 640, height: 480 });
    expect(validateUploadedFile(file(jpeg, { mimetype: 'image/jpeg', originalname: 'doc.jpeg' })).extension).toBe('.jpeg');
  });

  test('rejects a client MIME type that disagrees with the bytes', () => {
    const jpeg = jpegBuffer(80, 100);
    expect(() => validateUploadedFile(file(jpeg, { mimetype: 'image/png', originalname: 'doc.png' })))
      .toThrow('The file type does not match its contents');
  });

  test('rejects a file extension that disagrees with the bytes', () => {
    expect(() => validateUploadedFile(file(pngBuffer(80, 100), { originalname: 'doc.jpg' })))
      .toThrow('The file extension does not match its contents');
  });

  test('rejects empty, malformed and oversized files', () => {
    expect(() => validateUploadedFile(file(Buffer.alloc(0)))).toThrow('File is empty');
    expect(() => validateUploadedFile(file(Buffer.from('not-an-image')))).toThrow('valid PNG or JPEG');
    const big = pngBuffer(80, 100, 600 * 1024);
    expect(() => validateUploadedFile(file(big))).toThrow('File is too large');
    expect(() => validateUploadedFile(file(pngBuffer(80, 100), { size: 12 })))
      .toThrow('File size does not match its contents');
  });

  test('rejects SVG with scripts and other executable/archive content', () => {
    const svg = Buffer.from('<?xml version="1.0"?><svg onload="alert(1)"><script>alert(1)</script></svg>');
    expect(() => validateUploadedFile(file(svg, { mimetype: 'image/svg+xml', originalname: 'doc.svg' })))
      .toThrow('SVG files are not allowed');
    expect(() => validateUploadedFile(file(Buffer.concat([Buffer.from('PK\x03\x04'), pngBuffer(80, 100)]))))
      .toThrow('archive files are not allowed');
    expect(() => validateUploadedFile(file(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))))
      .toThrow('executable files are not allowed');
  });
});
