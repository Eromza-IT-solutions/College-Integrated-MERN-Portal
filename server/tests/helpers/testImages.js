import zlib from 'node:zlib';

const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const TABLE = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
  return Buffer.concat([header, data, crc]);
}

function pngBuffer(width, height, paddingBytes = 0) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let row = 0; row < height; row += 1) raw[row * stride] = 0;
  const parts = [SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw))];
  if (paddingBytes) parts.push(chunk('tEXt', Buffer.alloc(paddingBytes)));
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

function jpegBuffer(width, height) {
  const sof = Buffer.alloc(11);
  sof[0] = 8; // precision
  sof.writeUInt16BE(height, 1);
  sof.writeUInt16BE(width, 3);
  sof[5] = 1; // one component
  sof[8] = 1; // component id
  const segment = (marker, data) => {
    const head = Buffer.from([0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 0xff]);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xc0, sof),
    segment(0xda, Buffer.from([1, 1, 0, 0, 3, 0])),
    Buffer.from([0xff, 0xd9]),
  ]);
}

export { pngBuffer, jpegBuffer };
