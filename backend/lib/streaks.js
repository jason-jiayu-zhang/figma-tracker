/** YYYY-MM-DD shifted by `delta` days (UTC-safe). */
function shiftDay(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Sat/Sun for a YYYY-MM-DD string (UTC-safe, like shiftDay). */
function isWeekend(dateStr) {
  const day = new Date(dateStr + "T00:00:00Z").getUTCDay();
  return day === 0 || day === 6;
}

/** True if `d` follows `prev`, treating a gap made up ONLY of weekend days as
   still-consecutive (e.g. Fri→Mon doesn't break a streak). */
function isConsecutive(prev, d) {
  let cur = shiftDay(prev, 1);
  while (cur < d) {
    if (!isWeekend(cur)) return false;
    cur = shiftDay(cur, 1);
  }
  return cur === d;
}

/* Current + longest streak of active days from a set of YYYY-MM-DD strings.
   Weekends never break a streak — only a missed weekday resets it. Mirrored by
   computeContribStats in src/pages/Dashboard.tsx; keep the two in sync. */
function computeStreaks(activeDates, todayStr) {
  const sorted = [...activeDates].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of sorted) {
    if (prev && isConsecutive(prev, d)) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  // Current streak: walk back from today. Today-if-empty gets a grace day
  // (GitHub-style) and inactive weekend days are skipped; only an inactive
  // weekday breaks the count.
  let current = 0;
  let day = todayStr;
  let first = true;
  while (true) {
    if (activeDates.has(day)) {
      current++;
    } else if (!first && !isWeekend(day)) {
      break;
    }
    first = false;
    day = shiftDay(day, -1);
  }
  return { current, longest };
}

module.exports = { shiftDay, isWeekend, isConsecutive, computeStreaks };
