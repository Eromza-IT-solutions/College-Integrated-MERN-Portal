import env from '../config/env.js';
import { runAdmissionDeadlineJob } from './admissionDeadlines.js';
import { runPaymentReconciliationJob } from './paymentReconciliation.js';

/**
 * Starts the in-process timers. One server process owns them; if the API is ever run on several machines,
 * move these jobs to a single worker or a hosted scheduler so each job does not run once per machine.
 */
function startSchedulers({ log = console } = {}) {
  if (!env.jobs.enabled) {
    log.log('Background jobs: disabled');
    return { stop() {} };
  }

  const timers = [];
  const every = (name, run, intervalMs, runOnStart) => {
    const tick = async () => {
      try {
        const result = await run();
        log.log(`[job] ${name}:`, result);
      } catch (err) {
        log.error(`[job] ${name} failed:`, err);
      }
    };
    if (runOnStart) tick();
    const timer = setInterval(tick, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
    timers.push(timer);
  };

  every('admission deadlines', runAdmissionDeadlineJob, env.jobs.admissionDeadlineIntervalMs, env.jobs.runOnStart);
  every('payment reconciliation', runPaymentReconciliationJob, env.jobs.paymentReconciliationIntervalMs, env.jobs.runOnStart);
  log.log('Background jobs: started');

  return {
    stop() {
      for (const timer of timers) clearInterval(timer);
      timers.length = 0;
    },
  };
}

export { startSchedulers };
export default startSchedulers;
