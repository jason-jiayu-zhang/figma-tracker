import { useEffect, useRef, useState } from "react";
import { useSession } from "./session";
import { APP_ORIGIN } from "./config";
import { readSettings, writeSettings } from "./settingsStore";

// Shared file-breakdown editor state for Studio. Emits a single iframe output
// (websites, via /embed-widget?widget=breakdown) — the bento grid can't be an
// SVG, so unlike the streak badge there's no image/markdown variant.

export type BreakdownColorKey = "bg" | "text";

const DEFAULT_BG = "#fffaf4";
const DEFAULT_TEXT = "#ffffff";
const DEFAULT_RADIUS = 16;
const IFRAME_HEIGHT = 300;

export function breakdownRanges(): { label: string; value: number }[] {
  const ytd = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  return [
    { label: "1W", value: 7 },
    { label: "1M", value: 30 },
    { label: "90D", value: 90 },
    { label: "1Y", value: 365 },
    { label: "YTD", value: ytd },
    { label: "All", value: 3650 },
  ];
}

const STORE_KEY = "fimanu.studio.breakdown.v1";

type StoredBreakdown = { days: number; bg: string; text: string; radius: number };

export function useBreakdownSettings() {
  const { user } = useSession();
  const slug = user?.profile_slug || "";
  const published = !!user?.public_enabled && !!slug;

  const stored = useRef(readSettings<StoredBreakdown>(STORE_KEY)).current;

  const [days, setDays] = useState(stored.days ?? 365);
  const [bg, setBg] = useState(stored.bg ?? DEFAULT_BG);
  const [text, setText] = useState(stored.text ?? DEFAULT_TEXT);
  const [radius, setRadius] = useState(stored.radius ?? DEFAULT_RADIUS);

  useEffect(() => {
    writeSettings<StoredBreakdown>(STORE_KEY, { days, bg, text, radius });
  }, [days, bg, text, radius]);

  const params = new URLSearchParams();
  params.set("slug", slug);
  params.set("widget", "breakdown");
  params.set("days", String(days));
  if (bg.toLowerCase() !== DEFAULT_BG) params.set("bg", bg.replace("#", ""));
  if (text.toLowerCase() !== DEFAULT_TEXT) params.set("text", text.replace("#", ""));
  if (radius !== DEFAULT_RADIUS) params.set("radius", String(radius));
  const url = slug ? `${APP_ORIGIN}/embed-widget?${params.toString()}` : "";

  const iframeCode = `<iframe src="${url}" width="100%" height="${IFRAME_HEIGHT}" frameborder="0" scrolling="no" style="border:none;overflow:hidden;" title="Figma file breakdown"></iframe>`;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    });
  };

  return {
    slug,
    published,
    days,
    setDays,
    bg,
    setBg,
    text,
    setText,
    radius,
    setRadius,
    ranges: breakdownRanges(),
    url,
    iframeCode,
    copiedKey,
    copy,
  };
}
