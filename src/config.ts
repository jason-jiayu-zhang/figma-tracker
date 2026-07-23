// Central runtime configuration derived from Vite build-time env.
//
// - VITE_API_URL : cross-origin API base (e.g. a separate API origin). When
//                  absent, API calls are same-origin (empty base).
// - VITE_IS_APP  : "1" forces "app" (dashboard) mode. Used in local dev to skip
//                  the marketing landing page. In the single-domain production
//                  setup this is left unset so `/` serves marketing and the app
//                  routes (/studio, /files, …) render on the same origin.

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

// Render the dashboard app when explicitly forced (local dev).
export const IS_APP_MODE: boolean = import.meta.env.VITE_IS_APP === "1";

// Origin used to build user-facing shareable links (public profile + embeds).
// Everything is served from one origin, so this is just the current origin.
export const APP_ORIGIN: string =
  typeof window !== "undefined" ? window.location.origin : "";

// Public contact address for the legal pages and footer links.
export const CONTACT_EMAIL: string =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || "";

// Prefix a relative API path with the configured base (for non-axios URLs).
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
