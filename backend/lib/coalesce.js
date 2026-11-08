// Wrap an async job so concurrent callers share one run, and calls within
// `cooldownMs` of the last completed run are skipped instead of starting another.
function createCoalescer(job, { cooldownMs, now = () => Date.now() }) {
  let inFlight = null;
  let lastDone = -Infinity;
  return function run() {
    if (inFlight) return inFlight;
    if (now() - lastDone < cooldownMs) return Promise.resolve({ skipped: true });
    inFlight = Promise.resolve()
      .then(job)
      .finally(() => {
        inFlight = null;
        lastDone = now();
      });
    return inFlight;
  };
}

module.exports = { createCoalescer };
