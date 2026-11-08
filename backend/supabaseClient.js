const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY missing. This may fail at runtime.");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// ============================================================
// Session helpers (cookie-based JWT sessions)
// ============================================================
const SESSION_COOKIE = "ft_session";
const SESSION_TTL_DAYS = 30;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set to a random string of at least 32 characters. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
}

function isSecureRequest() {
  // Cookies must be Secure over HTTPS. In production (Render) we serve https.
  return (
    process.env.NODE_ENV === "production" ||
    (process.env.APP_URL || "").startsWith("https://")
  );
}

/**
 * Sign and set the ft_session cookie for a user.
 * @param {object} res Express response
 * @param {{ id: string, figma_user_id: string, session_version?: number }} user
 */
function setSessionCookie(res, user) {
  const token = jwt.sign(
    { uid: user.id, fu: user.figma_user_id, sv: user.session_version || 0 },
    SESSION_SECRET,
    { algorithm: "HS256", expiresIn: `${SESSION_TTL_DAYS}d` },
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(),
    sameSite: "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/** Clear the ft_session cookie. */
function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isSecureRequest(),
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Read + verify the ft_session cookie.
 * @returns {{ id: string, figma_user_id: string, session_version: number } | null}
 */
function getSessionUser(req) {
  try {
    const raw = req.cookies && req.cookies[SESSION_COOKIE];
    if (!raw) return null;
    const payload = jwt.verify(raw, SESSION_SECRET, { algorithms: ["HS256"] });
    if (!payload || !payload.uid) return null;
    return { id: payload.uid, figma_user_id: payload.fu, session_version: payload.sv || 0 };
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware: drop a session whose user row is gone (disconnected) or
 * whose version no longer matches (logged out). Runs before the routers, so
 * every getSessionUser() call afterwards only sees live sessions. Fails closed
 * on a database error.
 */
async function sessionGuard(req, res, next) {
  const session = getSessionUser(req);
  if (!session) return next();
  try {
    const { data, error } = await supabase
      .from("users")
      .select("session_version")
      .eq("id", session.id)
      .maybeSingle();
    if (error) throw error;
    if (!data || (data.session_version || 0) !== session.session_version) {
      clearSessionCookie(res);
      delete req.cookies[SESSION_COOKIE];
    }
  } catch (err) {
    console.error("[session] Could not check session version:", err.message || err);
    delete req.cookies[SESSION_COOKIE];
  }
  next();
}

// Attach helpers to the exported client so existing `require("../supabaseClient")`
// call-sites keep working while also exposing session utilities.
supabase.getSessionUser = getSessionUser;
supabase.setSessionCookie = setSessionCookie;
supabase.clearSessionCookie = clearSessionCookie;
supabase.sessionGuard = sessionGuard;
supabase.SESSION_COOKIE = SESSION_COOKIE;

module.exports = supabase;
