import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { useSession } from "./session";
import { APP_ORIGIN } from "./config";
import { readSettings, writeSettings } from "./settingsStore";

// Shared streak-badge editor state for Studio. Emits BOTH an SVG-image output
// (README / Notion / markdown, via /api/public/:slug/badge.svg) and an iframe
// output (websites, via /embed-widget?widget=streak) — the two stay in sync off
// one param set. The SVG font is fixed (Urbanist); the `font` choice only
// reaches the iframe renderer, which can use real web fonts.

export type StreakMetric = "streak" | "edits";
export type StreakTheme = "light" | "dark";
export type StreakOutput = "image" | "iframe";
export type StreakFont = "urbanist" | "system" | "mono" | "serif" | "rounded";
export type StreakColorKey = "bg" | "text" | "muted" | "accent" | "border";

// Picker starting colors per theme preset — mirror the backend buildBadgeSvg
// preset so a picker opens on the token's real initial color for light vs dark.
export const STREAK_PRESETS: Record<
  StreakTheme,
  { bg: string; text: string; muted: string; accent: string; border: string; host: string }
> = {
  light: { bg: "#fffaf4", text: "#1a1a1a", muted: "#737373", accent: "#f23b27", border: "#ebebeb", host: "#fffaf4" },
  dark: { bg: "#1f1f1f", text: "#f5f5f5", muted: "#a6a6a6", accent: "#f23b27", border: "#3a3a3a", host: "#0d1116" },
};

export const STREAK_FONTS: { label: string; value: StreakFont }[] = [
  { label: "Urbanist", value: "urbanist" },
  { label: "System", value: "system" },
  { label: "Mono", value: "mono" },
  { label: "Serif", value: "serif" },
  { label: "Rounded", value: "rounded" },
];

const emptyOverrides = { bg: "", text: "", muted: "", accent: "", border: "" };

const STORE_KEY = "fimanu.studio.streak.v1";

type StoredStreak = {
  metric: StreakMetric;
  theme: StreakTheme;
  emoji: boolean;
  radius: number;
  font: StreakFont;
  output: StreakOutput;
  overrides: Record<StreakColorKey, string>;
};

export function useStreakSettings() {
  const { user } = useSession();
  const slug = user?.profile_slug || "";
  const published = !!user?.public_enabled && !!slug;

  const stored = useRef(readSettings<StoredStreak>(STORE_KEY)).current;

  const [metric, setMetric] = useState<StreakMetric>(stored.metric ?? "streak");
  const [theme, setThemeState] = useState<StreakTheme>(stored.theme ?? "light");
  const [emoji, setEmoji] = useState(stored.emoji ?? false);
  const [radius, setRadius] = useState(stored.radius ?? 8);
  const [font, setFont] = useState<StreakFont>(stored.font ?? "urbanist");
  const [output, setOutput] = useState<StreakOutput>(stored.output ?? "image");

  // Per-token overrides on top of the theme preset; empty string = use preset.
  const [overrides, setOverrides] = useState<Record<StreakColorKey, string>>(
    stored.overrides ?? emptyOverrides
  );

  useEffect(() => {
    writeSettings<StoredStreak>(STORE_KEY, { metric, theme, emoji, radius, font, output, overrides });
  }, [metric, theme, emoji, radius, font, output, overrides]);

  const preset = STREAK_PRESETS[theme];

  // Switching the base theme drops granular overrides so the pickers show the
  // new light/dark base — same override-on-preset pattern as the heatmap editor.
  const setTheme = (t: StreakTheme) => {
    setThemeState(t);
    setOverrides(emptyOverrides);
  };
  const setColor = (key: StreakColorKey, value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  // Colors shown in the pickers (override falls back to preset token).
  const colors = {
    bg: overrides.bg || preset.bg,
    text: overrides.text || preset.text,
    muted: overrides.muted || preset.muted,
    accent: overrides.accent || preset.accent,
    border: overrides.border || preset.border,
  };

  // Only overridden tokens become bare-hex params; un-touched tokens are omitted
  // so the backend/renderer applies its own preset default (incl. dark's rgba
  // border which the hex pickers only approximate).
  const applyStyleParams = (p: URLSearchParams) => {
    if (metric === "edits") p.set("metric", "edits");
    if (theme === "dark") p.set("theme", "dark");
    if (emoji) p.set("emoji", "1");
    (Object.keys(overrides) as StreakColorKey[]).forEach((k) => {
      if (overrides[k]) p.set(k, overrides[k].replace("#", ""));
    });
    if (radius !== 8) p.set("radius", String(radius));
  };

  const badgeParams = new URLSearchParams();
  applyStyleParams(badgeParams);
  const badgeQuery = badgeParams.toString();
  const badgeUrl = slug
    ? `${APP_ORIGIN}/api/public/${slug}/badge.svg${badgeQuery ? `?${badgeQuery}` : ""}`
    : "";

  const iframeParams = new URLSearchParams();
  iframeParams.set("slug", slug);
  iframeParams.set("widget", "streak");
  applyStyleParams(iframeParams);
  if (font !== "urbanist") iframeParams.set("font", font);
  const iframeUrl = slug ? `${APP_ORIGIN}/embed-widget?${iframeParams.toString()}` : "";

  const alt = metric === "edits" ? "Figma edits" : "Figma streak";
  const imgHtml = `<img src="${badgeUrl}" alt="${alt}" height="28" />`;
  const imgMd = `![${alt}](${badgeUrl})`;
  const iframeCode = `<iframe src="${iframeUrl}" width="100%" height="44" frameborder="0" scrolling="no" style="border:none;overflow:hidden;" title="${alt}"></iframe>`;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    });
  };

  const copyWrapped = (key: string, text: string) => {
    posthog.capture('studio_copy_snippet', { widget: 'streak', type: key });
    copy(key, text);
  };

  return {
    slug,
    published,
    metric,
    setMetric: (v: StreakMetric) => { posthog.capture('studio_change_streak_metric', { value: v }); setMetric(v); },
    theme,
    setTheme: (v: StreakTheme) => { posthog.capture('studio_change_streak_theme', { value: v }); setTheme(v); },
    emoji,
    setEmoji: (v: boolean | ((prev: boolean) => boolean)) => {
      // If it's a function, we don't know the exact value here, but usually it's a toggle
      posthog.capture('studio_toggle_streak_emoji');
      setEmoji(v);
    },
    radius,
    setRadius: (v: number) => { posthog.capture('studio_change_streak_radius', { value: v }); setRadius(v); },
    font,
    setFont: (v: StreakFont) => { posthog.capture('studio_change_streak_font', { value: v }); setFont(v); },
    output,
    setOutput: (v: StreakOutput) => { posthog.capture('studio_change_streak_output', { value: v }); setOutput(v); },
    colors,
    setColor: (k: StreakColorKey, v: string) => { posthog.capture('studio_change_streak_color', { key: k, value: v }); setColor(k, v); },
    preset,
    alt,
    badgeUrl,
    iframeUrl,
    imgHtml,
    imgMd,
    iframeCode,
    copiedKey,
    copy: copyWrapped,
  };
}
