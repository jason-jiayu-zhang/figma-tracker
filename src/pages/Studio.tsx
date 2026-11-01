import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import posthog from "posthog-js";
import Heatmap from "../components/Heatmap";
import FileVolumeBreakdown from "../components/FileVolumeBreakdown";
import { Link } from "react-router";
import imgFimanuLogoFull from "../assets/fimanu-logo-full.svg";
import TopNav, { PrimaryNav, AccountNav } from "../components/TopNav";
import { Check, Telescope, Layers, ChevronDown, Grid3x3, Flame, Code, Palette, Ruler, Database } from "lucide-react";
import { useFigmaData } from "../useFigmaData";
import { Button, SegmentedControl, Popover, SHELL } from "../components/ui";
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

// Widget the Studio canvas is editing. A typed list so adding a mode is a
// one-line push plus a preview/controls branch.
type WidgetMode = "heatmap" | "streak" | "breakdown";
const WIDGETS: { id: WidgetMode; label: string; icon: React.ReactNode }[] = [
  { id: "heatmap", label: "Heatmap", icon: <Grid3x3 size={15} /> },
  { id: "streak", label: "Streak", icon: <Flame size={15} /> },
  { id: "breakdown", label: "Breakdown", icon: <Layers size={15} /> },
];

function SliderField({
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
    <label className="flex flex-col gap-1.5 w-full">
      <span className="text-[11px] font-bold text-muted uppercase tracking-wider whitespace-nowrap tabular-nums">
        {label} {format(value)}
      </span>
      <input
        type="range"
        aria-label={label}
        className="w-full accent-accent h-1 bg-line rounded-lg appearance-none cursor-pointer border-none shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
      align="left"
      placement="below"
      className="w-full"
      panelClassName="w-full p-2"
      trigger={({ isOpen, toggle }) => (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={toggle}
          className="flex items-center gap-1.5 h-9 px-3 w-full rounded-lg bg-canvas border border-line text-[13px] font-bold text-body hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Layers size={15} />
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown size={14} className={`ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
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

function ToggleField({
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
      className="flex items-center justify-between gap-2 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-full"
    >
      <span className="text-[11px] font-bold text-muted uppercase tracking-wider whitespace-nowrap">{label}</span>
      <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ease-out ${checked ? "bg-green" : "bg-muted/40"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform duration-200 ease-out ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

type SidebarSection = { id: string; label: string; icon: React.ReactNode; content: React.ReactNode };

// What each widget contributes to the Studio chrome: publish/share actions for
// the header bar, and grouped controls for the sidebar.
type StudioControls = { actions: React.ReactNode; sections: SidebarSection[] };

// Labeled group inside a section so related controls read as one unit.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}

// Sidebar controls. Every section is visible at once, so nothing is hidden
// behind a tab and the canvas never has to dodge a floating panel.
function SidebarControls({ sections }: { sections: SidebarSection[] }) {
  return (
    <div
      role="group"
      aria-label="Widget settings"
      // Below lg the controls are the last thing on the page, so give them room to
      // breathe (plus the iOS home-indicator inset) instead of ending flush at the edge.
      className="bg-surface border-t border-hairline max-lg:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:border-t-0 lg:border-r lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto custom-scrollbar"
    >
      {sections.map((sec) => (
        <section
          key={sec.id}
          aria-labelledby={`sidebar-${sec.id}`}
          className="flex flex-col gap-3.5 px-4 py-4 border-b border-hairline last:border-b-0 lg:px-5"
        >
          <h2 id={`sidebar-${sec.id}`} className="flex items-center gap-1.5 text-[13px] font-extrabold text-accent">
            {sec.icon}
            {sec.label}
          </h2>
          {sec.content}
        </section>
      ))}
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
      placement="below"
      panelClassName="w-[360px] max-w-[calc(100vw-2rem)] p-4"
      trigger={({ isOpen, toggle }) => (
        // Unpublished, Publish is the one thing to do — keep a single primary
        // button in the header so the two don't compete.
        <Button variant={published ? "primary" : "secondary"} size="pill" onClick={toggle} aria-expanded={isOpen} aria-haspopup="true">
          <Code size={15} strokeWidth={2.5} />
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

// Publish · Get code · Preview — identical for all three widgets, so the only
// per-widget inputs are the snippets and the URL the telescope opens.
function HeaderActions({
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
      {/* A quiet icon, same treatment as the settings icon beside it — Get code is
          the one filled action in the header. */}
      <button
        type="button"
        title="Preview in browser"
        aria-label="Preview in browser"
        disabled={!published || !previewUrl}
        onClick={() => previewUrl && window.open(previewUrl, "_blank")}
        className="flex items-center justify-center size-8 shrink-0 rounded-full text-muted transition-colors hover:text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Telescope size={16} />
      </button>
    </>
  );
}

function streakControls(streak: ReturnType<typeof useStreakSettings>): StudioControls {
  const fontDisabled = streak.output === "image";
  return {
    actions: (
      <HeaderActions
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
            : [
                { key: "link", label: "Link", value: streak.iframeUrl },
                { key: "iframe", label: "iframe", value: streak.iframeCode },
              ]
        }
      />
    ),
    sections: [
      {
        id: "data",
        label: "Data",
        icon: <Database size={15} />,
        content: (
          <>
            <Field label="Metric">
              <SegmentedControl fill
                ariaLabel="Badge metric"
                size="sm"
                value={streak.metric}
                onChange={streak.setMetric}
                options={[
                  { label: "Streak", value: "streak" },
                  { label: "Edits", value: "edits" },
                ]}
              />
            </Field>
            <Field label="Output">
              <SegmentedControl fill
                ariaLabel="Output format"
                size="sm"
                value={streak.output}
                onChange={streak.setOutput}
                options={[
                  { label: "Image", value: "image" },
                  { label: "Website", value: "iframe" },
                ]}
              />
            </Field>
          </>
        ),
      },
      {
        id: "style",
        label: "Style",
        icon: <Palette size={15} />,
        content: (
          <>
            <Field label="Theme">
              <SegmentedControl fill
                ariaLabel="Badge theme"
                size="sm"
                value={streak.theme}
                onChange={streak.setTheme}
                options={[
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                ]}
              />
            </Field>
            <Field label="Colors">
              <div className="flex items-center gap-2">
                <ColorPicker title="Background" color={streak.colors.bg} onChange={(c) => streak.setColor("bg", c)} />
                <ColorPicker title="Text / number" color={streak.colors.text} onChange={(c) => streak.setColor("text", c)} contrastAgainst={streak.colors.bg} />
                <ColorPicker title="Label" color={streak.colors.muted} onChange={(c) => streak.setColor("muted", c)} contrastAgainst={streak.colors.bg} />
                <ColorPicker title="Accent / flame" color={streak.colors.accent} onChange={(c) => streak.setColor("accent", c)} contrastAgainst={streak.colors.bg} disabled={streak.emoji} />
                <ColorPicker title="Border" color={streak.colors.border} onChange={(c) => streak.setColor("border", c)} />
              </div>
            </Field>
            {/* Font only reaches the iframe renderer — the SVG image is fixed to
                Urbanist — so it's disabled while the Image snippets are selected. */}
            <label className="flex flex-col gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${fontDisabled ? "text-muted/50" : "text-muted"}`}>
                Font {fontDisabled ? "(website only)" : ""}
              </span>
              <select
                aria-label="Badge font (website output only)"
                disabled={fontDisabled}
                value={streak.font}
                onChange={(e) => streak.setFont(e.target.value as typeof streak.font)}
                className="h-9 px-2.5 w-full rounded-lg bg-canvas border border-line text-[13px] font-bold text-body disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {STREAK_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            <ToggleField label="Emoji" checked={streak.emoji} onChange={() => streak.setEmoji((v) => !v)} />
          </>
        ),
      },
      {
        id: "layout",
        label: "Layout",
        icon: <Ruler size={15} />,
        content: <SliderField label="Radius" value={streak.radius} min={0} max={14} step={1} onChange={streak.setRadius} format={(v) => `${v}px`} />,
      },
    ],
  };
}

function breakdownControls(breakdown: ReturnType<typeof useBreakdownSettings>): StudioControls {
  return {
    actions: (
      <HeaderActions
        published={breakdown.published}
        previewUrl={breakdown.url}
        copiedKey={breakdown.copiedKey}
        copy={breakdown.copy}
        note="Drop into any website — the file breakdown renders in an iframe."
        snippets={[
          { key: "link", label: "Link", value: breakdown.url },
          { key: "iframe", label: "iframe", value: breakdown.iframeCode },
        ]}
      />
    ),
    sections: [
      {
        id: "data",
        label: "Data",
        icon: <Database size={15} />,
        content: (
          <Field label="Date range">
            <SegmentedControl fill
              ariaLabel="Date range"
              size="sm"
              value={breakdown.days}
              onChange={breakdown.setDays}
              options={breakdown.ranges}
            />
          </Field>
        ),
      },
      {
        id: "style",
        label: "Style",
        icon: <Palette size={15} />,
        content: (
          <>
            <Field label="Preset">
              <div role="radiogroup" aria-label="Embed style" className="grid grid-cols-2 gap-1">
                {STYLES.map((s) => (
                  <StyleOption
                    key={s.value}
                    compact
                    active={breakdown.embedStyle === s.value}
                    label={s.label}
                    previewTheme={s.previewTheme}
                    onClick={() => breakdown.setEmbedStyle(s.value)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Cards">
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <ColorPicker
                    key={i}
                    title={i === 3 ? "Other Files color" : `Card ${i + 1} color`}
                    color={breakdown.activeCards[i] ?? "#6b7280"}
                    onChange={(c) => breakdown.setCardColor(i, c)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Canvas">
              <div className="flex items-center gap-2">
                <ColorPicker title="Background" color={breakdown.bgColor} onChange={breakdown.setBgColor} />
                <ColorPicker title="Text / label" color={breakdown.activeText} onChange={breakdown.setTextColor} contrastAgainst={breakdown.activeBg === "transparent" ? undefined : breakdown.activeBg} />
              </div>
            </Field>
            <ToggleField label="Transparent" checked={breakdown.transparentBg} onChange={() => breakdown.setTransparentBg((v) => !v)} />
          </>
        ),
      },
      {
        id: "layout",
        label: "Layout",
        icon: <Ruler size={15} />,
        content: <SliderField label="Radius" value={breakdown.radius} min={0} max={24} step={1} onChange={breakdown.setRadius} format={(v) => `${v}px`} />,
      },
    ],
  };
}

export default function Studio() {
  const { activity, loading, files, selectedFileKeys, setSelectedFileKeys, setFilterMine, days, setDays } = useFigmaData();

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
  } = useEmbedSettings({ selectedFileKeys, setSelectedFileKeys, days, setDays });

  const [widgetMode, setWidgetMode] = useState<WidgetMode>("heatmap");
  const [previewWidth, setPreviewWidth] = useState(100);
  const handlePreviewWidthChange = useCallback((v: number) => {
    posthog.capture('studio_change_preview_scale', { value: v });
    setPreviewWidth(v);
  }, []);
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
        <div className={`bg-surface rounded-card border border-line shadow-card h-[220px] animate-pulse motion-reduce:animate-none ${SHELL}`} />
        <span className="sr-only" role="status" aria-live="polite">Loading studio…</span>
      </div>
    );
  }

  const heatmapControls: StudioControls = {
    actions: (
      <HeaderActions
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
    ),
    sections: [
      {
        id: "data",
        label: "Data",
        icon: <Database size={15} />,
        content: (
          <>
            <Field label="Files">
              <FilesPopover
                files={files}
                selectedFileKeys={selectedFileKeys}
                onToggle={handleToggleFile}
                onSelectAll={handleSelectAllFiles}
              />
            </Field>
          </>
        ),
      },
      {
        id: "style",
        label: "Style",
        icon: <Palette size={15} />,
        content: (
          <>
            <Field label="Preset">
              <div role="radiogroup" aria-label="Embed style" className="grid grid-cols-2 gap-1">
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
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Accent">
                <ColorPicker title="Accent color (generates the ramp)" color={accentColor} onChange={setAccent} />
              </Field>
              <Field label="Card">
                <div className="flex items-center gap-2">
                  <ColorPicker title="Card background" color={bgColor} onChange={setBgColor} />
                  <ColorPicker title="Label text" color={activeText} onChange={setTextColor} contrastAgainst={activeBg === "transparent" ? undefined : activeBg} />
                </div>
              </Field>
            </div>
            <Field label="Intensity ramp">
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
            </Field>
            <ToggleField label="Transparent" checked={transparentBg} onChange={() => setTransparentBg((v) => !v)} />
          </>
        ),
      },
      {
        id: "layout",
        label: "Layout",
        icon: <Ruler size={15} />,
        content: (
          <div className="grid grid-cols-2 gap-4">
            <SliderField label="Size" value={rectSize} min={6} max={24} step={1} onChange={setSize} format={(v) => `${v}px`} />
            <SliderField label="Radius" value={rectRadius} min={0} max={rectSize / 2} step={0.5} onChange={setRadius} format={(v) => `${v.toFixed(1)}px`} />
          </div>
        ),
      },
    ],
  };

  const controls =
    widgetMode === "streak" ? streakControls(streak) : widgetMode === "breakdown" ? breakdownControls(breakdown) : heatmapControls;
  // Preview width is a Layout concern, so it rides along in that section.
  const sections: SidebarSection[] = controls.sections.map((sec) =>
    sec.id === "layout"
      ? {
          ...sec,
          content: (
            <>
              {sec.content}
              <SliderField label="Preview width" value={previewWidth} min={25} max={100} step={1} onChange={handlePreviewWidthChange} format={(v) => `${v}%`} />
            </>
          ),
        }
      : sec
  );

  return (
    <div className="bg-canvas min-h-dvh lg:h-dvh w-full flex flex-col">
      {/* Full-width header bar: brand + app nav on the left, this widget's
          publish/share actions and the account on the right. */}
      {/* Full-width header bar. A flat list of items reordered per breakpoint with
          `order-*`. Desktop is a flex row: logo · nav ········ actions | account.
          Below lg it's a 2-column grid: logo and account share the top row, then nav
          and actions share the second (wrapping only if the screen is too narrow).
          That row is `lg:contents`, so on desktop its children join the flex row
          directly and take their own order. Gutters are 16px on phones, 20px from lg. */}
      <header className="shrink-0 bg-surface border-b border-hairline px-4 py-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 lg:flex lg:flex-wrap lg:px-5 lg:py-4">
        <Link to="/studio" aria-label="Fimanu" className="order-1 justify-self-start shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <img src={imgFimanuLogoFull} alt="Fimanu" className="h-7 w-auto" />
        </Link>
        <div className="order-2 lg:order-5">
          <AccountNav bare />
        </div>
        <div className="order-3 col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 lg:contents">
          <div className="lg:order-2 lg:ml-1">
            <PrimaryNav bare />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 lg:order-3 lg:ml-auto">{controls.actions}</div>
        </div>
        <div className="hidden lg:block order-4 w-px h-5 bg-line" aria-hidden="true" />
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
      {/* Sidebar, top: widget switcher. Everything in the sidebar shares one px-5
          inset. On small screens the DOM order (switcher → canvas → controls) keeps
          the preview next to the switcher. */}
      <div className="px-4 py-3 bg-surface border-b border-hairline lg:px-5 lg:py-4 lg:border-r lg:col-start-1 lg:row-start-1">
        <div role="radiogroup" aria-label="Widget" className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-canvas">
          {WIDGETS.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={widgetMode === w.id}
              onClick={() => {
                posthog.capture('studio_select_widget', { widget: w.id });
                setWidgetMode(w.id);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-0 px-1 py-2.5 rounded-xl text-[12px] leading-none font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${widgetMode === w.id ? "bg-surface text-ink ring-1 ring-accent/30 shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {w.icon}
              <span className="max-w-full truncate">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas: the preview. */}
      <main className="flex flex-col min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:min-h-0">
        {/* p-6 leaves room for the card shadow inside the scroll container; my-auto
            centers short previews but lets tall ones scroll from the top. */}
        <div className="flex-1 min-h-0 flex justify-center p-4 lg:p-6 lg:overflow-y-auto">
          {/* Outer hugs the widget's natural width (percentage widths don't feed
              intrinsic sizing), so the slider scales relative to that hug. */}
          <div className="w-fit max-w-full my-auto">
            {/* The heatmap legend (scale + credit) needs ~400px on one row; below
                that the slider stops shrinking the card so the footer isn't clipped. */}
            <div
              className={`transition-[width] duration-150 ${widgetMode === "heatmap" ? "sm:min-w-[400px]" : ""}`}
              style={{ width: `${previewWidth}%` }}
            >
              {widgetMode === "heatmap" ? (
                <div
                  className="w-full rounded-2xl border border-transparent shadow-card p-5 flex flex-col gap-4 transition-colors"
                  style={transparentBg ? checkerboard() : { backgroundColor: activeBg }}
                >
                  <Heatmap
                    data={activity?.dailyTotals ?? {}}
                    theme={embedStyle === "GitHub Style" ? "dark" : "light"}
                    customTheme={activeTheme}
                    days={days}
                  />
                </div>
              ) : widgetMode === "breakdown" ? (
                <div
                  className="w-full rounded-2xl border border-transparent shadow-card p-4 flex flex-col transition-colors"
                  style={breakdown.transparentBg ? { ...checkerboard(), height: 320 } : { backgroundColor: breakdown.activeBg, height: 320 }}
                >
                  <FileVolumeBreakdown
                    activity={previewActivity}
                    files={files}
                    embedded
                    cardRadius={breakdown.radius}
                    textColor={breakdown.activeText}
                    cardColors={breakdown.activeCards}
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
      </main>

      {/* Sidebar, body: the widget's controls, scrolling on their own. */}
      <SidebarControls sections={sections} />
      </div>
    </div>
  );
}
