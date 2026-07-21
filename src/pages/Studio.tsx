import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Heatmap from "../components/Heatmap";
import FileVolumeBreakdown from "../components/FileVolumeBreakdown";
import TopNav from "../components/TopNav";
import { Check, Telescope, Layers, ChevronDown, Grid3x3, Flame, Code, Palette, Ruler, Database } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { Button, SegmentedControl, Divider, Popover, SHELL, SHELL_TOP_PAD } from "../components/ui";
import { ColorPicker, StyleOption, SnippetRow, PublishForm, PublishControl } from "../components/embedControls";
import { useEmbedSettings } from "../useEmbedSettings";
import { useStreakSettings, STREAK_FONTS } from "../useStreakSettings";
import { useBreakdownSettings } from "../useBreakdownSettings";

const STYLES = [
  { label: "Fimanu", value: "Fimanu Style", previewTheme: "fimanu" },
  { label: "GitHub", value: "GitHub Style", previewTheme: "github" },
  { label: "Figma", value: "Figma Style", previewTheme: "figma" },
  { label: "Custom", value: "Custom Style", previewTheme: "custom" },
] as const;

// Widget the Studio stage is editing. A typed list so adding a mode is a
// one-line push plus a preview/dock branch.
type WidgetMode = "heatmap" | "streak" | "breakdown";
const WIDGETS: { id: WidgetMode; label: string; icon: React.ReactNode }[] = [
  { id: "heatmap", label: "Heatmap", icon: <Grid3x3 size={15} /> },
  { id: "streak", label: "Streak", icon: <Flame size={15} /> },
  { id: "breakdown", label: "Breakdown", icon: <Layers size={15} /> },
];

function DockSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1 shrink-0">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider whitespace-nowrap tabular-nums">
        {label} {format(value)}
      </span>
      <input
        type="range"
        aria-label={label}
        className="w-28 accent-accent h-1 bg-line rounded-lg appearance-none cursor-pointer border-none shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

function FilesPopover({
  files,
  selectedFileKeys,
  onToggle,
  onSelectAll,
}: {
  files: any[];
  selectedFileKeys: string[];
  onToggle: (key: string) => void;
  onSelectAll: () => void;
}) {
  const label =
    selectedFileKeys.length === 0
      ? "All files"
      : `${selectedFileKeys.length} file${selectedFileKeys.length === 1 ? "" : "s"}`;

  return (
    <Popover
      align="center"
      panelClassName="w-[280px] p-2"
      trigger={({ isOpen, toggle }) => (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={toggle}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-canvas border border-line text-[13px] font-bold text-body hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Layers size={15} />
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}
    >
      <div className="flex flex-col gap-1 w-full overflow-y-auto max-h-[320px] custom-scrollbar">
        <button
          type="button"
          role="checkbox"
          aria-checked={selectedFileKeys.length === 0}
          onClick={onSelectAll}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-left w-full ${selectedFileKeys.length === 0 ? "bg-canvas border border-accent/20" : "hover:bg-hairline border border-transparent"}`}
        >
          <div className={`size-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFileKeys.length === 0 ? "bg-accent border-accent" : "border-line bg-surface"}`}>
            {selectedFileKeys.length === 0 && <Check size={8} color="white" strokeWidth={4} />}
          </div>
          <span className={`text-[11px] font-bold truncate ${selectedFileKeys.length === 0 ? "text-ink" : "text-body"}`}>All Files Activity</span>
        </button>
        {files.map((file) => (
          <button
            key={file.file_key}
            type="button"
            role="checkbox"
            aria-checked={selectedFileKeys.includes(file.file_key)}
            onClick={() => onToggle(file.file_key)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-left w-full overflow-hidden ${selectedFileKeys.includes(file.file_key) ? "bg-canvas border border-accent/20" : "hover:bg-hairline border border-transparent"}`}
          >
            <div className={`size-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFileKeys.includes(file.file_key) ? "bg-accent border-accent" : "border-line bg-surface"}`}>
              {selectedFileKeys.includes(file.file_key) && <Check size={8} color="white" strokeWidth={4} />}
            </div>
            <div className="flex flex-col overflow-hidden leading-tight">
              <span className={`text-[11px] font-bold truncate ${selectedFileKeys.includes(file.file_key) ? "text-ink" : "text-body"}`}>{file.name}</span>
              <span className="text-[9px] text-muted truncate">{file.project_name}</span>
            </div>
          </button>
        ))}
      </div>
    </Popover>
  );
}

function DockToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-full"
    >
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider whitespace-nowrap">{label}</span>
      <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ease-out ${checked ? "bg-green" : "bg-muted/40"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform duration-200 ease-out ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

type DockTab = { id: string; label: string; icon: React.ReactNode; content: React.ReactNode };

// Bottom dock as a tab bar with a disclosure panel. Only one group of controls
// is open at a time so the dock stays one row tall at rest, and the primary
// actions stay pinned outside the tabs so Copy is never behind a closed panel.
function DockTabs({ tabs, actions }: { tabs: DockTab[]; actions: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(tabs[0]?.id ?? null);
  const railRef = useRef<HTMLDivElement>(null);

  // Tabs differ per widget; drop a selection that no longer exists. Keyed on the
  // id list so the callers can build `tabs` inline without re-running this.
  const tabIds = tabs.map((t) => t.id).join(",");
  useEffect(() => {
    const ids = tabIds.split(",");
    setOpenId((cur) => (cur && !ids.includes(cur) ? ids[0] ?? null : cur));
  }, [tabIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const active = tabs.find((t) => t.id === openId) ?? null;

  const onRailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === openId);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    setOpenId(next.id);
    railRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <div className="bg-surface rounded-3xl shadow-card border border-hairline">
      {active && (
        <div
          role="tabpanel"
          id={`dock-panel-${active.id}`}
          aria-labelledby={`dock-tab-${active.id}`}
          className="border-b border-hairline px-4 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
        >
          {active.content}
        </div>
      )}

      <div className="flex items-center gap-3 px-3 py-2">
        <div
          ref={railRef}
          role="tablist"
          aria-label="Editor sections"
          onKeyDown={onRailKeyDown}
          className="flex items-center gap-1"
        >
          {tabs.map((t) => {
            const isOpen = openId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                data-tab={t.id}
                id={`dock-tab-${t.id}`}
                aria-selected={isOpen}
                aria-controls={isOpen ? `dock-panel-${t.id}` : undefined}
                tabIndex={isOpen ? 0 : -1}
                onClick={() => setOpenId(isOpen ? null : t.id)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isOpen ? "bg-canvas text-ink ring-1 ring-accent/30" : "text-muted hover:text-ink"}`}
              >
                {t.icon}
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </div>

        <Divider />

        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

type Snippet = { key: string; label: string; value: string };

// One "Get code" popover for all three widgets. Unpublished, it hosts the
// publish form inline rather than sending the user to Settings — an embed can't
// render until the profile is public, so that's the only thing left to do here.
function CodePopover({
  published,
  note,
  snippets,
  copiedKey,
  copy,
}: {
  published: boolean;
  note: string;
  snippets: Snippet[];
  copiedKey: string | null;
  copy: (key: string, value: string) => void;
}) {
  return (
    <Popover
      panelClassName="w-[360px] max-w-[calc(100vw-2rem)] p-4"
      trigger={({ isOpen, toggle }) => (
        // Unpublished, Publish is the one thing to do — keep a single primary
        // button in the dock so the two don't compete.
        <Button variant={published ? "primary" : "secondary"} onClick={toggle} aria-expanded={isOpen} aria-haspopup="true">
          <Code size={16} strokeWidth={2.5} />
          Get code
        </Button>
      )}
    >
      {({ close }) =>
        !published ? (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] leading-snug text-muted">
              Pick a handle to publish your profile — that's what the embed reads from.
            </p>
            <PublishForm onPublished={close} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] leading-snug text-muted">{note}</p>
            {snippets.map((s) => (
              <SnippetRow
                key={s.key}
                label={s.label}
                value={s.value}
                copied={copiedKey === s.key}
                onCopy={() => copy(s.key, s.value)}
              />
            ))}
            <span className="sr-only" role="status" aria-live="polite">
              {copiedKey ? "Copied to clipboard" : ""}
            </span>
          </div>
        )
      }
    </Popover>
  );
}

// Publish · Get code · Preview — identical across the three docks, so the only
// per-widget inputs are the snippets and the URL the telescope opens.
function DockActions({
  published,
  note,
  snippets,
  copiedKey,
  copy,
  previewUrl,
}: {
  published: boolean;
  note: string;
  snippets: Snippet[];
  copiedKey: string | null;
  copy: (key: string, value: string) => void;
  previewUrl: string;
}) {
  return (
    <>
      <PublishControl />
      <CodePopover published={published} note={note} snippets={snippets} copiedKey={copiedKey} copy={copy} />
      <Button
        variant="secondary"
        aria-label="Preview in browser"
        disabled={!published || !previewUrl}
        onClick={() => previewUrl && window.open(previewUrl, "_blank")}
      >
        <Telescope size={16} strokeWidth={2.5} />
      </Button>
    </>
  );
}

function StreakDock({ streak }: { streak: ReturnType<typeof useStreakSettings> }) {
  const fontDisabled = streak.output === "image";
  return (
    <DockTabs
      actions={
        <DockActions
          published={streak.published}
          previewUrl={streak.output === "image" ? streak.badgeUrl : streak.iframeUrl}
          copiedKey={streak.copiedKey}
          copy={streak.copy}
          note={
            streak.output === "image"
              ? "Portable SVG — renders in READMEs, Notion and markdown."
              : "For websites — the only output that honors the font choice."
          }
          snippets={
            streak.output === "image"
              ? [
                  { key: "html", label: "HTML", value: streak.imgHtml },
                  { key: "md", label: "Markdown", value: streak.imgMd },
                ]
              : [{ key: "iframe", label: "iframe", value: streak.iframeCode }]
          }
        />
      }
      tabs={[
        {
          id: "content",
          label: "Content",
          icon: <Database size={15} />,
          content: (
            <>
              <SegmentedControl
                ariaLabel="Badge metric"
                size="sm"
                value={streak.metric}
                onChange={streak.setMetric}
                options={[
                  { label: "Streak", value: "streak" },
                  { label: "Edits", value: "edits" },
                ]}
              />
              <Divider />
              <SegmentedControl
                ariaLabel="Output format"
                size="sm"
                value={streak.output}
                onChange={streak.setOutput}
                options={[
                  { label: "Image", value: "image" },
                  { label: "Website", value: "iframe" },
                ]}
              />
              <Divider />
              <DockToggle label="Emoji" checked={streak.emoji} onChange={() => streak.setEmoji((v) => !v)} />
            </>
          ),
        },
        {
          id: "style",
          label: "Style",
          icon: <Palette size={15} />,
          content: (
            <>
              <SegmentedControl
                ariaLabel="Badge theme"
                size="sm"
                value={streak.theme}
                onChange={streak.setTheme}
                options={[
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                ]}
              />
              <Divider />
              <div className="flex items-center gap-2">
                <ColorPicker title="Background" color={streak.colors.bg} onChange={(c) => streak.setColor("bg", c)} />
                <ColorPicker title="Text / number" color={streak.colors.text} onChange={(c) => streak.setColor("text", c)} contrastAgainst={streak.colors.bg} />
                <ColorPicker title="Label" color={streak.colors.muted} onChange={(c) => streak.setColor("muted", c)} contrastAgainst={streak.colors.bg} />
                <ColorPicker title="Accent / flame" color={streak.colors.accent} onChange={(c) => streak.setColor("accent", c)} contrastAgainst={streak.colors.bg} />
                <ColorPicker title="Border" color={streak.colors.border} onChange={(c) => streak.setColor("border", c)} />
              </div>
              <Divider />
              {/* Font only reaches the iframe renderer — the SVG image is fixed to
                  Urbanist — so it's disabled while the Image snippets are selected. */}
              <label className="flex flex-col gap-1 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${fontDisabled ? "text-muted/50" : "text-muted"}`}>
                  Font {fontDisabled ? "(website only)" : ""}
                </span>
                <select
                  aria-label="Badge font (website output only)"
                  disabled={fontDisabled}
                  value={streak.font}
                  onChange={(e) => streak.setFont(e.target.value as typeof streak.font)}
                  className="h-9 px-2.5 rounded-lg bg-canvas border border-line text-[13px] font-bold text-body disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {STREAK_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </label>
              <Divider />
              <DockSlider label="Radius" value={streak.radius} min={0} max={24} step={1} onChange={streak.setRadius} format={(v) => `${v}px`} />
            </>
          ),
        },
      ]}
    />
  );
}

function BreakdownDock({ breakdown }: { breakdown: ReturnType<typeof useBreakdownSettings> }) {
  return (
    <DockTabs
      actions={
        <DockActions
          published={breakdown.published}
          previewUrl={breakdown.url}
          copiedKey={breakdown.copiedKey}
          copy={breakdown.copy}
          note="Drop into any website — the file breakdown renders in an iframe."
          snippets={[{ key: "iframe", label: "iframe", value: breakdown.iframeCode }]}
        />
      }
      tabs={[
        {
          id: "data",
          label: "Data",
          icon: <Database size={15} />,
          content: (
            <SegmentedControl
              ariaLabel="Date range"
              size="sm"
              value={breakdown.days}
              onChange={breakdown.setDays}
              options={breakdown.ranges}
            />
          ),
        },
        {
          id: "style",
          label: "Style",
          icon: <Palette size={15} />,
          content: (
            <>
              <ColorPicker title="Background" color={breakdown.bg} onChange={breakdown.setBg} />
              <ColorPicker title="Text / label" color={breakdown.text} onChange={breakdown.setText} contrastAgainst={breakdown.bg} />
              <Divider />
              <DockSlider label="Radius" value={breakdown.radius} min={0} max={24} step={1} onChange={breakdown.setRadius} format={(v) => `${v}px`} />
            </>
          ),
        },
      ]}
    />
  );
}

export default function Studio() {
  const { activity, loading, files, selectedFileKeys, setSelectedFileKeys, setFilterMine } = useFigmaData();

  // Studio shows all edits (not just mine) so file selection works for any file.
  useEffect(() => {
    setFilterMine(false);
  }, [setFilterMine]);

  const {
    published,
    embedStyle,
    setEmbedStyle,
    rectSize,
    rectRadius,
    transparentBg,
    setTransparentBg,
    activeLevels,
    activeEmpty,
    activeBg,
    activeText,
    activeTheme,
    accentColor,
    bgColor,
    setAccent,
    setLevelColor,
    setEmptyColor,
    setBgColor,
    setTextColor,
    setSize,
    setRadius,
    handleToggleFile,
    handleSelectAllFiles,
    widgetUrl,
    iframeCode,
    copiedKey,
    copy,
  } = useEmbedSettings({ selectedFileKeys, setSelectedFileKeys });

  const [widgetMode, setWidgetMode] = useState<WidgetMode>("heatmap");
  const [previewWidth, setPreviewWidth] = useState(100);
  const streak = useStreakSettings();
  const breakdown = useBreakdownSettings();

  // Live breakdown preview off the user's own authed data, trimmed to the
  // selected range client-side so it reacts without refetching.
  const previewActivity = useMemo(() => {
    if (!activity) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (breakdown.days - 1));
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return { ...activity, rows: (activity.rows ?? []).filter((r) => r.activity_date >= cutoffStr) };
  }, [activity, breakdown.days]);

  const checkerboard = useCallback(
    (): React.CSSProperties => ({
      backgroundColor: "#fff",
      backgroundImage:
        "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)",
      backgroundSize: "16px 16px",
      backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
    }),
    []
  );

  if (loading && !activity) {
    return (
      <div aria-busy="true" className="bg-canvas flex flex-col items-center justify-center min-h-dvh w-full">
        <TopNav />
        <div className={`bg-surface rounded-4xl shadow-card h-[220px] animate-pulse motion-reduce:animate-none ${SHELL}`} />
        <span className="sr-only" role="status" aria-live="polite">Loading studio…</span>
      </div>
    );
  }

  return (
    <div className="bg-canvas flex flex-col min-h-dvh w-full">
      <TopNav />

      {/* Sub-nav: sits in the same slot as the Files view switcher. Swaps both
          the centered preview and the dock controls. Preview width lives here
          rather than in a dock tab — it scales the stage, not the embed. */}
      <div className={`${SHELL} ${SHELL_TOP_PAD} shrink-0 flex items-center justify-between gap-4 flex-wrap`}>
        <div role="radiogroup" aria-label="Widget" className="flex items-center gap-1 p-1 rounded-full bg-surface border border-hairline shadow-card w-fit">
          {WIDGETS.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={widgetMode === w.id}
              onClick={() => setWidgetMode(w.id)}
              className={`flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${widgetMode === w.id ? "bg-canvas text-ink ring-1 ring-accent/30" : "text-muted hover:text-ink"}`}
            >
              {w.icon}
              <span>{w.label}</span>
            </button>
          ))}
        </div>

        <DockSlider
          label="Preview"
          value={previewWidth}
          min={25}
          max={100}
          step={1}
          onChange={setPreviewWidth}
          format={(v) => `${v}%`}
        />
      </div>

      {/* Stage: the active widget centered on the canvas, clear of the dock. */}
      <div className={`flex-1 flex items-center justify-center pt-6 pb-40 ${SHELL}`}>
        {/* Outer hugs the widget's natural width (percentage widths don't feed
            intrinsic sizing), so the slider scales relative to that hug. */}
        <div className="w-fit max-w-full mx-auto">
          <div className="transition-[width] duration-150" style={{ width: `${previewWidth}%` }}>
            {widgetMode === "heatmap" ? (
              <div
                className="w-full rounded-2xl border border-transparent shadow-card p-5 flex flex-col gap-4 transition-colors"
                style={transparentBg ? checkerboard() : { backgroundColor: activeBg }}
              >
                <Heatmap
                  data={activity?.dailyTotals ?? {}}
                  theme={embedStyle === "GitHub Style" ? "dark" : "light"}
                  customTheme={activeTheme}
                />
              </div>
            ) : widgetMode === "breakdown" ? (
              <div
                className="w-full rounded-2xl border border-transparent shadow-card p-4 flex flex-col transition-colors"
                style={{ backgroundColor: breakdown.bg, height: 320 }}
              >
                <FileVolumeBreakdown
                  activity={previewActivity}
                  files={files}
                  embedded
                  cardRadius={breakdown.radius}
                  textColor={breakdown.text}
                />
              </div>
            ) : (
              <div
                className="w-full rounded-2xl border border-transparent shadow-card px-12 py-10 flex items-center justify-center transition-colors"
                style={{ backgroundColor: streak.preset.host }}
              >
                {!streak.published ? (
                  <p className="text-[12px] text-muted max-w-[280px] text-center leading-snug">
                    Publish your profile to preview your streak badge.
                  </p>
                ) : streak.output === "iframe" ? (
                  /* The website output renders through the real embed route, so
                     the font choice previews the way a visitor would see it. */
                  <iframe
                    key={streak.iframeUrl}
                    src={streak.iframeUrl}
                    title="Streak badge preview"
                    scrolling="no"
                    className="w-full h-11 border-none overflow-hidden"
                  />
                ) : (
                  <img key={streak.badgeUrl} src={streak.badgeUrl} alt={`${streak.alt} badge preview`} className="h-7" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating bottom dock: tabbed groups + pinned primary actions. */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-max max-w-[calc(100%-3rem)] flex flex-col items-center gap-2">
        {widgetMode === "streak" ? (
          <StreakDock streak={streak} />
        ) : widgetMode === "breakdown" ? (
          <BreakdownDock breakdown={breakdown} />
        ) : (
        <DockTabs
          actions={
            <DockActions
              published={published}
              previewUrl={widgetUrl}
              copiedKey={copiedKey}
              copy={copy}
              note="Link it anywhere, or drop the iframe into any website."
              snippets={[
                { key: "link", label: "Link", value: widgetUrl },
                { key: "iframe", label: "iframe", value: iframeCode },
              ]}
            />
          }
          tabs={[
            {
              id: "data",
              label: "Data",
              icon: <Database size={15} />,
              content: (
                <FilesPopover
                  files={files}
                  selectedFileKeys={selectedFileKeys}
                  onToggle={handleToggleFile}
                  onSelectAll={handleSelectAllFiles}
                />
              ),
            },
            {
              id: "style",
              label: "Style",
              icon: <Palette size={15} />,
              content: (
                <>
                  <div role="radiogroup" aria-label="Embed style" className="flex items-center gap-1">
                    {STYLES.map((s) => (
                      <StyleOption
                        key={s.value}
                        compact
                        active={embedStyle === s.value}
                        label={s.label}
                        previewTheme={s.previewTheme}
                        onClick={() => setEmbedStyle(s.value)}
                      />
                    ))}
                  </div>
                  <Divider />
                  <label className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider whitespace-nowrap">Accent</span>
                    <ColorPicker title="Accent color (generates the ramp)" color={accentColor} onChange={setAccent} />
                  </label>
                  <Divider />
                  <div className="flex items-center gap-2">
                    {[3, 2, 1, 0].map((i) => (
                      <ColorPicker
                        key={i}
                        title={`Level ${i + 1} color`}
                        color={activeLevels[i]}
                        onChange={(c) => setLevelColor(i, c)}
                        contrastAgainst={activeBg === "transparent" ? undefined : activeBg}
                      />
                    ))}
                    <ColorPicker title="Zero activity color" color={activeEmpty} onChange={setEmptyColor} />
                  </div>
                  <Divider />
                  <div className="flex items-center gap-2">
                    <ColorPicker title="Card background" color={bgColor} onChange={setBgColor} />
                    <ColorPicker title="Label text" color={activeText} onChange={setTextColor} contrastAgainst={activeBg === "transparent" ? undefined : activeBg} />
                  </div>
                  <Divider />
                  <DockToggle label="Transparent" checked={transparentBg} onChange={() => setTransparentBg((v) => !v)} />
                </>
              ),
            },
            {
              id: "layout",
              label: "Layout",
              icon: <Ruler size={15} />,
              content: (
                <>
                  <DockSlider label="Size" value={rectSize} min={6} max={24} step={1} onChange={setSize} format={(v) => `${v}px`} />
                  <DockSlider label="Radius" value={rectRadius} min={0} max={rectSize / 2} step={0.5} onChange={setRadius} format={(v) => `${v.toFixed(1)}px`} />
                </>
              ),
            },
          ]}
        />
        )}
      </div>
    </div>
  );
}
