// Small Map-backed cache with a TTL and a hard entry cap. Insertion order doubles
// as age order, so the oldest entries are evicted first.
function createTtlCache({ ttlMs, maxEntries, now = () => Date.now() }) {
  const map = new Map();
  return {
    get(key) {
      const e = map.get(key);
      if (!e) return undefined;
      if (e.expires <= now()) {
        map.delete(key);
        return undefined;
      }
      return e.value;
    },
    set(key, value) {
      map.delete(key);
      map.set(key, { value, expires: now() + ttlMs });
      const t = now();
      for (const [k, e] of map) {
        if (map.size <= maxEntries && e.expires > t) break;
        map.delete(k);
      }
    },
    delete(key) {
      map.delete(key);
    },
    get size() {
      return map.size;
    },
  };
}

module.exports = { createTtlCache };
