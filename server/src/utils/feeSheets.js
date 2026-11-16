import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync(new URL('../../scripts/data/college-fees-2026-27.json', import.meta.url), 'utf8'));

const toPaise = (rupees) => Math.round(rupees * 100);

/** Checks the data file: every class total equals the sum of its lines. Returns the list of problems (empty when fine). */
function checkData(d = data) {
  const problems = [];
  for (const g of d.groups) {
    for (const c of g.classes) {
      const sum = Object.values(c.heads).reduce((n, v) => n + v, 0);
      if (sum !== c.printedTotal) problems.push(`${g.code} ${c.label}: lines add up to ${sum}, sheet says ${c.printedTotal}`);
      for (const key of Object.keys(c.heads)) if (!d.heads[key]) problems.push(`${g.code} ${c.label}: unknown fee line "${key}"`);
    }
  }
  return problems;
}

/** The fee rows to save: one per program, year of study and class. Pure, so it can be tested without a database. */
function buildRows(programIdByCode, academicYearId, d = data) {
  const rows = [];
  const skipped = [];
  for (const g of d.groups) {
    const programs = g.programCodes.filter((code) => programIdByCode[code]);
    for (const code of g.programCodes) if (!programIdByCode[code]) skipped.push(`${g.code}: program ${code} not found`);
    for (const c of g.classes) {
      const heads = Object.entries(c.heads).map(([key, rupees]) => ({ key, label: d.heads[key], amountPaise: toPaise(rupees) }));
      for (const code of programs) {
        for (const yearOfStudy of c.years) {
          rows.push({
            purpose: 'admission', academicYearId, programId: programIdByCode[code], yearOfStudy, divisionType: g.divisionType,
            feesCategory: d.feesCategory, heads, amountPaise: toPaise(c.printedTotal), classLabel: c.label, feeGroup: g.code, label: '', isActive: true,
          });
        }
      }
    }
  }
  return { rows, skipped };
}

export { checkData, buildRows, toPaise };
