import { toCsv, cell } from '../src/modules/reports/reports.csv.js';
import { reportQuery, parse } from '../src/modules/reports/reports.validation.js';

// Database nahi chahiye: CSV banane aur filters check karne ke rules.
test('CSV: header row, commas / quotes are escaped, empty cells stay empty', () => {
  const csv = toCsv([{ name: 'Joshi, A', note: 'said "hi"', n: 5, gap: null }]);
  expect(csv).toBe('\uFEFFname,note,n,gap\r\n"Joshi, A","said ""hi""",5,\r\n');
});
test('CSV: text starting with = + - @ gets a leading quote (Excel formula safety); real negative numbers stay', () => {
  expect(cell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  expect(cell('+91 98765')).toBe("'+91 98765");
  expect(cell(-5)).toBe('-5');
});
test('CSV: no rows gives an empty file body', () => {
  expect(toCsv([])).toBe('');
});
test('filters: format defaults to json; bad date and "to before from" are refused', () => {
  expect(parse(reportQuery, {}).format).toBe('json');
  expect(() => parse(reportQuery, { from: '16-11-2026' })).toThrow();
  expect(() => parse(reportQuery, { from: '2026-11-20', to: '2026-11-01' })).toThrow();
  expect(parse(reportQuery, { from: '2026-11-01', to: '2026-11-20', format: 'csv' }).format).toBe('csv');
});
