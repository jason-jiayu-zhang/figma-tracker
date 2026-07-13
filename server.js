require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const path = require("path");
const apiRouter = require("./backend/routes/api");
const oauthRouter = require("./backend/routes/oauth");
const userRouter = require("./backend/routes/user");
const { runSync, runPageSync } = require("./backend/syncService");

const app = express();
const PORT = process.env.PORT || 3001;

// Credentialed CORS — a wildcard origin cannot be used with cookies.
// Allowed origins come from APP_URL / APP_DASHBOARD_URL (plus local dev).
const allowedOrigins = [
  process.env.APP_URL,
  process.env.APP_DASHBOARD_URL,
  "http://localhost:5173",
  "http://localhost:3001",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, cb) {
      // Allow same-origin / server-to-server requests (no Origin header).
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Serve static frontend from Vite build directory
app.use(express.static(path.join(__dirname, "dist")));

// API routes
app.use("/api", apiRouter);
app.use("/api/oauth", oauthRouter);
app.use("/api/user", userRouter);

// Fallback to index.html for any non-API route (Client-side routing support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Export the app (also usable by the legacy api/index.js wrapper).
module.exports = app;

/**
 * Start the server when run directly (`node server.js` / `npm start`) — this is
 * how Render runs it. Guarded so importing `app` (e.g. tests) doesn't listen.
 */
if (require.main === module) {
  // Resident background sync. ON by default (local dev). In production set
  // RESIDENT_SYNC=off so an EXTERNAL cron drives GET /api/sync/incremental
  // instead — this avoids a redundant always-on loop on the host and lets the
  // process idle between scheduled hits. See DEPLOYMENT.md.
  const RESIDENT_SYNC = process.env.RESIDENT_SYNC !== "off";

  if (RESIDENT_SYNC) {
    // Adaptive sync loop
    let currentInterval = 2000;
    const syncLoop = () => {
      setTimeout(async () => {
        try {
          const updateFound = await runPageSync();
          const newInterval = updateFound ? 2000 : 10000;
          if (currentInterval !== newInterval) {
            console.log(`[service-v3] Sync interval changed to ${newInterval / 1000}s`);
            currentInterval = newInterval;
          }
        } catch (err) {
          console.error("[service-v3] Page sync failed:", err.message);
          currentInterval = 10000;
        }
        syncLoop();
      }, currentInterval);
    };

    console.log("[service-v3] Starting adaptive page sync (1x)...");
    syncLoop();

    // Daily sync at midnight
    cron.schedule("0 0 * * *", () => {
      console.log("[cron] Running scheduled daily sync...");
      runSync().catch((err) => console.error("[cron] Sync failed:", err.message));
    });
  } else {
    console.log("[service-v3] RESIDENT_SYNC=off — sync driven by external cron.");
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 FIGMA TRACKER V3 STARTED`);
    console.log(`   Running at http://localhost:${PORT}`);
    console.log(
      RESIDENT_SYNC
        ? `   Page sync: 3 pages adaptive (1s/5s)\n   Full sync: daily at midnight\n`
        : `   Sync: external cron → GET /api/sync/incremental\n`,
    );
  });
}
