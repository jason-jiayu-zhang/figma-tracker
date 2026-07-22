import { useState, useEffect, useMemo, useRef } from "react";
import posthog from "posthog-js";
import { useSearchParams } from "react-router-dom";
import { useSession } from "./session";
import { APP_ORIGIN } from "./config";
import {
  fimanuTheme,
  githubTheme,
  figmaTheme,
  estimateWidgetHeight,
} from "./embedThemes";
import type { HeatmapTheme } from "./components/Heatmap";
import { deriveRamp } from "./colorUtils";
import { readSettings, writeSettings } from "./settingsStore";

// Shared embed-heatmap settings: preset/style state, color overrides, the
// derived HeatmapTheme, file-selection wiring, and the widget URL / embed-code
// builders. File selection lives in useFigmaData, so the caller passes its
// selectedFileKeys/setSelectedFileKeys in (keeping a single data instance).

const STORE_KEY = "fimanu.studio.heatmap.v1";

type StoredHeatmap = {
  embedStyle: string;
  rectSize: number;
  rectRadius: number;
  overrideBg: string;
  overrideText: string;
  overrideLevels: string[];
  overrideEmpty: string;
  accentColor: string;
  transparentBg: boolean;
};

export function useEmbedSettings({
  selectedFileKeys,
  setSelectedFileKeys,
}: {
  selectedFileKeys: string[];
  setSelectedFileKeys: (keys: string[]) => void;
}) {
  const { user } = useSession();
  // Public embeds are addressed by the user's profile_slug (no auth). The embed
  // only renders data once the profile is published (public_enabled).
  const slug = user?.profile_slug || "";
  const published = !!user?.public_enabled && !!slug;

  const [searchParams, setSearchParams] = useSearchParams();
  const stored = useRef(readSettings<StoredHeatmap>(STORE_KEY)).current;

  const [embedStyle, setEmbedStyle] = useState(stored.embedStyle ?? "Fimanu Style");
  const [rectSize, setRectSize] = useState<number>(stored.rectSize ?? 12);
  const [rectRadius, setRectRadius] = useState<number>(stored.rectRadius ?? 2);
  const [overrideBg, setOverrideBg] = useState<string>(stored.overrideBg ?? "");
  const [overrideText, setOverrideText] = useState<string>(stored.overrideText ?? "");
  const [overrideLevels, setOverrideLevels] = useState<string[]>(stored.overrideLevels ?? []);
  const [overrideEmpty, setOverrideEmpty] = useState<string>(stored.overrideEmpty ?? "");
  const [accentColor, setAccentColor] = useState<string>(stored.accentColor ?? "#f8722f");
  // Paint no background behind the heatmap so it blends into the host page.
  const [transparentBg, setTransparentBg] = useState<boolean>(stored.transparentBg ?? false);

  useEffect(() => {
    writeSettings<StoredHeatmap>(STORE_KEY, {
      embedStyle,
      rectSize,
      rectRadius,
      overrideBg,
      overrideText,
      overrideLevels,
      overrideEmpty,
      accentColor,
      transparentBg,
    });
  }, [embedStyle, rectSize, rectRadius, overrideBg, overrideText, overrideLevels, overrideEmpty, accentColor, transparentBg]);

  // Sync state with URL params on mount and when params change
  useEffect(() => {
    const fileKeys = searchParams.get("files")?.split(",").filter(Boolean) || [];
    if (JSON.stringify(fileKeys) !== JSON.stringify(selectedFileKeys)) {
      setSelectedFileKeys(fileKeys);
    }
  }, [searchParams, setSelectedFileKeys]);

  // When embedStyle presets change, reset constraints/defaults if not "Custom Style".
  // Skipped on mount so a restored design isn't reset back to its preset.
  const styleSettled = useRef(false);
  useEffect(() => {
    if (!styleSettled.current) {
      styleSettled.current = true;
      return;
    }
    if (embedStyle === "Custom Style") return; // don't override manual adjustments
    const theme = embedStyle === 'GitHub Style' ? githubTheme : embedStyle === 'Figma Style' ? figmaTheme : fimanuTheme;
    setRectSize(theme.rectSize || 12);
    setRectRadius(theme.rectRadius || 2);
    setOverrideBg("");
    setOverrideText("");
    setOverrideLevels([]);
    setOverrideEmpty("");
    setTransparentBg(false);
  }, [embedStyle]);

  const handleToggleFile = (fileKey: string) => {
    const newKeys = selectedFileKeys.includes(fileKey)
      ? selectedFileKeys.filter((k) => k !== fileKey)
      : [...selectedFileKeys, fileKey];

    setSelectedFileKeys(newKeys);

    const nextParams = new URLSearchParams(searchParams);
    if (newKeys.length > 0) {
      nextParams.set("files", newKeys.join(","));
    } else {
      nextParams.delete("files");
    }
    setSearchParams(nextParams);
  };

  const handleSelectAllFiles = () => {
    setSelectedFileKeys([]);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("files");
    setSearchParams(nextParams);
  };

  const baseTheme = embedStyle === 'GitHub Style' ? githubTheme : embedStyle === 'Figma Style' ? figmaTheme : fimanuTheme;
  const activeLevels = overrideLevels.length === 4 ? overrideLevels : baseTheme.levelColors || [];
  const activeEmpty = overrideEmpty || baseTheme.emptyColor || "#d9d9d9";
  // The solid color the background picker edits — `activeBg` hides it while the
  // transparent toggle is on, but the picker still needs a real hex to open on.
  const bgColor = overrideBg || (embedStyle === 'GitHub Style' ? '#0d1116' : '#fffaf4');
  const activeBg = transparentBg ? "transparent" : bgColor;
  const activeText = overrideText || baseTheme.textColor || "#1A1A1A";

  const activeTheme: HeatmapTheme = {
    ...baseTheme,
    rectSize,
    rectRadius,
    levelColors: activeLevels,
    emptyColor: activeEmpty,
    textColor: activeText,
  };

  // Color/slider mutators: any manual edit drops the preset into Custom Style.
  const setLevelColor = (i: number, color: string) => {
    const next = [...activeLevels];
    next[i] = color;
    setOverrideLevels(next);
    setEmbedStyle("Custom Style");
  };
  const setEmptyColor = (color: string) => {
    setOverrideEmpty(color);
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
  // One brand color in, a full 4-step ramp + empty cell out. Saves the user
  // hand-picking five colors that still have to read as one hue.
  const setAccent = (color: string) => {
    const { levels, empty } = deriveRamp(color);
    setAccentColor(color);
    setOverrideLevels(levels);
    setOverrideEmpty(empty);
    setEmbedStyle("Custom Style");
  };
  const setSize = (value: number) => {
    setRectSize(value);
    setEmbedStyle("Custom Style");
  };
  const setRadius = (value: number) => {
    setRectRadius(value);
    setEmbedStyle("Custom Style");
  };

  // Single source of truth for the widget URL — used by the snippets and
  // "Preview in browser".
  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (slug) params.set("slug", slug);
    if (selectedFileKeys.length > 0) params.set("files", selectedFileKeys.join(","));
    params.set("style", embedStyle.split(" ")[0].toLowerCase());

    if (embedStyle === "Custom Style") {
      params.set("bg", activeBg.replace("#", ""));
      params.set("text", activeText.replace("#", ""));
      params.set("empty", activeEmpty.replace("#", ""));
      if (activeLevels.length === 4)
        params.set("levels", activeLevels.map((c) => c.replace("#", "")).join("-"));
      params.set("radius", rectRadius.toString());
      params.set("size", rectSize.toString());
    } else if (transparentBg) {
      // Transparent applies on top of any preset without going fully custom.
      params.set("bg", "transparent");
    }

    return `${APP_ORIGIN}/embed-widget?${params.toString()}`;
  }, [slug, selectedFileKeys, embedStyle, activeBg, activeText, activeEmpty, activeLevels, rectRadius, rectSize, transparentBg]);

  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="${estimateWidgetHeight(rectSize)}" frameborder="0" scrolling="no" style="border:none;overflow:hidden;" title="Figma activity"></iframe>`;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    });
  };

  const copyWrapped = (key: string, text: string) => {
    posthog.capture('studio_copy_snippet', { widget: 'heatmap', type: key });
    copy(key, text);
  };

  return {
    slug,
    published,
    embedStyle,
    setEmbedStyle: (v: string) => { posthog.capture('studio_change_heatmap_style', { value: v }); setEmbedStyle(v); },
    rectSize,
    rectRadius,
    transparentBg,
    setTransparentBg: (v: boolean | ((prev: boolean) => boolean)) => { posthog.capture('studio_toggle_heatmap_transparent'); setTransparentBg(v); },
    activeLevels,
    activeEmpty,
    activeBg,
    activeText,
    activeTheme,
    accentColor,
    bgColor,
    setAccent: (v: string) => { posthog.capture('studio_change_heatmap_accent', { value: v }); setAccent(v); },
    setLevelColor: (i: number, v: string) => { posthog.capture('studio_change_heatmap_level_color', { index: i, value: v }); setLevelColor(i, v); },
    setEmptyColor: (v: string) => { posthog.capture('studio_change_heatmap_empty_color', { value: v }); setEmptyColor(v); },
    setBgColor: (v: string) => { posthog.capture('studio_change_heatmap_bg_color', { value: v }); setBgColor(v); },
    setTextColor: (v: string) => { posthog.capture('studio_change_heatmap_text_color', { value: v }); setTextColor(v); },
    setSize: (v: number) => { posthog.capture('studio_change_heatmap_size', { value: v }); setSize(v); },
    setRadius: (v: number) => { posthog.capture('studio_change_heatmap_radius', { value: v }); setRadius(v); },
    handleToggleFile: (fileKey: string) => { posthog.capture('studio_toggle_heatmap_file'); handleToggleFile(fileKey); },
    handleSelectAllFiles: () => { posthog.capture('studio_select_all_heatmap_files'); handleSelectAllFiles(); },
    widgetUrl,
    iframeCode,
    copiedKey,
    copy: copyWrapped,
  };
}
