// LEGACY / UNUSED entrypoint.
//
// This file was the Vercel serverless wrapper around the Express app. The
// dynamic backend and the continuous Figma sync CANNOT run on Vercel
// (serverless functions are short-lived and stateless), so Vercel is now
// configured to host the STATIC frontend only (see vercel.json) and no longer
// routes /api to this function.
//
// The canonical backend runtime is Railway, which runs the Express server
// directly via `node server.js` (npm start). See DEPLOYMENT.md.
//
// This file is kept only as a reference and is intentionally not referenced by
// vercel.json. Do not rely on it for production traffic.
const app = require("../server");

module.exports = app;
