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

// Every second: fetch the next 3 pages of versions (30 each)
// Processes files ONE BY ONE (round-robin) to stay safe within Figma's limits.
setInterval(() => {
  console.log("[service-v3-1s-3x] Running 1s page sync (3x)...");
  const run = () => runPageSync().catch((err) =>
    console.error("[service-v3-1s-3x] Page sync failed:", err.message),
  );
  run();
  run();
  run();
}, 1000);

// Daily sync at midnight (full sweep)
cron.schedule("0 0 * * *", () => {
  console.log("[cron] Running scheduled daily sync...");
  runSync().catch((err) => console.error("[cron] Sync failed:", err.message));
});

app.listen(PORT, () => {
  console.log(`\n🚀 FIGMA TRACKER V3 (1S-3X SYNC) STARTED`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`   Page sync: 3 pages per second`);
  console.log(`   Full sync: daily at midnight\n`);
});
