import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Heatmap, { HeatmapTheme } from "../components/Heatmap";
import { Copy, Telescope, Check, Info } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { useSearchParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";

const fimanuTheme: HeatmapTheme = {
  rectSize: 12, rectRadius: 2, gap: 4, emptyColor: "#d9d9d9",
  levelColors: ["#1bca7c", "#1ab7fa", "#9851f9", "#f23b27"],
  textColor: "#1A1A1A", tooltipBgColor: "#2C2C2C", tooltipTextColor: "white"
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
        <div className={`h-4 w-4 rounded-[3.2px] shadow-sm flex items-center justify-center ${active ? 'bg-[#1A1A1A]' : 'bg-[#fffaf4] border border-[#EBEBEB]'}`}>
          {active && <Check size={10} color="white" strokeWidth={3} />}
        </div>
        <p className={`font-sans text-[12px] tracking-[-0.12px] whitespace-nowrap transition-colors ${active ? 'font-bold text-[#1A1A1A]' : 'font-normal text-[#737373]'}`}>
          {label}
        </p>
      </div>
      <div className={`${previewTheme === 'github' ? 'bg-[#0d1116]' : 'bg-white border border-[#EBEBEB]'} flex items-center justify-center px-2 py-1.5 rounded-lg shadow-sm w-full`}>
        <div className="flex gap-1.5 items-center">
          <p className={`text-[10px] tracking-[-0.1px] ${previewTheme === 'github' ? 'text-[#9198a1]' : 'text-[#1A1A1A]'}`}>Less</p>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`rounded-[3px] size-3 ${getPreviewColor(previewTheme, i)}`} />
            ))}
          </div>
          <p className={`text-[10px] tracking-[-0.1px] ${previewTheme === 'github' ? 'text-[#9198a1]' : 'text-[#1A1A1A]'}`}>More</p>
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
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 p-2 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#ECECEC] animate-in fade-in zoom-in duration-200"
        >
          <div className="custom-picker">
            <HexColorPicker color={color} onChange={onChange} />
          </div>
          <div className="mt-2 px-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm border border-black/5" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono font-bold text-[#1A1A1A] uppercase tracking-wider">{color}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function EmbedEditor() {
  const { stats, activity, loading, files, selectedFileKeys, setSelectedFileKeys, setFilterMine } = useFigmaData();

  // Embed shows all edits (not just mine) so file selection works for any file
  useEffect(() => {
    setFilterMine(false);
  }, [setFilterMine]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [embedStyle, setEmbedStyle] = useState("Fimanu Style");
  const [copied, setCopied] = useState(false);

  // Settings State
  const [rectSize, setRectSize] = useState<number>(12);
  const [rectRadius, setRectRadius] = useState<number>(2);
  const [overrideBg, setOverrideBg] = useState<string>("");
  const [overrideText, setOverrideText] = useState<string>("");
  const [overrideLevels, setOverrideLevels] = useState<string[]>([]);
  const [overrideEmpty, setOverrideEmpty] = useState<string>("");

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
  const activeBg = overrideBg || (embedStyle === 'GitHub Style' ? '#0d1116' : '#fffaf4');
  const activeText = overrideText || baseTheme.textColor || "#1A1A1A";

  const activeTheme: HeatmapTheme = {
    ...baseTheme,
    rectSize,
    rectRadius,
    levelColors: activeLevels,
    emptyColor: activeEmpty,
    textColor: activeText,
  };

  const handleCopy = () => {
    const baseUrl = window.location.origin + "/embed-widget";
    const params = new URLSearchParams();
    if (selectedFileKeys.length > 0) params.set("files", selectedFileKeys.join(","));
    if (stats?.myFigmaUserId) params.set("userId", stats.myFigmaUserId);
    params.set("style", embedStyle.split(" ")[0].toLowerCase());
    
    if (embedStyle === "Custom Style") {
      params.set("bg", activeBg.replace("#", ""));
      params.set("text", activeText.replace("#", ""));
      params.set("empty", activeEmpty.replace("#", ""));
      if (activeLevels.length === 4) params.set("levels", activeLevels.map(c => c.replace("#", "")).join("-"));
      params.set("radius", rectRadius.toString());
      params.set("size", rectSize.toString());
    }
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !activity) return null;

  return (
    <div className="flex gap-8 items-stretch shrink-0 w-full h-fit">
      {/* Settings Box */}
      <div className="bg-white flex flex-col gap-6 items-center justify-start p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-[360px] overflow-y-auto custom-scrollbar">
        <div className="flex gap-3 items-center w-full">
          <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
            <SettingsIcon />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="font-bold text-[20px] tracking-[-0.24px] leading-none text-[#1A1A1A]">Embed Settings</h1>
            <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Change information and design of your embed.</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full px-1">
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider">Embed Styles</p>
            <div className="flex flex-wrap gap-3 w-full">
              <StyleOption active={embedStyle === "Fimanu Style"} label="Fimanu Style" previewTheme="fimanu" onClick={() => setEmbedStyle("Fimanu Style")} />
              <StyleOption active={embedStyle === "GitHub Style"} label="GitHub Style" previewTheme="github" onClick={() => setEmbedStyle("GitHub Style")} />
              <StyleOption active={embedStyle === "Figma Style"} label="Figma Style" previewTheme="figma" onClick={() => setEmbedStyle("Figma Style")} />
              <StyleOption active={embedStyle === "Custom Style"} label="Custom Style" previewTheme="custom" onClick={() => setEmbedStyle("Custom Style")} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider">Heatmap Colors</p>
            <div className="flex gap-2 items-center">
              {[3, 2, 1, 0].map(i => (
                <ColorPicker 
                  key={i}
                  title={`Level ${i+1} color`}
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
              <p className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider">Background</p>
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
              <p className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider">Text</p>
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
            <p className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider whitespace-nowrap">Border Radius: {rectRadius.toFixed(1)}px</p>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              <input type="range" className="w-[calc(100%-8px)] mx-auto accent-[#f23b27] h-1 bg-[#EBEBEB] rounded-lg appearance-none cursor-pointer border-none shadow-none focus:outline-none" min="0" max={rectSize / 2} step="0.5" value={rectRadius} onChange={e => { setRectRadius(parseFloat(e.target.value)); setEmbedStyle("Custom Style"); }} />
              <div className="flex justify-between text-[10px] text-[#A6A6A6] font-bold uppercase tracking-wider mt-1 px-1">
                <span>Sharp</span>
                <span>Soft</span>
                <span>Rounded</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold text-[#A6A6A6] uppercase tracking-wider whitespace-nowrap">Embed Size: {rectSize}px</p>
            <div className="flex flex-col gap-1.5 w-full mt-1">
              <input type="range" className="w-[calc(100%-8px)] mx-auto accent-[#f23b27] h-1 bg-[#EBEBEB] rounded-lg appearance-none cursor-pointer border-none shadow-none focus:outline-none" min="6" max="24" step="1" value={rectSize} onChange={e => { setRectSize(parseInt(e.target.value)); setEmbedStyle("Custom Style"); }} />
              <div className="flex justify-between text-[10px] text-[#A6A6A6] font-bold uppercase tracking-wider mt-1 px-1">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-[calc(100%-8px)] mt-auto pt-4 pb-2">
          <button onClick={handleCopy} className="bg-[#f23b27] hover:bg-[#d83523] active:bg-[#bd2f1f] transition-colors text-white font-bold h-10 rounded-lg flex gap-2 items-center justify-center shadow-sm w-full">
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
            {copied ? "Copied!" : "Copy Embed Link"}
          </button>
          <button 
            onClick={() => {
              const params = new URLSearchParams();
              if (selectedFileKeys.length > 0) params.set("files", selectedFileKeys.join(","));
              if (stats?.myFigmaUserId) params.set("userId", stats.myFigmaUserId);
              params.set("style", embedStyle.split(" ")[0].toLowerCase());
              if (embedStyle === "Custom Style") {
                params.set("bg", activeBg.replace("#", ""));
                params.set("text", activeText.replace("#", ""));
                params.set("empty", activeEmpty.replace("#", ""));
                if (activeLevels.length === 4) params.set("levels", activeLevels.map(c => c.replace("#", "")).join("-"));
                params.set("radius", rectRadius.toString());
                params.set("size", rectSize.toString());
              }
              window.open(`${window.location.origin}/embed-widget?${params.toString()}`, "_blank");
            }}
            className="bg-white border border-[#f23b27] text-[#f23b27] hover:bg-[#fffaf4] transition-colors font-bold h-10 rounded-lg flex gap-2 items-center justify-center shadow-sm w-full"
          >
            <Telescope size={16} strokeWidth={2.5} /> Preview in Browser
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 min-w-0">
        <div className="bg-white flex flex-col items-start overflow-clip p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-full text-[#1A1A1A]">
          <div className="flex gap-3 items-center mb-6">
            <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
              <MonitorIcon />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-bold text-[20px] tracking-[-0.24px] leading-none">Embed Preview</h2>
              <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">View what your embed will appear as.</p>
            </div>
          </div>

          {/* Fake Widget Container */}
          <div
            className={`w-full rounded-2xl border border-transparent shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-4 relative transition-colors`}
            style={{ backgroundColor: activeBg }}
          >
            <div className="overflow-x-auto pb-2 custom-scrollbar">
              <Heatmap
                data={activity?.dailyTotals ?? {}}
                theme={embedStyle === 'GitHub Style' ? 'dark' : 'light'}
                customTheme={activeTheme}
                profileUrl="/profile"
              />
            </div>
          </div>
        </div>

        <div className="bg-white flex gap-4 items-start p-6 rounded-3xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-full border-l-[4px] border-l-[#1ABCFE]">
          <Info size={22} className="text-[#1ABCFE] shrink-0" strokeWidth={2.5} />
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-bold text-[#A6A6A6] uppercase tracking-wider leading-none mt-0.5">Pro Tip</p>
            <p className="text-[13px] text-[#1A1A1A] font-medium leading-snug">Changes are saved automatically and reflected across all your active embeds!</p>
          </div>
        </div>

        {/* File Selection Box */}
        <div className="bg-white flex flex-col gap-6 items-start overflow-clip p-6 rounded-4xl shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] shrink-0 w-full text-[#1A1A1A]">
          <div className="flex gap-3 items-center">
            <div className="size-10 flex items-center justify-center bg-[#F5F5F5] rounded-xl text-[#1A1A1A]">
              <LayersIcon />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-bold text-[20px] tracking-[-0.24px] leading-none">Select Files</h2>
              <p className="text-[12px] text-[#A6A6A6] tracking-[-0.12px] leading-none">Choose which files to display in your embed.</p>
            </div>
          </div>

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
              className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${selectedFileKeys.length === 0 ? 'bg-[#fffaf4] border border-[#f23b27]/20' : 'hover:bg-[#F5F5F5] border border-transparent'}`}
            >
              <div className={`size-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFileKeys.length === 0 ? 'bg-[#f23b27] border-[#f23b27]' : 'border-[#EBEBEB] bg-white'}`}>
                {selectedFileKeys.length === 0 && <Check size={8} color="white" strokeWidth={4} />}
              </div>
              <span className={`text-[11px] font-bold truncate ${selectedFileKeys.length === 0 ? 'text-[#1A1A1A]' : 'text-[#737373]'}`}>All Files Activity</span>
            </div>
            {files.map((file: any) => (
              <div 
                key={file.file_key}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors group ${selectedFileKeys.includes(file.file_key) ? 'bg-[#fffaf4] border border-[#f23b27]/20' : 'hover:bg-[#F5F5F5] border border-transparent'}`}
              >
                <div 
                  onClick={() => handleToggleFile(file.file_key)}
                  className="flex items-center gap-1.5 flex-1 cursor-pointer overflow-hidden"
                >
                  <div className={`size-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFileKeys.includes(file.file_key) ? 'bg-[#f23b27] border-[#f23b27]' : 'border-[#EBEBEB] bg-white'}`}>
                    {selectedFileKeys.includes(file.file_key) && <Check size={8} color="white" strokeWidth={4} />}
                  </div>
                  <div className="flex flex-col overflow-hidden leading-tight">
                    <span className={`text-[11px] font-bold truncate ${selectedFileKeys.includes(file.file_key) ? 'text-[#1A1A1A]' : 'text-[#737373]'}`}>{file.name}</span>
                    <span className="text-[9px] text-[#A6A6A6] truncate">{file.project_name}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const baseUrl = window.location.origin + "/embed-widget";
                    const params = new URLSearchParams();
                    params.set("files", file.file_key);
                    if (stats?.myFigmaUserId) params.set("userId", stats.myFigmaUserId);
                    params.set("style", embedStyle.split(" ")[0].toLowerCase());
                    if (embedStyle === "Custom Style") {
                      params.set("bg", activeBg.replace("#", ""));
                      params.set("text", activeText.replace("#", ""));
                      params.set("empty", activeEmpty.replace("#", ""));
                      if (activeLevels.length === 4) params.set("levels", activeLevels.map(c => c.replace("#", "")).join("-"));
                      params.set("radius", rectRadius.toString());
                      params.set("size", rectSize.toString());
                    }
                    navigator.clipboard.writeText(`${baseUrl}?${params.toString()}`);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition-all text-[#A6A6A6] hover:text-[#f23b27] shadow-sm border border-transparent hover:border-[#EBEBEB]"
                  title="Copy individual embed link"
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

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const LayersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
