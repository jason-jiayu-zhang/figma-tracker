import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string,
  defaults: "2026-05-30",
  capture_pageview: "history_change",
});

export default posthog;
