import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
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
