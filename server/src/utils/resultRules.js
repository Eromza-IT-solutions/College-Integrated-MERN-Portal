import { RESULT_CLASS, RESULT_LINE_STATUS, RESULT_RULES } from './constants.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Works out the result of one student from the subject lines. Pure: nothing is saved here.
 * A line looks like { maxInternal, maxExternal, internalMarks, externalMarks, absent }.
 *  - A line is "pending" until its marks are entered (or the student is marked absent).
 *  - An absent student fails that subject.
 *  - A subject is passed with at least RESULT_RULES.passPercentPerSubject percent of its marks.
 * Returns each line with total, max and status, and the overall totals, percentage and class.
 * The class stays null until every line is done.
 */
function evaluate(lines, rules = RESULT_RULES) {
  const done = [];
  let totalObtained = 0;
  let totalMax = 0;
  let failed = 0;
  let pending = 0;

  for (const line of lines) {
    const max = (line.maxInternal || 0) + (line.maxExternal || 0);
    const entered = line.absent || (isNum(line.internalMarks) && isNum(line.externalMarks));
    let total = null;
    let status = RESULT_LINE_STATUS.PENDING;
    if (entered) {
      total = line.absent ? 0 : line.internalMarks + line.externalMarks;
      const passed = !line.absent && max > 0 && total * 100 >= rules.passPercentPerSubject * max;
      status = passed ? RESULT_LINE_STATUS.PASS : RESULT_LINE_STATUS.FAIL;
      totalObtained += total;
      totalMax += max;
      if (!passed) failed += 1;
    } else {
      pending += 1;
    }
    done.push({ total, max, status });
  }

  const isComplete = lines.length > 0 && pending === 0;
  let percentage = null;
  let resultClass = null;
  if (isComplete) {
    percentage = totalMax > 0 ? Math.round((totalObtained * 10000) / totalMax) / 100 : 0;
    if (failed === 0) {
      const exact = totalMax > 0 ? (totalObtained * 100) / totalMax : 0;
      if (exact >= rules.distinctionPercent) resultClass = RESULT_CLASS.DISTINCTION;
      else if (exact >= rules.firstClassPercent) resultClass = RESULT_CLASS.FIRST;
      else if (exact >= rules.secondClassPercent) resultClass = RESULT_CLASS.SECOND;
      else resultClass = RESULT_CLASS.PASS;
    } else {
      resultClass = failed <= rules.atktMaxFailedSubjects ? RESULT_CLASS.ATKT : RESULT_CLASS.FAIL;
    }
  }
  return { lines: done, totalObtained, totalMax, failedSubjects: failed, isComplete, percentage, resultClass };
}

export { evaluate };
