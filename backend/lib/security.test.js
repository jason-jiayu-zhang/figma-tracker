const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeFileKeys, isValidFileKey, MAX_SEEDED_FILE_KEYS } = require("./fileKeys");
const { createTtlCache } = require("./ttlCache");
const { createCoalescer } = require("./coalesce");
const { isLoopbackRequest } = require("./loopback");

test("normalizeFileKeys validates, dedupes and caps", () => {
  assert.deepEqual(normalizeFileKeys(" abc123 ,abc123,,bad/key,x?y=1,DEF_4-5"), ["abc123", "DEF_4-5"]);
  assert.deepEqual(normalizeFileKeys({ nested: ["abc"] }), []);
  assert.deepEqual(normalizeFileKeys(undefined), []);
  const many = Array.from({ length: 500 }, (_, i) => "k" + i).join(",");
  assert.equal(normalizeFileKeys(many).length, MAX_SEEDED_FILE_KEYS);
  assert.equal(normalizeFileKeys("k".repeat(100000)).length, 0);
});

test("isValidFileKey rejects path and query smuggling", () => {
  assert.equal(isValidFileKey("AbC123xyz"), true);
  for (const k of ["../me", "a/b", "a?x=1", "", " a", 42, null]) assert.equal(isValidFileKey(k), false);
});

test("ttlCache caps entries and drops expired ones", () => {
  let t = 0;
  const c = createTtlCache({ ttlMs: 1000, maxEntries: 3, now: () => t });
  for (let i = 0; i < 10; i++) c.set("k" + i, i);
  assert.equal(c.size, 3);
  assert.equal(c.get("k0"), undefined);
  assert.equal(c.get("k9"), 9);
  t = 5000;
  assert.equal(c.get("k9"), undefined);
  c.set("fresh", 1);
  assert.equal(c.size, 1, "expired entries are swept on insert");
});

test("coalescer shares in-flight runs and honors the cooldown", async () => {
  let t = 0;
  let runs = 0;
  let release;
  const run = createCoalescer(() => new Promise((r) => { runs++; release = r; }), { cooldownMs: 60000, now: () => t });
  const calls = Array.from({ length: 10 }, () => run());
  await new Promise((r) => setImmediate(r));
  assert.equal(runs, 1);
  release({ ok: true });
  for (const p of calls) assert.deepEqual(await p, { ok: true });
  assert.deepEqual(await run(), { skipped: true });
  t = 61000;
  const next = run();
  await new Promise((r) => setImmediate(r));
  release({ ok: 2 });
  assert.deepEqual(await next, { ok: 2 });
  assert.equal(runs, 2);
});

test("isLoopbackRequest needs a loopback peer and a localhost Host", () => {
  const req = (addr, host) => ({ socket: { remoteAddress: addr }, headers: { host } });
  assert.equal(isLoopbackRequest(req("127.0.0.1", "localhost:3001")), true);
  assert.equal(isLoopbackRequest(req("::ffff:127.0.0.1", "127.0.0.1:3001")), true);
  assert.equal(isLoopbackRequest(req("192.0.2.10", "localhost:3001")), false);
  assert.equal(isLoopbackRequest(req("127.0.0.1", "rebind.attacker.test:3001")), false);
  assert.equal(isLoopbackRequest({ headers: {} }), false);
});

test("ttlCache delete removes an entry", () => {
  const c = createTtlCache({ ttlMs: 1000, maxEntries: 10 });
  c.set("a", 1);
  c.delete("a");
  assert.equal(c.get("a"), undefined);
});
