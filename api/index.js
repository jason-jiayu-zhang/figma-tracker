// LEGACY / UNUSED entrypoint.
//
// This file was the Vercel serverless wrapper around the Express app. The
// dynamic backend and the continuous Figma sync CANNOT run on Vercel
// (serverless functions are short-lived and stateless).
//
// The canonical backend runtime is Render, which runs the Express server
// directly via `node server.js` (npm start). See DEPLOYMENT.md. This file and
// vercel.json are legacy artifacts and are not used by the Render deployment.
//
// Kept only as a reference. Do not rely on it for production traffic.
const app = require("../server");

module.exports = app;
