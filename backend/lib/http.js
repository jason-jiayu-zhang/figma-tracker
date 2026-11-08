// Log the real error server-side; send clients a generic message so database,
// parser and upstream error text never leaks into responses.
function serverError(res, err, extra = {}) {
  console.error(`[${res.req?.method || "?"} ${res.req?.originalUrl || "?"}]`, err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ ...extra, error: "Internal server error" });
}

module.exports = { serverError };
