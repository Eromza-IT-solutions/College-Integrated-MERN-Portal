import { RESULT_LINE_STATUS, RESULT_OUTCOME, GRADING } from './constants.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * The college's CBCS 10-point credit system. Everything here is pure: nothing is saved.
 *
 * Per subject:
 *  - Pass needs at least 40% in the internal part (CIE) AND at least 40% in the external part (SEE).
 *    Failing either part means grade F, grade point 0 and no credits, even if the total looks high.
 *  - An absent student gets grade AB (grade point 0) and fails the subject.
 *  - A passed subject gets its letter grade and grade point from the total percentage (O 90+, A+ 80+, A 70+, B+ 55+, B 50+, C 45+, P 40+).
 * Per semester: SGPA = sum(credits x grade point) / sum(credits), over subjects that count for CGPA.
 * Overall: CGPA is the same sum over all semesters. The final letter grade comes from the SGPA or CGPA (O 9.5+ ... P 4.0+, else F).
 */

/** Letter grade and grade point for a marks percentage, using integer maths so 40% is exactly 40%. */
function gradeForMarks(total, max, bands = GRADING.gradeBands) {
  if (!(max > 0)) return { grade: 'F', point: 0 };
  const band = bands.find((b) => total * 100 >= b.min * max);
  return band ? { grade: band.grade, point: band.point } : { grade: 'F', point: 0 };
}

/** Final letter grade for an SGPA or CGPA value. */
function finalGradeFor(gpa, bands = GRADING.finalBands) {
  if (!isNum(gpa)) return null;
  const band = bands.find((b) => gpa >= b.min);
  return band ? band.grade : 'F';
}

/** sum(credits x point) / sum(credits) over the lines that count for CGPA. null when there are no credits. */
function weightedAverage(items) {
  let credits = 0;
  let weighted = 0;
  for (const it of items) {
    if (it.countsForCgpa === false) continue;
    const c = isNum(it.credits) ? it.credits : 0;
    credits += c;
    weighted += c * (isNum(it.gradePoint) ? it.gradePoint : 0);
  }
  return credits > 0 ? round2(weighted / credits) : null;
}

/**
 * Works out the result of one student for one semester from the subject lines.
 * A line looks like { maxInternal, maxExternal, internalMarks, externalMarks, absent, credits, countsForCgpa }.
 * A line is "pending" until its marks are entered (or the student is marked absent).
 * The overall outcome, SGPA and final grade stay null until every line is done.
 */
function evaluate(lines, grading = GRADING) {
  const done = [];
  let totalObtained = 0;
  let totalMax = 0;
  let failed = 0;
  let pending = 0;
  let creditsTotal = 0;
  let creditsEarned = 0;

  for (const line of lines) {
    const maxI = line.maxInternal || 0;
    const maxE = line.maxExternal || 0;
    const max = maxI + maxE;
    const credits = isNum(line.credits) ? line.credits : 0;
    const entered = line.absent || (isNum(line.internalMarks) && isNum(line.externalMarks));
    creditsTotal += credits;
    const out = { total: null, max, percent: null, status: RESULT_LINE_STATUS.PENDING, grade: undefined, gradePoint: undefined, creditsEarned: 0 };
    if (entered) {
      if (line.absent) {
        out.total = 0; out.percent = 0; out.status = RESULT_LINE_STATUS.FAIL; out.grade = 'AB'; out.gradePoint = 0;
      } else {
        const total = line.internalMarks + line.externalMarks;
        const cieOk = maxI === 0 || line.internalMarks * 100 >= grading.minCiePercent * maxI;
        const seeOk = maxE === 0 || line.externalMarks * 100 >= grading.minSeePercent * maxE;
        const passed = max > 0 && cieOk && seeOk;
        out.total = total;
        out.percent = max > 0 ? round2((total * 100) / max) : 0;
        out.status = passed ? RESULT_LINE_STATUS.PASS : RESULT_LINE_STATUS.FAIL;
        if (passed) {
          const g = gradeForMarks(total, max, grading.gradeBands);
          out.grade = g.grade; out.gradePoint = g.point;
        } else {
          out.grade = 'F'; out.gradePoint = 0;
        }
      }
      totalObtained += out.total;
      totalMax += max;
      if (out.status === RESULT_LINE_STATUS.FAIL) failed += 1;
      else creditsEarned += credits;
      out.creditsEarned = out.status === RESULT_LINE_STATUS.PASS ? credits : 0;
    } else {
      pending += 1;
    }
    done.push(out);
  }

  const isComplete = lines.length > 0 && pending === 0;
  let percentage = null;
  let outcome = null;
  let sgpa = null;
  let finalGrade = null;
  if (isComplete) {
    percentage = totalMax > 0 ? Math.round((totalObtained * 10000) / totalMax) / 100 : 0;
    outcome = failed === 0 ? RESULT_OUTCOME.PASS : RESULT_OUTCOME.FAIL;
    sgpa = weightedAverage(lines.map((l, i) => ({ credits: l.credits, countsForCgpa: l.countsForCgpa, gradePoint: done[i].gradePoint })));
    finalGrade = finalGradeFor(sgpa);
  }
  return { lines: done, totalObtained, totalMax, failedSubjects: failed, isComplete, percentage, outcome, sgpa, finalGrade, creditsTotal, creditsEarned };
}

/**
 * CGPA over many semesters. subjectLines: one entry per subject the student has taken, with
 * { credits, gradePoint, countsForCgpa }. When a subject was written again, pass only its latest line.
 * Returns { cgpa, finalGrade, credits } (cgpa is null when there are no credits yet).
 */
function cgpa(subjectLines) {
  const counted = subjectLines.filter((l) => l.countsForCgpa !== false);
  const credits = counted.reduce((n, l) => n + (isNum(l.credits) ? l.credits : 0), 0);
  const value = weightedAverage(subjectLines);
  return { cgpa: value, finalGrade: finalGradeFor(value), credits };
}

export { evaluate, gradeForMarks, finalGradeFor, weightedAverage, cgpa };
