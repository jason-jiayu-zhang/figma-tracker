// True only when the TCP peer is this machine AND the Host header names
// localhost. Checking both blocks LAN peers and DNS-rebinding pages.
// X-Forwarded-For is deliberately ignored.
const LOOPBACK_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLoopbackRequest(req) {
  const addr = req && req.socket && req.socket.remoteAddress;
  if (!LOOPBACK_ADDRS.has(addr)) return false;
  const host = String((req.headers && req.headers.host) || "")
    .toLowerCase()
    .replace(/:\d+$/, "");
  return LOCAL_HOSTS.has(host);
}

module.exports = { isLoopbackRequest };
