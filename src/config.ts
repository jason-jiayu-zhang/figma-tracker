// Central runtime configuration derived from Vite build-time env + hostname.
//
// - VITE_API_URL   : cross-origin API base (e.g. the app subdomain / Railway domain).
//                    When absent, API calls are same-origin (empty base).
// - VITE_IS_APP    : "1" forces "app" (dashboard) mode regardless of hostname.
// - VITE_APP_DASHBOARD_URL : absolute URL of the dashboard app (app subdomain),
//                    used to build CTAs from the marketing site and shareable links.

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

export const APP_DASHBOARD_URL: string =
  (import.meta.env.VITE_APP_DASHBOARD_URL as string | undefined)?.replace(/\/$/, "") || "";

// Render the dashboard app when on the `app.` subdomain OR when explicitly forced.
export const IS_APP_MODE: boolean =
  (typeof window !== "undefined" && window.location.hostname.startsWith("app.")) ||
  import.meta.env.VITE_IS_APP === "1";

// Origin used to build user-facing shareable links (public profile + embeds).
// Prefer the configured app subdomain; fall back to the current origin.
export const APP_ORIGIN: string =
  APP_DASHBOARD_URL || (typeof window !== "undefined" ? window.location.origin : "");

// Prefix a relative API path with the configured base (for non-axios URLs).
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
