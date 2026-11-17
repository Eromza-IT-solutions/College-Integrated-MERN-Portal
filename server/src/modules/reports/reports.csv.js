// Rows (flat objects) ko CSV text banata hai (Excel me seedha khulta hai).
// Safety: jo text =, +, -, @ se shuru ho use ' laga dete hain, warna Excel usse formula samajh kar chala deta hai (CSV injection).
function cell(value) {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const columns = [...rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set())];
  const lines = [columns.map(cell).join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`; // BOM: Excel Hindi/Marathi naam bhi sahi dikhaye
}

export { toCsv, cell };
