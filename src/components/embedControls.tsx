import React, { useState, useEffect, useId, useRef, useCallback } from "react";
import posthog from "posthog-js";
import axios from "axios";
import { Copy, Check, Pipette, Globe } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import {
  normalizeHex,
  contrastRatio,
  contrastGrade,
  pickScreenColor,
  EYEDROPPER_SUPPORTED,
} from "../colorUtils";
import { useSession } from "../session";
import { Button, Popover } from "./ui";

export function getPreviewColor(theme: string, level: number) {
  if (theme === 'github') return ['bg-[#151b23]', 'bg-[#0e4429]', 'bg-[#196c2e]', 'bg-[#2da042]', 'bg-[#56d364]'][level - 1];
  if (theme === 'fimanu') return ['bg-[#f3ebe4]', 'bg-[#ffe0cc]', 'bg-[#fdaf7a]', 'bg-[#f8722f]', 'bg-[#d1330f]'][level - 1];
  if (theme === 'figma') return ['bg-[#d9d9d9]', 'bg-[#0acf83]', 'bg-[#1abcfe]', 'bg-[#a259ff]', 'bg-[#f24e1e]'][level - 1];
  return ['bg-[#f3ebe4]', 'bg-[#ffe0cc]', 'bg-[#fdaf7a]', 'bg-[#f8722f]', 'bg-[#d1330f]'][level - 1];
}

export const StyleOption = ({
  active,
  label,
  previewTheme,
  onClick,
  compact = false,
}: {
  active: boolean;
  label: string;
  previewTheme: string;
  onClick: () => void;
  compact?: boolean;
}) => {
  if (compact) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={onClick}
        className={`flex gap-2 items-center shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none ${active ? 'bg-canvas ring-2 ring-accent/40' : 'hover:bg-hairline'}`}
      >
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`rounded-[2px] size-2.5 ${getPreviewColor(previewTheme, i)}`} />
          ))}
        </div>
        <span className={`font-sans text-[12px] tracking-[-0.12px] whitespace-nowrap transition-colors ${active ? 'font-bold text-ink' : 'font-normal text-body'}`}>
          {label}
        </span>
      </button>
    );
  }
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick} className="flex flex-col gap-2 items-start justify-center text-left cursor-pointer rounded-lg transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:animate-none" style={{ width: '140px' }}>
      <div className="flex gap-2 items-center shrink-0">
        <div className={`h-4 w-4 rounded-[3.2px] shadow-sm flex items-center justify-center ${active ? 'bg-ink' : 'bg-canvas border border-line'}`}>
          {active && <Check size={10} color="white" strokeWidth={3} />}
        </div>
        <p className={`font-sans text-[12px] tracking-[-0.12px] whitespace-nowrap transition-colors ${active ? 'font-bold text-ink' : 'font-normal text-body'}`}>
          {label}
        </p>
      </div>
      <div className={`${previewTheme === 'github' ? 'bg-[#0d1116]' : 'bg-surface border border-line'} flex items-center justify-center px-2 py-1.5 rounded-lg shadow-sm w-full transition-shadow ${active ? 'ring-2 ring-accent/40' : ''}`}>
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
    </button>
  );
};

// Recent swatches are shared across every picker in the Studio (all three
// widget docks), so brand colors carry over between widgets and sessions.
const SWATCH_KEY = "fimanu.recentSwatches";
const swatchListeners = new Set<() => void>();
let recentSwatches: string[] = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SWATCH_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
})();

function rememberSwatch(hex: string) {
  const next = [hex, ...recentSwatches.filter((c) => c !== hex)].slice(0, 8);
  recentSwatches = next;
  try {
    localStorage.setItem(SWATCH_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota — swatches just don't persist
  }
  swatchListeners.forEach((fn) => fn());
}

function useRecentSwatches() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    swatchListeners.add(fn);
    return () => {
      swatchListeners.delete(fn);
    };
  }, []);
  return recentSwatches;
}

export const ColorPicker = ({
  color,
  onChange,
  title,
  contrastAgainst,
  disabled,
}: {
  color: string;
  onChange: (c: string) => void;
  title?: string;
  // When set, the popover grades this color against it (WCAG) so users can see
  // a text/background pair going illegible before they publish the embed.
  contrastAgainst?: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(color);
  const popover = useRef<HTMLDivElement>(null);
  const swatches = useRecentSwatches();

  useEffect(() => setHexDraft(color), [color]);

  const commit = (next: string) => {
    onChange(next);
    rememberSwatch(next);
  };

  // Dragging the saturation area fires onChange continuously; recording the
  // swatch on close keeps "Recent" to colors the user actually settled on.
  const close = useCallback(() => {
    setIsOpen(false);
    const parsed = normalizeHex(color);
    if (parsed) rememberSwatch(parsed);
  }, [color]);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popover.current && !popover.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={title}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        className={`size-7 rounded-md shadow-sm cursor-pointer border border-black/10 transition-transform hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:animate-none${disabled ? " opacity-40 cursor-not-allowed" : ""}`}
        style={{ backgroundColor: color }}
        title={title}
      />
      {isOpen && (
        <div
          ref={popover}
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 p-2 bg-surface rounded-xl shadow-card-hover border border-line animate-in fade-in zoom-in duration-200 motion-reduce:transition-none motion-reduce:animate-none"
        >
          <div className="custom-picker">
            <HexColorPicker color={color} onChange={onChange} />
          </div>

          <div className="mt-2 px-1 flex items-center gap-1.5">
            <div className="size-4 rounded-sm border border-black/5 shrink-0" style={{ backgroundColor: color }} />
            <input
              aria-label={`${title ?? "Color"} hex value`}
              value={hexDraft}
              onChange={(e) => {
                setHexDraft(e.target.value);
                const parsed = normalizeHex(e.target.value);
                if (parsed) onChange(parsed);
              }}
              onBlur={() => {
                const parsed = normalizeHex(hexDraft);
                if (parsed) commit(parsed);
                else setHexDraft(color);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-[86px] bg-canvas border border-line rounded-md px-1.5 py-1 text-[10px] font-mono font-bold text-ink uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {EYEDROPPER_SUPPORTED && (
              <button
                type="button"
                aria-label="Pick color from screen"
                title="Pick color from screen"
                onClick={async () => {
                  const picked = await pickScreenColor();
                  if (picked) commit(picked);
                }}
                className="shrink-0 size-7 grid place-items-center rounded-md bg-canvas border border-line text-body hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Pipette size={13} />
              </button>
            )}
          </div>

          {contrastAgainst && (() => {
            const ratio = contrastRatio(color, contrastAgainst);
            const grade = contrastGrade(ratio);
            const bad = grade === "Fail";
            return (
              <p
                role={bad ? "alert" : undefined}
                className={`mt-2 mx-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${bad ? "bg-red/10 text-red" : "bg-canvas text-muted"}`}
              >
                Contrast {ratio.toFixed(2)}:1 · {grade}
              </p>
            );
          })()}

          {swatches.length > 0 && (
            <div className="mt-2 px-1 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Recent</span>
              <div className="flex flex-wrap gap-1">
                {swatches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-label={`Use ${s}`}
                    title={s}
                    onClick={() => commit(s)}
                    className="size-5 rounded border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
                    style={{ backgroundColor: s }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* Publishing lives where the embeds are built: an embed only renders once the
   profile has a slug AND public_enabled, so every gated surface in the Studio
   offers this form instead of sending the user off to Settings. */

export function PublishForm({ onPublished }: { onPublished?: () => void }) {
  const { user, refresh } = useSession();
  const published = !!user?.public_enabled && !!user?.profile_slug;
  const [slug, setSlug] = useState(user?.profile_slug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  useEffect(() => setSlug(user?.profile_slug ?? ""), [user?.profile_slug]);

  const submit = async () => {
    posthog.capture('studio_publish_profile');
    setSaving(true);
    setError(null);
    try {
      await axios.put("/api/user/profile", {
        profile_slug: slug.trim() || null,
        public_enabled: true,
      });
      await refresh();
      onPublished?.();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save. The slug may already be taken.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (slug.trim() && !saving) submit();
      }}
    >
      <label htmlFor={inputId} className="text-[10px] font-bold text-muted uppercase tracking-wider">
        Public handle
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase())}
          placeholder="your-handle"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
          className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-canvas border border-line text-[13px] font-mono text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <Button type="submit" disabled={saving || !slug.trim()} className="h-9 shrink-0">
          {saving ? "Saving…" : published ? "Update" : "Publish"}
        </Button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[11px] font-bold text-red">
          {error}
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="text-[11px] leading-snug text-muted">
          Lowercase letters, numbers and dashes. Publishing makes your embeds public — your raw
          Figma files stay private.
        </p>
      )}
    </form>
  );
}

/** Dock-level publish control: a primary action while unpublished, collapsing to
   a quiet live-handle chip (which reopens the form) once the profile is public. */
export function PublishControl() {
  const { user } = useSession();
  const slug = user?.profile_slug ?? "";
  const published = !!user?.public_enabled && !!slug;

  return (
    <Popover
      align="left"
      panelClassName="w-[320px] max-w-[calc(100vw-2rem)] p-4"
      trigger={({ isOpen, toggle }) =>
        published ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title="Edit public handle"
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[12px] font-bold text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="size-1.5 rounded-full bg-green shrink-0" aria-hidden="true" />
            <span className="font-mono truncate max-w-[140px]">/{slug}</span>
          </button>
        ) : (
          <Button onClick={toggle} aria-expanded={isOpen} aria-haspopup="true">
            <Globe size={16} strokeWidth={2.5} />
            Publish
          </Button>
        )
      }
    >
      {({ close }) => <PublishForm onPublished={close} />}
    </Popover>
  );
}

export const SnippetRow = ({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) => (
  <div className="flex flex-col gap-1 w-full">
    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</span>
    <div className="flex items-stretch gap-2 w-full">
      <code className="flex-1 min-w-0 truncate bg-canvas border border-line rounded-lg px-3 py-2 text-[11px] text-body font-mono">{value}</code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg bg-canvas border border-line text-[12px] font-bold text-body hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  </div>
);
