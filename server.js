require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const apiRouter = require("./backend/routes/api");
const oauthRouter = require("./backend/routes/oauth");
const userRouter = require("./backend/routes/user");
const { runSync, runPageSync } = require("./backend/syncService");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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

// Export the app for Vercel serverless functions
module.exports = app;

/**
 * Local development only: Start the server if running directly with 'node server.js'
 * Vercel will import 'app' and handle its own execution.
 */
if (require.main === module) {
  // Adaptive sync loop (local dev only)
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

  // Daily sync at midnight (local dev only)
  cron.schedule("0 0 * * *", () => {
    console.log("[cron] Running scheduled daily sync...");
    runSync().catch((err) => console.error("[cron] Sync failed:", err.message));
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 FIGMA TRACKER V3 STARTED`);
    console.log(`   Running at http://localhost:${PORT}`);
    console.log(`   Page sync: 3 pages adaptive (1s/5s)`);
    console.log(`   Full sync: daily at midnight\n`);
  });
}
