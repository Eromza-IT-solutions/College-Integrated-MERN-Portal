const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const BODY_TOP = 754;
const LINE_HEIGHT = 15;
const LINES_PER_PAGE = 42;
const WRAP_WIDTH = 105;

function safeText(value) {
  return String(value == null ? '' : value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u20B9/g, 'Rs.')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escapePdfText(value) {
  return safeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(value) {
  const text = safeText(value);
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (word.length > WRAP_WIDTH) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += WRAP_WIDTH) lines.push(word.slice(i, i + WRAP_WIDTH));
      continue;
    }
    if (!current) current = word;
    else if (`${current} ${word}`.length <= WRAP_WIDTH) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function pageContent(title, subtitle, lines, pageNumber, pageCount) {
  const parts = [
    'BT',
    '/F2 16 Tf',
    `1 0 0 1 ${MARGIN} 800 Tm`,
    `(${escapePdfText(title)}) Tj`,
    'ET',
  ];
  if (subtitle) {
    parts.push(
      'BT',
      '/F1 9 Tf',
      `1 0 0 1 ${MARGIN} 782 Tm`,
      `(${escapePdfText(subtitle)}) Tj`,
      'ET'
    );
  }
  parts.push('q', '0.5 w', `${MARGIN} 772 m ${PAGE_WIDTH - MARGIN} 772 l S`, 'Q');
  parts.push('BT', '/F1 9 Tf', `${MARGIN} ${BODY_TOP} Td`, `${LINE_HEIGHT} TL`);
  for (const line of lines) parts.push(`(${escapePdfText(line)}) Tj T*`);
  parts.push('ET');
  parts.push(
    'BT',
    '/F1 8 Tf',
    `1 0 0 1 ${MARGIN} 35 Tm`,
    `(${escapePdfText(`Page ${pageNumber} of ${pageCount}`)}) Tj`,
    'ET'
  );
  return `${parts.join('\n')}\n`;
}

function buildPdf({ title, subtitle = 'SAMPLE DOCUMENT', lines = [] }) {
  const flat = [];
  for (const line of lines) flat.push(...wrapText(line));
  if (!flat.length) flat.push('No data.');
  const pages = [];
  for (let i = 0; i < flat.length; i += LINES_PER_PAGE) pages.push(flat.slice(i, i + LINES_PER_PAGE));

  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';

  let nextObject = 6;
  const pageObjects = [];
  pages.forEach((pageLines, index) => {
    const pageObject = nextObject++;
    const contentObject = nextObject++;
    const stream = pageContent(safeText(title), safeText(subtitle), pageLines, index + 1, pages.length);
    pageObjects.push(pageObject);
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${pageObjects.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjects.length} >>`;

  const chunks = [Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', 'latin1')];
  const offsets = [];
  let offset = chunks[0].length;
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = offset;
    const chunk = Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`, 'latin1');
    chunks.push(chunk);
    offset += chunk.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  chunks.push(Buffer.from(xref, 'latin1'));
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}

function pdfFilename(base) {
  const safe = String(base || 'document').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
  return `${safe}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function sendPdf(res, buffer, filename) {
  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${String(filename).replace(/["\\\r\n]/g, '_')}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}

export { buildPdf, pdfFilename, sendPdf };
