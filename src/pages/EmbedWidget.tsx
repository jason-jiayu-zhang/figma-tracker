import React, { useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import { useFigmaData } from "../useFigmaData";

const fimanuTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#d9d9d9",
  levelColors: ["#1bca7c", "#1ab7fa", "#9851f9", "#f23b27"],
  textColor: "#1A1A1A", tooltipBgColor: "#ffffff", tooltipTextColor: "white"
};
const githubTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#151b23",
  levelColors: ["#023a16", "#196c2e", "#2da042", "#56d364"],
  textColor: "#9198a1", tooltipBgColor: "#c9d1d9", tooltipTextColor: "#0d1116"
};
const figmaTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#d9d9d9",
  levelColors: ["#0acf83", "#1abcfe", "#a259ff", "#f24e1e"],
  textColor: "#1A1A1A", tooltipBgColor: "#2C2C2C", tooltipTextColor: "white"
};

export default function EmbedWidget() {
  const { activity, loading, selectedFileKeys, setSelectedFileKeys, setUserIdOverride } = useFigmaData();
  const [searchParams] = useSearchParams();

  // Pick up files and user from URL
  useEffect(() => {
    const fileKeys = searchParams.get("files")?.split(",").filter(Boolean) || [];
    if (JSON.stringify(fileKeys) !== JSON.stringify(selectedFileKeys)) {
      setSelectedFileKeys(fileKeys);
    }

    const userId = searchParams.get("userId");
    setUserIdOverride(userId);
  }, [searchParams, setSelectedFileKeys, setUserIdOverride]);

  const rawStyle = searchParams.get("style") || "fimanu";
  const bg = searchParams.get("bg");
  const text = searchParams.get("text");
  const empty = searchParams.get("empty");
  const levels = searchParams.get("levels")?.split("-");
  const radius = searchParams.get("radius");
  const size = searchParams.get("size");

  const baseTheme = rawStyle === "github" ? githubTheme : rawStyle === "figma" ? figmaTheme : fimanuTheme;

  const activeTheme: HeatmapTheme = {
    ...baseTheme,
    emptyColor: empty ? `#${empty}` : baseTheme.emptyColor,
    textColor: text ? `#${text}` : baseTheme.textColor,
    levelColors: levels && levels.length === 4 ? levels.map(l => `#${l}`) : baseTheme.levelColors,
    rectRadius: radius ? parseFloat(radius) : baseTheme.rectRadius,
    rectSize: size ? parseFloat(size) : baseTheme.rectSize,
  };

  // Override global body background for the widget
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

  const bgColor = bg ? `#${bg}` : (rawStyle === "github" ? "#0d1116" : "#fffaf4");

  const userId = searchParams.get("userId");
  const profileUrl = userId ? `${window.location.origin}/profile?userId=${userId}` : `${window.location.origin}/profile`;

  if (loading && !activity) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      width: "100%",
      background: "transparent"
    }}>
      <div style={{ backgroundColor: bgColor, padding: "16px", display: "inline-block", borderRadius: "16px" }}>
        <Heatmap
          data={activity?.dailyTotals ?? {}}
          theme={rawStyle === "github" ? "dark" : "light"}
          customTheme={activeTheme}
          profileUrl={profileUrl}
        />
      </div>
    </div>
  );
}
