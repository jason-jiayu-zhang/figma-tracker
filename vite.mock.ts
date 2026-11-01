import type { Plugin } from "vite";

// Dev-only fake backend so the UI can be viewed without Express/Figma OAuth.
// Enabled with `MOCK_API=1 npm run dev` (see vite.config.ts); never part of a build.
const FILES = [
  ["aaa111", "Marketing Site", "Web"],
  ["bbb222", "Mobile App v3", "Product"],
  ["ccc333", "Design System", "Foundations"],
  ["ddd444", "Brand Refresh", "Brand"],
  ["eee555", "Onboarding Flow", "Product"],
].map(([file_key, name, project_name], i) => ({
  id: i + 1,
  file_key,
  name,
  project_name,
  thumbnail_url: "",
  last_modified: new Date(Date.now() - i * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  teamName: "Demo Team",
  versionCount: 40 + i * 17,
  archived_at: null,
}));

function activity(days: number) {
  const rows: unknown[] = [];
  const dailyTotals: Record<string, number> = {};
  for (let d = 0; d < days; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    // Deterministic pseudo-random so the preview doesn't flicker between polls.
    const seed = Math.sin(d * 12.9898) * 43758.5453;
    const r = seed - Math.floor(seed);
    if (r < 0.3) continue;
    let total = 0;
    FILES.forEach((f, i) => {
      const c = Math.floor(((r * (i + 2) * 7) % 5) * (i < 3 ? 1.5 : 0.6));
      if (!c) return;
      total += c;
      rows.push({ activity_date: date, version_count: c, figma_files: { id: f.id, file_key: f.file_key, name: f.name } });
    });
    if (total) dailyTotals[date] = total;
  }
  return { rows, dailyTotals, days, filterMine: false, myFigmaUserId: "demo-user" };
}

export function mockApi(): Plugin {
  return {
    name: "mock-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "", "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        switch (url.pathname) {
          case "/api/user/me":
            return send(200, { figma_user_id: "demo-user", handle: "demo", img_url: null, profile_slug: "demo", public_enabled: true });
          case "/api/stats":
            return send(200, { filesTracked: FILES.length, totalVersions: 420, editsToday: 7, lastSync: new Date().toISOString(), lastSyncStatus: "ok", filterMine: false, myFigmaUserId: "demo-user", user: { display_name: "Demo", email: null, img_url: null, created_at: null } });
          case "/api/activity":
            return send(200, activity(Number(url.searchParams.get("days")) || 365));
          case "/api/files":
            return send(200, FILES);
          case "/api/insights":
            return send(200, { mode: "all", tz: "UTC", streak: { current: 12, longest: 31 } });
          default:
            return send(200, {});
        }
      });
    },
  };
}
