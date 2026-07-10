import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import { Copy, Telescope, Check, Info, SlidersHorizontal, Monitor, Layers } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { useSession } from "../session";
import { APP_ORIGIN } from "../config";
import { useSearchParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import {
  fimanuTheme,
  githubTheme,
  figmaTheme,
  estimateWidgetHeight,
} from "../embedThemes";
import { SectionHeader, Button, SegmentedControl } from "../components/ui";

function getPreviewColor(theme: string, level: number) {
  if (theme === 'github') return ['bg-[#151b23]', 'bg-[#023a16]', 'bg-[#196c2e]', 'bg-[#2da042]', 'bg-[#56d364]'][level - 1];
  if (theme === 'fimanu') return ['bg-[#d9d9d9]', 'bg-[#1bca7c]', 'bg-[#1ab7fa]', 'bg-[#9851f9]', 'bg-[#f23b27]'][level - 1];
  if (theme === 'figma') return ['bg-[#d9d9d9]', 'bg-[#0acf83]', 'bg-[#1abcfe]', 'bg-[#a259ff]', 'bg-[#f24e1e]'][level - 1];
  return ['bg-[#d9d9d9]', 'bg-[#1bca7c]', 'bg-[#1ab7fa]', 'bg-[#9851f9]', 'bg-[#f23b27]'][level - 1];
}

const StyleOption = ({ active, label, previewTheme, onClick }: any) => {
  return (
    <div onClick={onClick} className="flex flex-col gap-2 items-start justify-center cursor-pointer transition-all hover:-translate-y-0.5" style={{ width: '140px' }}>
      <div className="flex gap-2 items-center shrink-0">
        <div className={`h-4 w-4 rounded-[3.2px] shadow-sm flex items-center justify-center ${active ? 'bg-[#1A1A1A]' : 'bg-canvas border border-line'}`}>
          {active && <Check size={10} color="white" strokeWidth={3} />}
        </div>
        <p className={`font-sans text-[12px] tracking-[-0.12px] whitespace-nowrap transition-colors ${active ? 'font-bold text-ink' : 'font-normal text-body'}`}>
          {label}
        </p>
      </div>
      <div className={`${previewTheme === 'github' ? 'bg-[#0d1116]' : 'bg-surface border border-line'} flex items-center justify-center px-2 py-1.5 rounded-lg shadow-sm w-full`}>
        <div className="flex gap-1.5 items-center">
          <p className={`text-[10px] tracking-[-0.1px] ${previewTheme === 'github' ? 'text-[#9198a1]' : 'text-ink'}`}>Less</p>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`rounded-[3px] size-3 ${getPreviewColor(previewTheme, i)}`} />
            ))}
          </div>
          <p className={`text-[10px] tracking-[-0.1px] ${previewTheme === 'github' ? 'text-[#9198a1]' : 'text-ink'}`}>More</p>
        </div>
      </div>
    </div>
  );
};

const ColorPicker = ({ color, onChange, title }: { color: string, onChange: (c: string) => void, title?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popover = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popover.current && !popover.current.contains(e.target as Node)) {
        close();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, close]);

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="size-7 rounded-md shadow-sm cursor-pointer border border-black/10 transition-all hover:scale-110 active:scale-95"
        style={{ backgroundColor: color }}
        title={title}
      />
      {isOpen && (
        <div
          ref={popover}
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 p-2 bg-surface rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#ECECEC] animate-in fade-in zoom-in duration-200"
        >
          <div className="custom-picker">
            <HexColorPicker color={color} onChange={onChange} />
          </div>
          <div className="mt-2 px-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm border border-black/5" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono font-bold text-ink uppercase tracking-wider">{color}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function EmbedEditor() {
  const { activity, loading, files, selectedFileKeys, setSelectedFileKeys, setFilterMine } = useFigmaData();
  const { user } = useSession();
  // Public embeds are addressed by the user's profile_slug (no auth). The embed
  // only renders data once the profile is published (public_enabled).
  const slug = user?.profile_slug || "";
  const published = !!user?.public_enabled && !!slug;

  // Embed shows all edits (not just mine) so file selection works for any file
  useEffect(() => {
    setFilterMine(false);
  }, [setFilterMine]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [embedStyle, setEmbedStyle] = useState("Fimanu Style");
  const [copied, setCopied] = useState(false);
  // How the "Copy" button emits the embed: a bare URL (paste into Notion etc.)
  // or a ready-to-drop <iframe> tag (for websites / READMEs that allow HTML).
  const [copyFormat, setCopyFormat] = useState<"link" | "iframe">("link");

  // Settings State
  const [rectSize, setRectSize] = useState<number>(12);
  const [rectRadius, setRectRadius] = useState<number>(2);
  const [overrideBg, setOverrideBg] = useState<string>("");
  const [overrideText, setOverrideText] = useState<string>("");
  const [overrideLevels, setOverrideLevels] = useState<string[]>([]);
  const [overrideEmpty, setOverrideEmpty] = useState<string>("");
  // Paint no background behind the heatmap so it blends into the host page.
  const [transparentBg, setTransparentBg] = useState<boolean>(false);

  // Sync state with URL params on mount and when params change
  useEffect(() => {
    const fileKeys = searchParams.get("files")?.split(",").filter(Boolean) || [];
    // Only update if different to avoid loops
    if (JSON.stringify(fileKeys) !== JSON.stringify(selectedFileKeys)) {
      setSelectedFileKeys(fileKeys);
    }
  }, [searchParams, setSelectedFileKeys]);

  // When embedStyle presets change, reset constraints/defaults if not "Custom Style"
  useEffect(() => {
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

  // Update URL when state changes
  const handleToggleFile = (fileKey: string) => {
    const newKeys = selectedFileKeys.includes(fileKey)
      ? selectedFileKeys.filter((k: string) => k !== fileKey)
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

  const totalEdits = useMemo(() => {
    return activity
      ? Object.values(activity.dailyTotals).reduce((a, b: any) => a + b, 0)
      : 0;
  }, [activity]);

  const baseTheme = embedStyle === 'GitHub Style' ? githubTheme : embedStyle === 'Figma Style' ? figmaTheme : fimanuTheme;
  const activeLevels = overrideLevels.length === 4 ? overrideLevels : baseTheme.levelColors || [];
  const activeEmpty = overrideEmpty || baseTheme.emptyColor || "#d9d9d9";
  const activeBg = transparentBg
    ? "transparent"
    : overrideBg || (embedStyle === 'GitHub Style' ? '#0d1116' : '#fffaf4');
  const activeText = overrideText || baseTheme.textColor || "#1A1A1A";

  const activeTheme: HeatmapTheme = {
    ...baseTheme,
    rectSize,
    rectRadius,
    levelColors: activeLevels,
    emptyColor: activeEmpty,
    textColor: activeText,
  };

  // Single source of truth for the widget URL — used by the copy button, the
  // per-file copy shortcut, and "Preview in Browser" (previously duplicated).
  const buildWidgetUrl = useCallback(
    (fileKeysList: string[]) => {
      const params = new URLSearchParams();
      if (slug) params.set("slug", slug);
      if (fileKeysList.length > 0) params.set("files", fileKeysList.join(","));
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
    },
    [slug, embedStyle, activeBg, activeText, activeEmpty, activeLevels, rectRadius, rectSize, transparentBg]
  );

  // Wrap the URL in the chosen output format (bare link or <iframe> tag).
  const buildEmbedCode = useCallback(
    (url: string) => {
      if (copyFormat === "iframe") {
        const h = estimateWidgetHeight(rectSize);
        return `<iframe src="${url}" width="100%" height="${h}" frameborder="0" scrolling="no" style="border:none;overflow:hidden;" title="Figma activity"></iframe>`;
      }
      return url;
    },
    [copyFormat, rectSize]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(buildEmbedCode(buildWidgetUrl(selectedFileKeys)));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !activity) return null;

  return (
    <div className="flex gap-8 items-start shrink-0 w-full">
      {/* Settings Box — sticky so it stays put while the preview/file list scroll.
          No overflow/max-h here on purpose: making it a scroll container would
          capture the mouse wheel and stop the page from scrolling on hover. */}
      <div className="bg-surface flex flex-col gap-6 items-center justify-start p-6 rounded-4xl shadow-card shrink-0 w-[360px] sticky top-2 self-start">
        <SectionHeader
          color="accent"
          icon={<SlidersHorizontal size={20} />}
          title="Embed Settings"
          subtitle="Change information and design of your embed."
        />

        <div className="flex flex-col gap-6 w-full px-1">
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-muted uppercase tracking-wider">Embed Styles</p>
            <div className="flex flex-wrap gap-3 w-full">
              <StyleOption active={embedStyle === "Fimanu Style"} label="Fimanu Style" previewTheme="fimanu" onClick={() => setEmbedStyle("Fimanu Style")} />
              <StyleOption active={embedStyle === "GitHub Style"} label="GitHub Style" previewTheme="github" onClick={() => setEmbedStyle("GitHub Style")} />
              <StyleOption active={embedStyle === "Figma Style"} label="Figma Style" previewTheme="figma" onClick={() => setEmbedStyle("Figma Style")} />
              <StyleOption active={embedStyle === "Custom Style"} label="Custom Style" previewTheme="custom" onClick={() => setEmbedStyle("Custom Style")} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-muted uppercase tracking-wider">Heatmap Colors</p>
            <div className="flex gap-2 items-center">
              {[3, 2, 1, 0].map(i => (
                <ColorPicker
                  key={i}
                  title={`Level ${i + 1} color`}
                  color={activeLevels[i]}
                  onChange={newColor => {
                    const newLevels = [...activeLevels];
                    newLevels[i] = newColor;
                    setOverrideLevels(newLevels);
                    setEmbedStyle("Custom Style");
                  }}
                />
              ))}
              <ColorPicker
                title="Zero activity color"
                color={activeEmpty}
                onChange={newColor => {
                  setOverrideEmpty(newColor);
                  setEmbedStyle("Custom Style");
                }}
              />
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-[13px] font-bold text-muted uppercase tracking-wider">Background</p>
              <div className="w-full">
                <ColorPicker
                  color={activeBg}
                  onChange={newColor => {
                    setOverrideBg(newColor);
                    setEmbedStyle("Custom Style");
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-[13px] font-bold text-muted uppercase tracking-wider">Text</p>
              <div className="w-full">
                <ColorPicker
                  color={activeText}
                  onChange={newColor => {
                    setOverrideText(newColor);
                    setEmbedStyle("Custom Style");
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold text-muted uppercase tracking-wider whitespace-nowrap">Border Radius: {rectRadius.toFixed(1)}px</p>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              <input type="range" className="w-[calc(100%-8px)] mx-auto accent-[#f23b27] h-1 bg-[#EBEBEB] rounded-lg appearance-none cursor-pointer border-none shadow-none focus:outline-none" min="0" max={rectSize / 2} step="0.5" value={rectRadius} onChange={e => { setRectRadius(parseFloat(e.target.value)); setEmbedStyle("Custom Style"); }} />
              <div className="flex justify-between text-[10px] text-muted font-bold uppercase tracking-wider mt-1 px-1">
                <span>Sharp</span>
                <span>Soft</span>
                <span>Rounded</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold text-muted uppercase tracking-wider whitespace-nowrap">Embed Size: {rectSize}px</p>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              <input type="range" className="w-[calc(100%-8px)] mx-auto accent-[#f23b27] h-1 bg-[#EBEBEB] rounded-lg appearance-none cursor-pointer border-none shadow-none focus:outline-none" min="6" max="24" step="1" value={rectSize} onChange={e => { setRectSize(parseInt(e.target.value)); setEmbedStyle("Custom Style"); }} />
              <div className="flex justify-between text-[10px] text-muted font-bold uppercase tracking-wider mt-1 px-1">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-bold text-muted uppercase tracking-wider">Transparent background</p>
              <p className="text-[11px] text-muted tracking-[-0.11px]">Blend into any page — no background fill.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={transparentBg}
              onClick={() => setTransparentBg((v) => !v)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${transparentBg ? "bg-[#0acf83]" : "bg-[#d9d9d9]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform ${transparentBg ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-[calc(100%-8px)] mt-auto pt-4 pb-2">
          {!published && (
            <p className="text-[11px] leading-snug text-muted bg-canvas border border-line rounded-lg px-3 py-2">
              Publish your profile (set a URL + enable public in <span className="font-bold text-body">Profile</span>) so this embed can load without a login.
            </p>
          )}
          {/* Output format: bare link (Notion/paste) vs. <iframe> tag (websites) */}
          <div className="bg-canvas flex items-center p-1 rounded-lg w-full">
            {([
              { key: "link", label: "Link" },
              { key: "iframe", label: "iframe" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setCopyFormat(opt.key)}
                className={`flex-1 h-8 flex items-center justify-center rounded-md text-[13px] font-medium tracking-[-0.13px] transition-all ${copyFormat === opt.key ? "bg-surface shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] text-ink" : "text-muted hover:text-ink"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button onClick={handleCopy} className="w-full">
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
            {copied ? "Copied!" : copyFormat === "iframe" ? "Copy iframe Code" : "Copy Embed Link"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(buildWidgetUrl(selectedFileKeys), "_blank")}
            className="w-full"
          >
            <Telescope size={16} strokeWidth={2.5} /> Preview in Browser
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 min-w-0">
        <div className="bg-surface flex flex-col gap-6 items-start overflow-clip p-6 rounded-4xl shadow-card shrink-0 w-full text-ink">
          <SectionHeader
            color="blue"
            icon={<Monitor size={20} />}
            title="Embed Preview"
            subtitle="View what your embed will appear as."
          />

          {/* Fake Widget Container. When transparent, show a checkerboard so the
              "no background" effect is visible in the preview. */}
          <div
            className={`w-full rounded-2xl border border-transparent shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-4 relative transition-colors`}
            style={
              transparentBg
                ? {
                    backgroundColor: "#fff",
                    backgroundImage:
                      "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                  }
                : { backgroundColor: activeBg }
            }
          >
            <Heatmap
              data={activity?.dailyTotals ?? {}}
              theme={embedStyle === 'GitHub Style' ? 'dark' : 'light'}
              customTheme={activeTheme}
              profileUrl="/profile"
            />
          </div>
        </div>


        {/* File Selection Box */}
        <div className="bg-surface flex flex-col gap-6 items-start overflow-clip p-6 rounded-4xl shadow-card shrink-0 w-full text-ink">
          <SectionHeader
            color="purple"
            icon={<Layers size={20} />}
            title="Select Files"
            subtitle="Choose which files to display in your embed."
          />

          <div className="flex flex-col gap-1 w-full overflow-y-auto pr-1 max-h-[350px] custom-scrollbar">
            <div
              onClick={() => {
                setSelectedFileKeys([]);
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete("files");
                  return next;
                });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${selectedFileKeys.length === 0 ? 'bg-canvas border border-[#f23b27]/20' : 'hover:bg-hairline border border-transparent'}`}
            >
              <div className={`size-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFileKeys.length === 0 ? 'bg-[#f23b27] border-[#f23b27]' : 'border-line bg-surface'}`}>
                {selectedFileKeys.length === 0 && <Check size={8} color="white" strokeWidth={4} />}
              </div>
              <span className={`text-[11px] font-bold truncate ${selectedFileKeys.length === 0 ? 'text-ink' : 'text-body'}`}>All Files Activity</span>
            </div>
            {files.map((file: any) => (
              <div
                key={file.file_key}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors group ${selectedFileKeys.includes(file.file_key) ? 'bg-canvas border border-[#f23b27]/20' : 'hover:bg-hairline border border-transparent'}`}
              >
                <div
                  onClick={() => handleToggleFile(file.file_key)}
                  className="flex items-center gap-1.5 flex-1 cursor-pointer overflow-hidden"
                >
                  <div className={`size-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFileKeys.includes(file.file_key) ? 'bg-[#f23b27] border-[#f23b27]' : 'border-line bg-surface'}`}>
                    {selectedFileKeys.includes(file.file_key) && <Check size={8} color="white" strokeWidth={4} />}
                  </div>
                  <div className="flex flex-col overflow-hidden leading-tight">
                    <span className={`text-[11px] font-bold truncate ${selectedFileKeys.includes(file.file_key) ? 'text-ink' : 'text-body'}`}>{file.name}</span>
                    <span className="text-[9px] text-muted truncate">{file.project_name}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(buildEmbedCode(buildWidgetUrl([file.file_key])));
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface rounded transition-all text-muted hover:text-[#f23b27] shadow-sm border border-transparent hover:border-line"
                  title={copyFormat === "iframe" ? "Copy iframe for this file" : "Copy embed link for this file"}
                >
                  <Copy size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

