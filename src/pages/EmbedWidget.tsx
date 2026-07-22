import React, { useEffect, useState } from "react";
import posthog from "posthog-js";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import FileVolumeBreakdown from "../components/FileVolumeBreakdown";
import { ActivityData, FigmaFile } from "../types";
import { APP_ORIGIN } from "../config";
import { themeForStyle } from "../embedThemes";

// True when rendered inside an <iframe>. Embedded, we hug the content so the
// host iframe isn't padded out to a full 100vh of empty space; standalone
// (the "Preview in Browser" tab) we center it in the viewport.
const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
  } catch {
    return "America/Los_Angeles";
  }
}

// Streak-badge token presets — kept identical to the backend buildBadgeSvg
// preset so an un-styled iframe matches the SVG (incl. dark's rgba border).
const STREAK_PRESET = {
  light: { accent: "#f23b27", surface: "#fffaf4", border: "#ebebeb", ink: "#1a1a1a", muted: "#737373" },
  dark: { accent: "#f23b27", surface: "#1f1f1f", border: "rgba(255,255,255,0.10)", ink: "#f5f5f5", muted: "#a6a6a6" },
} as const;

// The iframe's reason to exist: real web fonts the <img> SVG can't reach.
const FONT_STACKS: Record<string, string> = {
  urbanist: "'Urbanist', system-ui, sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  serif: "Georgia, 'Times New Roman', serif",
  rounded: "'Outfit', ui-rounded, system-ui, sans-serif",
};

function hexParam(v: string | null): string | null {
  return v && /^[0-9a-fA-F]{3,8}$/.test(v) ? `#${v}` : null;
}

function StreakBadge({ searchParams }: { searchParams: URLSearchParams }) {
  const slug = searchParams.get("slug") || "";
  const metric = searchParams.get("metric") === "edits" ? "edits" : "streak";
  const theme = searchParams.get("theme") === "dark" ? "dark" : "light";
  const emoji = searchParams.get("emoji") === "1" || searchParams.get("emoji") === "true";
  const font = FONT_STACKS[searchParams.get("font") || "urbanist"] || FONT_STACKS.urbanist;
  const radiusRaw = parseInt(searchParams.get("radius") || "8", 10);
  const radius = Number.isNaN(radiusRaw) ? 8 : Math.max(0, Math.min(24, radiusRaw));

  const preset = STREAK_PRESET[theme];
  const accent = hexParam(searchParams.get("accent")) || preset.accent;
  const surface = hexParam(searchParams.get("bg")) || preset.surface;
  const border = hexParam(searchParams.get("border")) || preset.border;
  const ink = hexParam(searchParams.get("text") || searchParams.get("ink")) || preset.ink;
  const muted = hexParam(searchParams.get("muted")) || preset.muted;

  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    const tz = browserTz();
    axios
      .get(`/api/public/${encodeURIComponent(slug)}/insights?tz=${encodeURIComponent(tz)}`)
      .then((res) => {
        const d = res.data || {};
        setValue(metric === "edits" ? d?.named?.total ?? 0 : d?.streak?.current ?? 0);
      })
      .catch(() => {
        setValue(0);
        posthog.capture('error_widget_render', { widget: 'streak', error: 'api_error' });
      });
  }, [slug, metric]);

  const num = value == null ? "—" : metric === "edits" ? value.toLocaleString() : String(value);
  const label = metric === "edits" ? "edits" : "day streak";

  const flame = emoji ? (
    <span style={{ fontSize: 15, lineHeight: 1 }}>🔥</span>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );

  const outerStyle: React.CSSProperties = isEmbedded
    ? { display: "flex", justifyContent: "flex-start", width: "100%", background: "transparent" }
    : {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        width: "100%",
        background: "transparent",
      };

  return (
    <div style={outerStyle}>
      <div
        aria-label={`${num} ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 28,
          padding: "0 11px",
          boxSizing: "border-box",
          borderRadius: radius,
          backgroundColor: surface,
          border: `1px solid ${border}`,
          fontFamily: font,
        }}
      >
        {flame}
        <span style={{ fontSize: 12, fontWeight: 700, color: ink, fontVariantNumeric: "tabular-nums" }}>{num}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: muted }}>{label}</span>
      </div>
    </div>
  );
}

function FileBreakdown({ searchParams }: { searchParams: URLSearchParams }) {
  const slug = searchParams.get("slug") || "";
  const daysRaw = parseInt(searchParams.get("days") || "365", 10);
  const days = Number.isNaN(daysRaw) ? 365 : Math.max(1, Math.min(3650, daysRaw));

  const style = searchParams.get("style") || "fimanu";
  const bg = searchParams.get("bg");
  const text = searchParams.get("text");
  const cards = searchParams.get("cards")?.split("-").map(c => `#${c}`);

  const getBaseTheme = (s: string) => {
    if (s === 'github') return { bg: '#0d1116', text: '#c9d1d9', cards: ['#56d364', '#2da042', '#196c2e', '#0e4429'] };
    if (s === 'figma') return { bg: '#fffaf4', text: '#ffffff', cards: ['#f24e1e', '#1abcfe', '#0acf83', '#a259ff'] };
    return { bg: '#fffaf4', text: '#ffffff', cards: [] as string[] };
  };
  
  const baseTheme = getBaseTheme(style);
  
  const activeBg = bg === "transparent" ? "transparent" : (hexParam(bg) || baseTheme.bg);
  const activeText = hexParam(text) || baseTheme.text;
  const activeCards = cards && cards.length === 4 ? cards : baseTheme.cards;

  const radiusRaw = parseInt(searchParams.get("radius") || "16", 10);
  const radius = Number.isNaN(radiusRaw) ? 16 : Math.max(0, Math.min(48, radiusRaw));

  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [files, setFiles] = useState<Pick<FigmaFile, "file_key" | "last_modified">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    const tz = browserTz();
    axios
      .get(`/api/public/${encodeURIComponent(slug)}/activity?mode=all&days=${days}&tz=${encodeURIComponent(tz)}`)
      .then((res) => {
        setActivity({
          rows: res.data?.rows ?? [],
          dailyTotals: res.data?.dailyTotals ?? {},
          days,
          filterMine: false,
          myFigmaUserId: null,
        });
        setFiles(res.data?.files ?? []);
      })
      .catch(() => {
        setActivity({ rows: [], dailyTotals: {}, days, filterMine: false, myFigmaUserId: null });
        setFiles([]);
        posthog.capture('error_widget_render', { widget: 'breakdown', error: 'api_error' });
      })
      .finally(() => setLoading(false));
  }, [slug, days]);

  const outerStyle: React.CSSProperties = isEmbedded
    ? { width: "100%", background: "transparent" }
    : {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        width: "100%",
        background: "transparent",
      };

  const containerStyle: React.CSSProperties = {
    backgroundColor: activeBg,
    padding: 16,
    borderRadius: 16,
    boxSizing: "border-box",
    width: isEmbedded ? "100%" : 640,
    height: 300,
    display: "flex",
    flexDirection: "column",
  };

  if (loading) {
    return (
      <div style={outerStyle}>
        <div style={containerStyle}>
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="animate-pulse motion-reduce:animate-none"
            style={{ flex: 1, borderRadius: 16, background: "rgba(128,128,128,0.2)" }}
          >
            <span className="sr-only">Loading breakdown…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <div style={containerStyle}>
        <FileVolumeBreakdown activity={activity} files={files} embedded cardRadius={radius} textColor={activeText} cardColors={activeCards} />
      </div>
    </div>
  );
}

export default function EmbedWidget() {
  const [searchParams] = useSearchParams();
  const widget = searchParams.get("widget") || "heatmap";
  const isStreak = widget === "streak";
  const isBreakdown = widget === "breakdown";

  const slug = searchParams.get("slug") || "";
  const fileKeys = (searchParams.get("files")?.split(",").filter(Boolean)) || [];

  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Public embed: fetch from /api/public/:slug/activity (no auth/cookie required).
  useEffect(() => {
    if (isStreak || isBreakdown) {
      setLoading(false);
      return;
    }
    if (!slug) {
      setLoading(false);
      return;
    }
    const tz = browserTz();
    const fileKeysParam =
      fileKeys.length > 0 ? `&fileKeys=${encodeURIComponent(fileKeys.join(","))}` : "";
    axios
      .get(`/api/public/${encodeURIComponent(slug)}/activity?mode=all&days=365&tz=${encodeURIComponent(tz)}${fileKeysParam}`)
      .then((res) => setDailyTotals(res.data?.dailyTotals ?? {}))
      .catch(() => {
        setDailyTotals({});
        posthog.capture('error_widget_render', { widget: 'heatmap', error: 'api_error' });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, searchParams.get("files"), isStreak, isBreakdown]);

  useEffect(() => {
    if (isEmbedded) {
      posthog.capture('embed_viewed', { widget, referrer: document.referrer });
    }
  }, [isEmbedded, widget]);

  const rawStyle = searchParams.get("style") || "fimanu";
  const bg = searchParams.get("bg");
  const text = searchParams.get("text");
  const empty = searchParams.get("empty");
  const levels = searchParams.get("levels")?.split("-");
  const radius = searchParams.get("radius");
  const size = searchParams.get("size");

  const baseTheme = themeForStyle(rawStyle);

  const activeTheme: HeatmapTheme = {
    ...baseTheme,
    emptyColor: empty ? `#${empty}` : baseTheme.emptyColor,
    textColor: text ? `#${text}` : baseTheme.textColor,
    levelColors: levels && levels.length === 4 ? levels.map((l) => `#${l}`) : baseTheme.levelColors,
    rectRadius: radius ? parseFloat(radius) : baseTheme.rectRadius,
    rectSize: size ? parseFloat(size) : baseTheme.rectSize,
  };

  // Override global body background for the widget (transparent iframe).
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyImage = document.body.style.backgroundImage;
    const originalBodyBackground = document.body.style.background;

    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.body.style.backgroundImage = "none";
    document.documentElement.style.backgroundColor = "transparent";
    document.documentElement.style.background = "transparent";

    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundImage = originalBodyImage;
      document.body.style.background = originalBodyBackground;
    };
  }, []);

  if (!slug) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", width: "100%" }}>
        <div style={{ fontSize: 12, color: "#A6A6A6", fontFamily: "system-ui, sans-serif" }}>
          This embed needs a published profile (missing <code>slug</code>).
        </div>
      </div>
    );
  }

  if (isStreak) {
    return <StreakBadge searchParams={searchParams} />;
  }

  if (isBreakdown) {
    return <FileBreakdown searchParams={searchParams} />;
  }

  const bgColor =
    bg === "transparent" ? "transparent"
    : bg ? `#${bg}`
    : (rawStyle === "github" ? "#0d1116" : "#fffaf4");
  const profileUrl = APP_ORIGIN;

  const outerStyle: React.CSSProperties = isEmbedded
    ? { width: "100%", background: "transparent" }
    : {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        width: "100%",
        background: "transparent",
      };

  const innerStyle: React.CSSProperties = isEmbedded
    ? { backgroundColor: bgColor, padding: 16, borderRadius: 16, width: "100%", boxSizing: "border-box" }
    : { backgroundColor: bgColor, padding: 16, borderRadius: 16, display: "inline-block" };

  // Skeleton mirrors the rendered widget: same background, padding and radius so
  // the heatmap settles in place instead of popping against a different surface.
  if (loading) {
    return (
      <div style={outerStyle}>
        <div style={innerStyle}>
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="animate-pulse motion-reduce:animate-none"
            style={{ width: isEmbedded ? "100%" : 320, height: 120, borderRadius: 8, background: "rgba(128,128,128,0.2)" }}
          >
            <span className="sr-only">Loading activity…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <Heatmap
          data={dailyTotals}
          theme={rawStyle === "github" ? "dark" : "light"}
          customTheme={activeTheme}
          profileUrl={profileUrl}
        />
      </div>
    </div>
  );
}
