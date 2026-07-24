import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Pin the dev port to 5173 and fail loudly if it's taken, rather than
    // silently drifting to 5174. OAuth (APP_URL / FIGMA_OAUTH_REDIRECT_URI) is
    // hardcoded to :5173, so a drifted port breaks the login round-trip — you'd
    // start on :5174 but land back on :5173 after Figma.
    port: 5173,
    strictPort: true,
    // Dev only: forward /api to the Express backend on :3001.
    // changeOrigin: true rewrites the Host header so the backend sees the
    // request as same-origin, which keeps the httpOnly ft_session cookie
    // working through the proxy. cookieDomainRewrite strips any Domain
    // attribute so Set-Cookie applies to localhost:5173.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
