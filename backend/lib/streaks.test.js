const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { shiftDay, isWeekend, isConsecutive, computeStreaks } = require("./streaks");

// Fixture weekdays (verified via new Date(d+'T00:00:00Z').getUTCDay()):
//   2026-07-06 Mon  2026-07-07 Tue  2026-07-08 Wed  2026-07-09 Thu
//   2026-07-10 Fri  2026-07-11 Sat  2026-07-12 Sun  2026-07-13 Mon  2026-07-14 Tue

describe("shiftDay", () => {
  it("moves forward within a month", () => {
    assert.equal(shiftDay("2026-07-06", 7), "2026-07-13");
  });
  it("crosses a month boundary forward", () => {
    assert.equal(shiftDay("2026-01-31", 1), "2026-02-01");
  });
  it("crosses a month boundary backward", () => {
    assert.equal(shiftDay("2026-02-01", -1), "2026-01-31");
  });
  it("crosses a year boundary forward", () => {
    assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  });
  it("crosses a year boundary backward", () => {
    assert.equal(shiftDay("2027-01-01", -1), "2026-12-31");
  });
  it("is a no-op for delta 0", () => {
    assert.equal(shiftDay("2026-07-06", 0), "2026-07-06");
  });
});

describe("isWeekend", () => {
  it("is true for Saturday", () => {
    assert.equal(isWeekend("2026-07-11"), true);
  });
  it("is true for Sunday", () => {
    assert.equal(isWeekend("2026-07-12"), true);
  });
  it("is false for every weekday Mon-Fri", () => {
    for (const d of ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"]) {
      assert.equal(isWeekend(d), false, `${d} should not be a weekend`);
    }
  });
});

describe("isConsecutive", () => {
  it("is true for adjacent weekdays (Mon->Tue)", () => {
    assert.equal(isConsecutive("2026-07-06", "2026-07-07"), true);
  });
  it("is true across a weekend-only gap (Fri->Mon)", () => {
    assert.equal(isConsecutive("2026-07-10", "2026-07-13"), true);
  });
  it("is false when a weekday is missed (Fri->Tue skips Mon)", () => {
    assert.equal(isConsecutive("2026-07-10", "2026-07-14"), false);
  });
  it("is false for the same day", () => {
    assert.equal(isConsecutive("2026-07-06", "2026-07-06"), false);
  });
  it("is false going backward", () => {
    assert.equal(isConsecutive("2026-07-07", "2026-07-06"), false);
  });
});

describe("computeStreaks", () => {
  it("returns zeros for an empty set", () => {
    assert.deepEqual(computeStreaks(new Set(), "2026-07-14"), { current: 0, longest: 0 });
  });

  it("counts a single active day equal to today", () => {
    assert.deepEqual(computeStreaks(new Set(["2026-07-14"]), "2026-07-14"), {
      current: 1,
      longest: 1,
    });
  });

  it("counts a run of consecutive weekdays (Mon-Fri, today=Fri)", () => {
    const dates = new Set(["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"]);
    assert.deepEqual(computeStreaks(dates, "2026-07-10"), { current: 5, longest: 5 });
  });

  it("counts through a weekend gap (Thu,Fri,Mon,Tue, today=Tue)", () => {
    const dates = new Set(["2026-07-09", "2026-07-10", "2026-07-13", "2026-07-14"]);
    assert.deepEqual(computeStreaks(dates, "2026-07-14"), { current: 4, longest: 4 });
  });

  it("breaks on a missed weekday; longest keeps the longer earlier segment", () => {
    // Mon-Fri 5-run, then Mon 07-06 missed (a weekday), then Tue,Wed 2-run.
    const dates = new Set([
      "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03",
      "2026-07-07", "2026-07-08",
    ]);
    assert.deepEqual(computeStreaks(dates, "2026-07-08"), { current: 2, longest: 5 });
  });

  it("keeps the streak when today is empty but yesterday is active (grace day)", () => {
    assert.deepEqual(computeStreaks(new Set(["2026-07-13"]), "2026-07-14"), {
      current: 1,
      longest: 1,
    });
  });

  it("keeps the streak when today is empty and the gap back is only a weekend (Fri active, today=Mon)", () => {
    assert.deepEqual(computeStreaks(new Set(["2026-07-10"]), "2026-07-13"), {
      current: 1,
      longest: 1,
    });
  });

  it("resets current to only today when a weekday was missed just before today", () => {
    // 07-10 Fri active, 07-13 Mon missed (weekday), today 07-14 Tue active.
    const dates = new Set(["2026-07-10", "2026-07-14"]);
    assert.deepEqual(computeStreaks(dates, "2026-07-14"), { current: 1, longest: 1 });
  });

  it("resets current to 0 when today is empty and the gap includes a missed weekday", () => {
    // Thu 07-09 active; Fri 07-10 missed (weekday); today Mon 07-13 empty.
    assert.deepEqual(computeStreaks(new Set(["2026-07-09"]), "2026-07-13"), {
      current: 0,
      longest: 1,
    });
  });

  it("reports longest greater than current across separate segments", () => {
    // 3-run (Mon-Wed) earlier, missed Thu weekday, then a single day today.
    const dates = new Set(["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-14"]);
    const { current, longest } = computeStreaks(dates, "2026-07-14");
    assert.equal(current, 1);
    assert.equal(longest, 3);
    assert.ok(longest > current);
  });
});
