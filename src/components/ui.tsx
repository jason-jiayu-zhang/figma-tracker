import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Fimanu design-system primitives. One source of truth for the
   recurring patterns: cards, section headers, icon chips, inline
   stats, buttons, segmented controls, and KPI tiles.
   Colors come from the semantic tokens in index.css (ink / body /
   muted / line / surface / canvas / accent) plus the Figma brand
   palette used for category accents.
   ──────────────────────────────────────────────────────────── */

export type ChipColor = "blue" | "purple" | "green" | "orange" | "red" | "accent";

/* Categorical file palette: vivid, on-brand hues spread around the color wheel
   (the 5 Figma brand colors plus 7 complements) so distinct files read as
   distinct. All are saturated enough to carry the white row text. */
const FILE_COLORS = [
  "#0acf83", // green (brand)
  "#06b6a4", // teal
  "#1abcfe", // blue (brand)
  "#6366f1", // indigo
  "#a259ff", // purple (brand)
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red (brand)
  "#f24e1e", // orange (brand)
  "#ea8c00", // amber
  "#7ca60c", // chartreuse
];

/** Deterministic color keyed by file identity, so a file keeps the same color
   everywhere and doesn't change when a list re-sorts. Uses a djb2 hash, which
   scatters keys evenly across the palette so distinct files rarely collide. */
export function colorForKey(key: string): string {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return FILE_COLORS[Math.abs(hash) % FILE_COLORS.length];
}

const CHIP: Record<ChipColor, { bg: string; fg: string }> = {
  blue: { bg: "rgba(26,188,254,0.10)", fg: "#1abcfe" },
  purple: { bg: "rgba(162,89,255,0.10)", fg: "#a259ff" },
  green: { bg: "rgba(10,207,131,0.10)", fg: "#0acf83" },
  orange: { bg: "rgba(242,78,30,0.10)", fg: "#f24e1e" },
  red: { bg: "rgba(239,68,68,0.10)", fg: "#ef4444" },
  accent: { bg: "rgba(242,59,39,0.10)", fg: "#f23b27" },
};

/** Tinted, brand-colored square that holds a section/stat icon.
   With `plain`, drops the tinted box and renders a bare near-black line icon. */
export function IconChip({
  color = "blue",
  plain = false,
  className = "",
  children,
}: {
  color?: ChipColor;
  plain?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (plain) {
    return (
      <div className={`size-10 shrink-0 flex items-center justify-center text-ink ${className}`}>
        {children}
      </div>
    );
  }
  const c = CHIP[color];
  return (
    <div
      className={`size-10 shrink-0 flex items-center justify-center rounded-xl ${className}`}
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {children}
    </div>
  );
}

/**
 * Skeleton placeholder block. Size/shape via className (e.g. `h-4 w-32`).
 * Decorative: wrap a group in <SkeletonRegion> to announce loading once.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-hairline rounded-md animate-pulse motion-reduce:animate-none ${className}`}
    />
  );
}

/** Wraps skeleton blocks with a single polite screen-reader announcement. */
export function SkeletonRegion({
  label = "Loading",
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** White elevated card. */
export function Card({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-surface rounded-card border border-line shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Standard section header: brand icon chip + title + subtitle + optional action. */
export function SectionHeader({
  color = "blue",
  plain = false,
  icon,
  title,
  subtitle,
  action,
  className = "",
}: {
  color?: ChipColor;
  plain?: boolean;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 w-full ${className}`}>
      <div className="flex gap-3 items-center min-w-0">
        <IconChip color={color} plain={plain}>{icon}</IconChip>
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="display text-[20px] leading-tight text-ink truncate">
            {title}
          </h2>
          {subtitle != null &&
            (typeof subtitle === "string" ? (
              <p className="text-[12px] text-muted tracking-[-0.12px] leading-none">{subtitle}</p>
            ) : (
              subtitle
            ))}
        </div>
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent hover:bg-accent-hover active:bg-accent-active text-white shadow-sm",
  secondary: "bg-surface border border-accent text-accent hover:bg-canvas shadow-sm",
  ghost: "text-body hover:bg-hairline",
  dark: "bg-ink hover:bg-black text-white shadow-sm",
  danger: "bg-red hover:bg-red/90 text-white shadow-sm",
};

// "pill" matches the app chrome (nav pills, quick-add, account icons): 32px tall,
// fully rounded. "md" is the default rounded-rectangle used inside page content.
const BUTTON_SIZES = {
  md: "h-10 px-4 rounded-lg gap-2",
  pill: "h-8 px-3 sm:px-3.5 rounded-full gap-1.5 text-[13px]",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZES } & React.ComponentPropsWithRef<"button">) {
  return (
    <button
      className={`inline-flex items-center justify-center font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface SegOption<T> {
  label: React.ReactNode;
  value: T;
}

/** Pill segmented control (My/All, time ranges, Link/iframe, …). */
export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
  ariaLabel = "View options",
  fill = false,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
  /** Stretch to the container with equal-width segments (for side panels). */
  fill?: boolean;
}) {
  const cell =
    size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-[13px]";
  return (
    <div role="group" aria-label={ariaLabel} className={`bg-canvas flex items-center gap-1 p-1 rounded-xl border border-line ${fill ? "w-full" : "shrink-0"} ${className}`}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex items-center justify-center rounded-lg ${fill ? "flex-1" : ""} transition-[color,background-color,box-shadow] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cell} ${
            value === opt.value
              ? "bg-surface text-ink ring-1 ring-accent/30 shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** The app shell column. Every page — full-bleed canvas or list — aligns its
   chrome to this exact box so the top nav and sub-nav never shift between
   routes. Paired with SHELL_TOP_PAD, which clears the fixed nav.
   Never combine with another width utility: `w-full` is emitted after
   `w-[1080px]` in the utilities layer, so it silently wins and the column
   stretches to the viewport. */
export const SHELL = "w-[1080px] max-w-[calc(100%-3rem)] mx-auto";
export const SHELL_TOP_PAD = "pt-[88px]";

/** Vertical hairline separating groups of controls inside a toolbar or header. */
export function Divider() {
  return <div className="w-px self-stretch bg-line shrink-0" aria-hidden="true" />;
}

const POPOVER_ALIGN = {
  left: "left-0",
  center: "left-1/2 -translate-x-1/2",
  right: "right-0",
} as const;

/** Disclosure panel anchored above (or below) its trigger; closes on outside click and
   Escape. The trigger is a render prop so callers keep their own button markup
   (and its aria-expanded/aria-haspopup wiring). */
export function Popover({
  trigger,
  align = "right",
  placement = "above",
  panelClassName = "",
  className = "",
  children,
}: {
  trigger: (state: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  align?: keyof typeof POPOVER_ALIGN;
  /** Which side of the trigger the panel opens on. */
  placement?: "above" | "below";
  panelClassName?: string;
  className?: string;
  children: React.ReactNode | ((state: { close: () => void }) => React.ReactNode);
}) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Horizontal nudge that keeps the panel inside the viewport. The trigger can sit
  // mid-row on a phone, so a 320–360px panel anchored to it would hang off-screen.
  const [shiftX, setShiftX] = useState(0);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setShiftX(0);
      return;
    }
    const el = panel.current;
    if (!el) return;
    const { left, right } = el.getBoundingClientRect();
    const edge = 8;
    const vw = document.documentElement.clientWidth;
    setShiftX(left < edge ? edge - left : right > vw - edge ? vw - edge - right : 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div className={`relative shrink-0 ${className}`} ref={root}>
      {trigger({ isOpen, toggle })}
      {isOpen && (
        <div
          ref={panel}
          style={shiftX ? { translate: `${shiftX}px 0` } : undefined}
          className={`absolute ${placement === "below" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"} ${POPOVER_ALIGN[align]} z-50 bg-surface rounded-2xl shadow-card-hover border border-line animate-in fade-in zoom-in duration-200 motion-reduce:animate-none ${panelClassName}`}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}


/**
 * Shared empty state: icon, short title, one line of guidance, optional action.
 * `bordered` (default) frames it as a quiet dashed placeholder so it reads as
 * "content goes here" rather than a stray block of text; `compact` is for
 * small widget tiles.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  bordered = true,
  compact = false,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center ${
        compact ? "gap-3 p-4" : "gap-4 px-6 py-12"
      } ${bordered ? "rounded-2xl border border-dashed border-line bg-surface/50" : ""} ${className}`}
    >
      <div className="size-11 rounded-full bg-hairline text-muted flex items-center justify-center">{icon}</div>
      <div className="flex flex-col gap-1 max-w-[320px]">
        <h3 className={`display text-ink ${compact ? "text-[15px]" : "text-[18px]"}`}>{title}</h3>
        {description && (
          <p className={`text-body leading-relaxed text-balance ${compact ? "text-[13px]" : "text-[14px]"}`}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * Shared dialog shell. Blurred scrim, rounded surface card, title/description header, close button, Esc + scrim-click to dismiss,
 * scale+fade entrance, focus restored to the trigger on close.
 * Children render the body; put actions in `footer`.
 * Set `dismissible={false}` while a request is in flight.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
  dismissible?: boolean;
  children?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const titleId = React.useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      setShown(false);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [open, dismissible]);

  if (!open) return null;

  const width = size === "sm" ? "max-w-lg" : size === "lg" ? "max-w-2xl" : "max-w-xl";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ease-out ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative z-10 flex w-full ${width} max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-card transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${shown ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-hairline hover:text-ink"
          >
            <X size={18} />
          </button>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h2 id={titleId} className="display text-[20px] leading-tight text-ink pr-8">{title}</h2>
            {description && <div className="text-[14px] leading-relaxed text-body">{description}</div>}
          </div>
        </div>
        {children}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirm / cancel dialog. Cancel is focused first so Enter is never destructive by accident. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "neutral",
  busy = false,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "neutral" | "danger";
  busy?: boolean;
  error?: string | null;
  children?: React.ReactNode;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button ref={cancelRef} variant="ghost" className="border border-line" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy} aria-busy={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && <p role="alert" className="text-[12px] font-medium text-red">{error}</p>}
    </Modal>
  );
}
