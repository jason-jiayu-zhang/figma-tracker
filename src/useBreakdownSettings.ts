import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { useSession } from "./session";
import { APP_ORIGIN } from "./config";
import { readSettings, writeSettings } from "./settingsStore";
import { breakdownThemeForStyle } from "./embedThemes";

const STORE_KEY = "fimanu.studio.breakdown.v2";

type StoredBreakdown = {
  days: number;
  radius: number;
  embedStyle: string;
  overrideBg: string;
  overrideText: string;
  overrideCards: string[];
  transparentBg: boolean;
};

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

const IFRAME_HEIGHT = 300;

export function useBreakdownSettings() {
  const { user } = useSession();
  const slug = user?.profile_slug || "";
  const published = !!user?.public_enabled && !!slug;

  const stored = useRef(readSettings<StoredBreakdown>(STORE_KEY)).current;

  const [days, setDays] = useState(stored.days ?? 365);
  const [radius, setRadius] = useState(stored.radius ?? 16);
  const [embedStyle, setEmbedStyle] = useState(stored.embedStyle ?? "Fimanu Style");
  const [overrideBg, setOverrideBg] = useState(stored.overrideBg ?? "");
  const [overrideText, setOverrideText] = useState(stored.overrideText ?? "");
  const [overrideCards, setOverrideCards] = useState<string[]>(stored.overrideCards ?? []);
  const [transparentBg, setTransparentBg] = useState(stored.transparentBg ?? false);

  useEffect(() => {
    writeSettings<StoredBreakdown>(STORE_KEY, { days, radius, embedStyle, overrideBg, overrideText, overrideCards, transparentBg });
  }, [days, radius, embedStyle, overrideBg, overrideText, overrideCards, transparentBg]);

  const styleSettled = useRef(false);
  useEffect(() => {
    if (!styleSettled.current) {
      styleSettled.current = true;
      return;
    }
    if (embedStyle === "Custom Style") return;
    setOverrideBg("");
    setOverrideText("");
    setOverrideCards([]);
  }, [embedStyle]);

  const baseTheme = breakdownThemeForStyle(embedStyle);
  const activeCards = overrideCards.length === 4 ? overrideCards : baseTheme.cards;
  const bgColor = overrideBg || baseTheme.bg;
  const activeBg = transparentBg ? "transparent" : bgColor;
  const activeText = overrideText || baseTheme.text;

  const setCardColor = (i: number, color: string) => {
    const next = [...(overrideCards.length === 4 ? overrideCards : ['#f8722f', '#fdaf7a', '#ffe0cc', '#f3ebe4'])];
    next[i] = color;
    setOverrideCards(next);
    setEmbedStyle("Custom Style");
  };

  const setBgColor = (color: string) => {
    setOverrideBg(color);
    setEmbedStyle("Custom Style");
  };

  const setTextColor = (color: string) => {
    setOverrideText(color);
    setEmbedStyle("Custom Style");
  };

  const params = new URLSearchParams();
  params.set("slug", slug);
  params.set("widget", "breakdown");
  params.set("days", String(days));
  
  if (embedStyle === "Custom Style") {
    params.set("bg", activeBg.replace("#", ""));
    params.set("text", activeText.replace("#", ""));
    if (activeCards.length === 4) {
      params.set("cards", activeCards.map((c) => c.replace("#", "")).join("-"));
    }
  } else if (transparentBg) {
    params.set("bg", "transparent");
  }
  params.set("style", embedStyle.split(" ")[0].toLowerCase());
  
  if (radius !== 16) params.set("radius", String(radius));
  
  const url = slug ? `${APP_ORIGIN}/embed-widget?${params.toString()}` : "";

  const iframeCode = `<iframe src="${url}" width="100%" height="${IFRAME_HEIGHT}" frameborder="0" scrolling="no" style="border:none;overflow:hidden;" title="Figma file breakdown"></iframe>`;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    });
  };

  const copyWrapped = (key: string, value: string) => {
    posthog.capture('studio_copy_snippet', { widget: 'breakdown', type: key });
    copy(key, value);
  };

  return {
    slug,
    published,
    days,
    setDays: (v: number) => { posthog.capture('studio_change_breakdown_days', { value: v }); setDays(v); },
    radius,
    setRadius: (v: number) => { posthog.capture('studio_change_breakdown_radius', { value: v }); setRadius(v); },
    embedStyle,
    setEmbedStyle: (v: string) => { posthog.capture('studio_change_breakdown_style', { value: v }); setEmbedStyle(v); },
    transparentBg,
    setTransparentBg: (v: boolean | ((prev: boolean) => boolean)) => { posthog.capture('studio_toggle_breakdown_transparent'); setTransparentBg(v); },
    activeCards,
    bgColor,
    activeBg,
    activeText,
    setCardColor: (i: number, v: string) => { posthog.capture('studio_change_breakdown_card_color', { index: i, value: v }); setCardColor(i, v); },
    setBgColor: (v: string) => { posthog.capture('studio_change_breakdown_bg_color', { value: v }); setBgColor(v); },
    setTextColor: (v: string) => { posthog.capture('studio_change_breakdown_text_color', { value: v }); setTextColor(v); },
    ranges: breakdownRanges(),
    url,
    iframeCode,
    copiedKey,
    copy: copyWrapped,
  };
}
