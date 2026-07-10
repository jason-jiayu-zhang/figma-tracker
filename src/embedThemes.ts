// Shared heatmap theme presets for the embed editor (Embed.tsx) and the public
// widget (EmbedWidget.tsx). Kept in one place so the two never drift apart.
import type { HeatmapTheme } from "./components/Heatmap";

export const fimanuTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#d9d9d9",
  levelColors: ["#1bca7c", "#1ab7fa", "#9851f9", "#f23b27"],
  textColor: "#1A1A1A", tooltipBgColor: "#2C2C2C", tooltipTextColor: "white",
};

export const githubTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#151b23",
  levelColors: ["#0e4429", "#196c2e", "#2da042", "#56d364"],
  textColor: "#9198a1", tooltipBgColor: "#c9d1d9", tooltipTextColor: "#0d1116",
};

export const figmaTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#d9d9d9",
  levelColors: ["#0acf83", "#1abcfe", "#a259ff", "#f24e1e"],
  textColor: "#1A1A1A", tooltipBgColor: "#2C2C2C", tooltipTextColor: "white",
};

// Default background painted behind the heatmap for each preset.
export const styleBg: Record<string, string> = {
  github: "#0d1116",
  figma: "#fffaf4",
  fimanu: "#fffaf4",
};

export function themeForStyle(style: string): HeatmapTheme {
  if (style === "github") return githubTheme;
  if (style === "figma") return figmaTheme;
  return fimanuTheme;
}

// Rough rendered height of the widget for a given cell size, used to set a
// sensible `height` on the generated <iframe> so it hugs the heatmap instead of
// leaving a tall band of empty space.
export function estimateWidgetHeight(rectSize: number): number {
  const gap = 4;
  const scale = rectSize / 12;
  const monthLabel = 10 * scale;
  const grid = 7 * rectSize + 6 * gap;
  const legend = 10 * scale + 8;
  const heatmap = monthLabel + gap + grid + 8 + legend;
  const widgetPadding = 16 * 2; // EmbedWidget inner container padding
  return Math.ceil(heatmap + widgetPadding + 16); // + small buffer
}
