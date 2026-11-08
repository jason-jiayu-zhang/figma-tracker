// Figma file keys are short URL-safe tokens. Anything else is rejected before it
// is stored or interpolated into a Figma API path.
const FILE_KEY_RE = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_SEEDED_FILE_KEYS = 20;

function isValidFileKey(k) {
  return typeof k === "string" && FILE_KEY_RE.test(k);
}

/** Comma-separated keys -> deduped, validated, capped array. Non-strings -> []. */
function normalizeFileKeys(v) {
  if (typeof v !== "string") return [];
  const keys = v.split(",").map((s) => s.trim()).filter(isValidFileKey);
  return [...new Set(keys)].slice(0, MAX_SEEDED_FILE_KEYS);
}

module.exports = { isValidFileKey, normalizeFileKeys, MAX_SEEDED_FILE_KEYS };
