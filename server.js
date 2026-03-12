require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const apiRouter = require('./src/routes/api');
const { runSync, runPageSync } = require('./src/syncService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRouter);

// Fallback to index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Every 10 seconds: fetch the next page of 30 older versions
// (Figma limit is ~30 req/min, so 10s is safe for a few files)
setInterval(() => {
  console.log('[service] Running 10s page sync...');
  runPageSync().catch((err) => console.error('[service] Page sync failed:', err.message));
}, 10000);

// Daily sync at midnight (full sweep)
cron.schedule('0 0 * * *', () => {
  console.log('[cron] Running scheduled daily sync...');
  runSync().catch((err) => console.error('[cron] Sync failed:', err.message));
});

app.listen(PORT, () => {
  console.log(`\n🚀 FIGMA TRACKER V2 (PAGINATED) STARTED`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`   Page sync: every minute (30 older versions per file)`);
  console.log(`   Full sync: daily at midnight\n`);
});
